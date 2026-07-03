import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import type { Config } from '../config'
import { logInfo } from '../logger'
import { renderWingImage } from '../gen/gen_image_pptr'
import {
  getSharedAssetPathByBaseDir,
  getSharedPortalDirByBaseDir,
  isFontConfigError,
  resolveRuntimeFontPath,
  SHARED_ASSET_FILES,
  type WingMapManager,
} from '../utils'
import { buildQueryMarkdown, buildQueryKeyboard, sendQQMarkdown } from '../qq'

export function registerPptrCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.pptrCommandName + ' <skyPlayerId:string>')
    .alias('查询光翼')
    .alias('aqg')
    .alias('awa_query_guangyi')
    .alias('aqgp')
    .alias('awa_query_guangyi_pptr')
    .action(async ({ session }, skyPlayerId) => {
      if (!skyPlayerId) {
        await session.send(`${h.quote(session.messageId)}请提供光遇角色ID，用法: 查询光翼 <角色ID>`)
        return;
      }

      const startTime = Date.now()
      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}🎨正在查询并渲染Puppeteer图片，请稍候...`);

      try {
        const backendUrl = config.backendUrl || 'http://bluerosion.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${skyPlayerId}`

        logInfo(ctx, config, '', `Puppeteer 正在请求光翼数据: ${apiUrl}`)

        const apiStartTime = Date.now()
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
          logInfo(ctx, config, `❌ Puppeteer 光翼数据解析失败: ${e}`)
          await session.send(`${h.quote(session.messageId)}光翼数据解析失败`)
          return;
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          await session.send(`${h.quote(session.messageId)}光翼数据格式错误`)
          return;
        }

        logInfo(ctx, config, '', `Puppeteer 已获取光翼数据: skyPlayerId=${skyPlayerId}, count=${wingData.wing_buffs.length}`)

        const apiElapsed = Date.now() - apiStartTime
        const queryTime = new Date()

        if (config.verboseConsoleLog) {
          const unknownSpirits = wingData.wing_buffs
            .filter((w: any) => w.name.startsWith('s_'))
            .filter((w: any) => !wingMapManager.getSpiritName(w.name))
          if (unknownSpirits.length > 0) {
            logInfo(ctx, config, '', `🔍❓ Puppeteer skyPlayerId ${skyPlayerId} 有 ${unknownSpirits.length} 个未知先祖光翼`)
            unknownSpirits.forEach((w: any, idx: number) => logInfo(ctx, config, '', `📍 第 ${idx + 1} 个光翼 (idx:${idx}): ${w.name} | collected: ${w.collected} | deposited: ${w.deposited}`))
          }
        }

        const backgroundImagePath = getSharedAssetPathByBaseDir(ctx.baseDir, config.assetRootPath, SHARED_ASSET_FILES.backgroundImagePath.target)
        const portalIconsPathStr = getSharedPortalDirByBaseDir(ctx.baseDir, config.assetRootPath)

        const screenshot = await renderWingImage(
          ctx, skyPlayerId, wingData.wing_buffs, wingMapManager.getWingMap(),
          backgroundImagePath, wingMapManager,
          config.separateByCategory, config.containerWidth, config.viewportWidth,
          config.imageType, config.screenshotQuality,
          config.puppeteerShowPortalIcons, portalIconsPathStr,
          config.puppeteerUseCustomFont ? resolveRuntimeFontPath(ctx, config.puppeteerFontPath, 'Puppeteer') : '',
          (message) => logInfo(ctx, config, message),
        )

        const elapsed = Date.now() - startTime
        logInfo(ctx, config, `🖼️✅ Puppeteer 渲染完成: ${elapsed}ms | skyPlayerId=${skyPlayerId}`)

        let msg = `${h.quote(session.messageId)}${h.image(`data:image/${config.imageType};base64,${screenshot}`)}`

        if (config.puppeteerShowRenderInfo) {
          msg += `\n(🖼️ Puppeteer 渲染耗时：${elapsed}ms | 类型：${config.imageType} | 质量：${config.screenshotQuality})`
        }

        await session.send(msg);

        if (config.enableQQMarkdown && (session.platform === 'qq' || session.platform === 'qqguild')) {
          const md = buildQueryMarkdown(apiElapsed, skyPlayerId, queryTime)
          const kb = buildQueryKeyboard(config, skyPlayerId, config.qqMarkdownKeyboardJson)
          await sendQQMarkdown(ctx, config, session, md, kb)
        }

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (isFontConfigError(error)) {
          logInfo(ctx, config, message)
          await session.send(`${h.quote(session.messageId)}${message}`)
          return
        }

        logInfo(ctx, config, `❌ Puppeteer 查询光翼失败: ${message}`)

        if (message.includes('404')) {
          await session.send(`${h.quote(session.messageId)}角色ID ${skyPlayerId} 未找到，请检查ID是否正确`);
          return;
        }

        await session.send(`${h.quote(session.messageId)}查询失败: ${message}`);
        return;
      } finally {
        await session.bot.deleteMessage(session.channelId, waitTipMsgIdArr[0]);
      }
    })
}
