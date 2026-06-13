import { Context, h } from 'koishi'
import { renderWingCanvas } from '../gen/gen_image_canvas'
import type { Config } from '../config'
import path from 'path'
import type { WingMapManager } from '../utils'

export function registerCanvasCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.canvasCommandName + ' <userId:string>')
    .alias('aqgc')
    .alias('awa_query_guangyi_canvas')
    .action(async ({ session }, userId) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼-canvas <角色ID>`)
        return
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}🎨 正在查询 (Canvas 渲染器)，请稍候...`)

      try {
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`[Canvas] Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return
        }

        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return
        }

        let wingData
        try {
          wingData = JSON.parse(responseData.result)
        } catch (e) {
          ctx.logger.error(`[Canvas] Failed to parse wing data: ${e}`)
          await session.send(`${h.quote(session.messageId)}光翼数据解析失败`)
          return
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          await session.send(`${h.quote(session.messageId)}光翼数据格式错误`)
          return
        }

        ctx.logger.debug(`[Canvas] Retrieved ${wingData.wing_buffs.length} wings for role ${userId}`)

        const portalIconsPathStr = path.resolve(__dirname, '../../assets/portal')

        const buf = await renderWingCanvas(
          userId,
          wingData.wing_buffs,
          wingMapManager.getWingMap(),
          (name) => wingMapManager.getSpiritName(name),
          {
            darkMode: config.canvasDarkMode,
            width: config.canvasWidth,
            scale: config.canvasScale,
            separateByCategory: config.separateByCategory,
            showPortalIcons: config.canvasShowPortalIcons,
            portalIconsPath: portalIconsPathStr,
            fontPath: config.canvasFontPath,
            emojiFontPath: config.canvasEmojiFontPath,
            imageType: config.canvasImageType as 'png' | 'jpeg',
            quality: config.canvasQuality,
          }
        )

        await session.send(`${h.quote(session.messageId)}${h.image(buf, `image/${config.canvasImageType}`)}`)
      } catch (error) {
        ctx.logger.error(`[Canvas] Error querying wings: ${error}`)

        if (error instanceof Error && error.message.includes('404')) {
          await session.send(`${h.quote(session.messageId)}角色ID ${userId} 未找到，请检查ID是否正确`)
          return
        }

        await session.send(`${h.quote(session.messageId)}查询失败: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        await session.bot.deleteMessage(session.channelId, waitTipMsgIdArr[0])
      }
    })
}
