import { Context, h } from 'koishi'
import type { Config } from '../config'
import fs from 'fs'
import { logInfo } from '../logger'
import { getSharedAssetPathByBaseDir, SHARED_ASSET_FILES } from '../utils'

export function registerTutorialCommand(ctx: Context, config: Config) {
  ctx.command(config.tutorialCommandName)
    .alias('atw')
    .alias('awa_tutorial_wing')
    .action(async ({ session }) => {
      try {
        const tutorialImagePath = getSharedAssetPathByBaseDir(ctx.baseDir, config.assetRootPath, SHARED_ASSET_FILES.tutorialImagePath.target)

        if (!fs.existsSync(tutorialImagePath)) {
          return '教程图片不存在，请检查配置路径'
        }

        const tutorialBuffer = fs.readFileSync(tutorialImagePath)
        const tutorialBase64 = tutorialBuffer.toString('base64')

        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/jpeg;base64,${tutorialBase64}`)}`)
        return
      } catch (error) {
        logInfo(ctx, config, `❌ 发送教程图片失败: ${error}`)
        return `发送教程图片失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
