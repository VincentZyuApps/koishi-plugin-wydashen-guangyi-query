import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'

import { WingMapManager, ensureBundledFonts } from './utils'
import { registerRefreshCommand } from './command/command_refresh'
import { registerPptrCommand } from './command/command_pptr'
import { registerTextCommand } from './command/command_text'
import { registerForwardCommand } from './command/command_forward'
import { registerTutorialCommand } from './command/command_tutorial'
import { registerCanvasCommand } from './command/command_canvas'

export { usage } from './usage'

import type { Config } from './config'
export { Config } from './config'

export const name = 'wydashen-guangyi-query'

export const inject = {
  required: ['puppeteer', 'http']
}

export function apply(ctx: Context, config: Config) {
  const wingMapManager = new WingMapManager(ctx, config.wyWingMapUrl, config.skyAppXmlFilePath, config.verboseConsoleLog)

  ctx.on('ready', async () => {
    try {
      await ensureBundledFonts(ctx)
    } catch (error) {
      ctx.logger.warn(`[${name}] 自动下载字体失败，将继续使用当前配置。错误: ${error}`)
    }
    await wingMapManager.initialize()
  })

  if (config.enableRefreshCommand) {
    registerRefreshCommand(ctx, config, wingMapManager)
  }

  if (config.enableImagePptrCommand) {
    registerPptrCommand(ctx, config, wingMapManager)
  }

  if (config.enableTextCommand) {
    registerTextCommand(ctx, config, wingMapManager)
  }

  if (config.enableForwardCommand) {
    registerForwardCommand(ctx, config, wingMapManager)
  }

  if (config.enableCanvasCommand) {
    registerCanvasCommand(ctx, config, wingMapManager)
  }

  if (config.enableTutorialCommand) {
    registerTutorialCommand(ctx, config)
  }
}
