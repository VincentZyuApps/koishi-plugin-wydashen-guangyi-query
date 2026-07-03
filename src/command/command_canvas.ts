import { Context, h } from 'koishi'
import { renderWingCanvas } from '../gen/gen_image_canvas'
import type { Config } from '../config'
import { logInfo } from '../logger'
import { getSharedPortalDirByBaseDir, isFontConfigError, resolveRuntimeFontPath, type WingMapManager } from '../utils'
import { buildQueryMarkdown, buildQueryKeyboard, sendQQMarkdown } from '../qq_markdown'

export function registerCanvasCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.canvasCommandName + ' <userId:string>')
    .alias('aqgc')
    .alias('awa_query_guangyi_canvas')
    .action(async ({ session }, userId) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼-canvas <角色ID>`)
        return
      }

      const startTime = Date.now()
      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}🎨 正在查询并渲染Canvas图片，请稍候...`)

      try {
        const backendUrl = config.backendUrl || 'http://bluerosion.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        logInfo(ctx, config, '', `Canvas 正在请求光翼数据: ${apiUrl}`)

        const apiStartTime = Date.now()
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
          logInfo(ctx, config, `❌ Canvas 光翼数据解析失败: ${e}`)
          await session.send(`${h.quote(session.messageId)}光翼数据解析失败`)
          return
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          await session.send(`${h.quote(session.messageId)}光翼数据格式错误`)
          return
        }

        logInfo(ctx, config, '', `Canvas 已获取光翼数据: userId=${userId}, count=${wingData.wing_buffs.length}`)

        const apiElapsed = Date.now() - apiStartTime
        const queryTime = new Date()

        if (config.verboseConsoleLog) {
          const unknownSpirits = wingData.wing_buffs
            .filter((w: any) => w.name.startsWith('s_'))
            .filter((w: any) => !wingMapManager.getSpiritName(w.name))
          if (unknownSpirits.length > 0) {
            logInfo(ctx, config, '', `🔍❓ Canvas userId ${userId} 有 ${unknownSpirits.length} 个未知先祖光翼`)
            unknownSpirits.forEach((w: any, idx: number) => logInfo(ctx, config, '', `📍 第 ${idx + 1} 个光翼 (idx:${idx}): ${w.name} | collected: ${w.collected} | deposited: ${w.deposited}`))
          }
        }

        const portalIconsPathStr = getSharedPortalDirByBaseDir(ctx.baseDir, config.assetRootPath)

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
            fontPath: config.canvasUseCustomFont ? resolveRuntimeFontPath(ctx, config.canvasFontPath, 'Canvas') : '',
            emojiFontPath: config.canvasEmojiFontPath,
            imageType: config.canvasImageType as 'png' | 'jpeg',
            quality: config.canvasQuality,
            onInfo: (message) => logInfo(ctx, config, message),
          }
        )

        const elapsed = Date.now() - startTime
        logInfo(ctx, config, `🎨✅ Canvas 渲染完成: ${elapsed}ms | userId=${userId}`)

        const modeText = config.canvasDarkMode ? 'dark' : 'light'
        let msg = `${h.quote(session.messageId)}${h.image(buf, `image/${config.canvasImageType}`)}`

        if (config.canvasShowRenderInfo) {
          msg += `\n(🎨 Canvas 渲染耗时：${elapsed}ms | 缩放：${config.canvasScale}x | 模式：${modeText})`
        }

        await session.send(msg)

        if (config.enableQQMarkdown && (session.platform === 'qq' || session.platform === 'qqguild')) {
          const md = buildQueryMarkdown(apiElapsed, userId, queryTime)
          const kb = buildQueryKeyboard(config, userId, config.qqMarkdownKeyboardJson)
          await sendQQMarkdown(ctx, config, session, md, kb)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (isFontConfigError(error)) {
          logInfo(ctx, config, message)
          await session.send(`${h.quote(session.messageId)}${message}`)
          return
        }

        logInfo(ctx, config, `❌ Canvas 查询光翼失败: ${message}`)

        if (message.includes('404')) {
          await session.send(`${h.quote(session.messageId)}角色ID ${userId} 未找到，请检查ID是否正确`)
          return
        }

        await session.send(`${h.quote(session.messageId)}查询失败: ${message}`)
      } finally {
        await session.bot.deleteMessage(session.channelId, waitTipMsgIdArr[0])
      }
    })
}
