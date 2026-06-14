import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import type { Config } from '../config'
import { renderWingImage } from '../gen/gen_image_pptr'
import type { WingMapManager } from '../utils'
import path from 'path'

export function registerPptrCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.pptrCommandName + ' <userId:string>')
    .alias('查询光翼')
    .alias('aqg')
    .alias('awa_query_guangyi')
    .alias('aqgp')
    .alias('awa_query_guangyi_pptr')
    .action(async ({ session }, userId) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼 <角色ID>`)
        return;
      }

      const startTime = Date.now()
      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}🎨正在查询并渲染Puppeteer图片，请稍候...`);

      try {
        const backendUrl = config.backendUrl || 'http://bluerosion.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return;
        }

        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return;
        }

        let wingData
        try {
          wingData = JSON.parse(responseData.result)
        } catch (e) {
          ctx.logger.error(`Failed to parse wing data: ${e}`)
          await session.send(`${h.quote(session.messageId)}光翼数据解析失败`)
          return;
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          await session.send(`${h.quote(session.messageId)}光翼数据格式错误`)
          return;
        }

        ctx.logger.debug(`Retrieved ${wingData.wing_buffs.length} wings for role ${userId}`)

        if (config.verboseConsoleLog) {
          const unknownSpirits = wingData.wing_buffs
            .filter((w: any) => w.name.startsWith('s_'))
            .filter((w: any) => !wingMapManager.getSpiritName(w.name))
          if (unknownSpirits.length > 0) {
            ctx.logger.warn(`🔍❓ [Pptr] userId ${userId} 有 ${unknownSpirits.length} 个未知先祖光翼:`)
            unknownSpirits.forEach((w: any, idx: number) => ctx.logger.warn(`  - 第 ${idx + 1} 个光翼 (idx:${idx}): ${w.name} | collected: ${w.collected} | deposited: ${w.deposited}`))
          }
        }

        const portalIconsPathStr = path.resolve(__dirname, '../../assets/portal');

        const screenshot = await renderWingImage(
          ctx, userId, wingData.wing_buffs, wingMapManager.getWingMap(),
          config.backgroundImagePath, wingMapManager,
          config.separateByCategory, config.containerWidth, config.viewportWidth,
          config.imageType, config.screenshotQuality,
          config.puppeteerShowPortalIcons, portalIconsPathStr,
          config.puppeteerUseCustomFont ? config.puppeteerFontPath : ''
        )

        const elapsed = Date.now() - startTime
        ctx.logger.info(`🖼️✅ [Pptr] 渲染完成 ✨: ${elapsed}ms ⏱️ | userId: ${userId} 👤`)

        let msg = `${h.quote(session.messageId)}${h.image(`data:image/${config.imageType};base64,${screenshot}`)}`

        if (config.puppeteerShowRenderInfo) {
          msg += `\n(🖼️ Puppeteer 渲染耗时：${elapsed}ms | 类型：${config.imageType} | 质量：${config.screenshotQuality})`
        }

        await session.send(msg);
        return;
      } catch (error) {
        ctx.logger.error(`Error querying wings: ${error}`)

        if (error instanceof Error && error.message.includes('404')) {
          await session.send(`${h.quote(session.messageId)}角色ID ${userId} 未找到，请检查ID是否正确`);
          return;
        }

        await session.send(`${h.quote(session.messageId)}查询失败: ${error instanceof Error ? error.message : String(error)}`);
        return;
      } finally {
        await session.bot.deleteMessage(session.channelId, waitTipMsgIdArr[0]);
      }
    })
}
