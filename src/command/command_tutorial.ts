import { Context, h } from 'koishi'
import type { Config } from '../config'
import fs from 'fs'
import path from 'path'

export function registerTutorialCommand(ctx: Context, config: Config) {
  ctx.command('获取id方法')
    .alias('atw')
    .alias('awa_tutorial_wing')
    .action(async ({ session }) => {
      try {
        const tutorialImagePath = config.tutorialImagePath || path.resolve(__dirname, '../../assets/tutorial.jpg')

        if (!fs.existsSync(tutorialImagePath)) {
          return '教程图片不存在，请检查配置路径'
        }

        const tutorialBuffer = fs.readFileSync(tutorialImagePath)
        const tutorialBase64 = tutorialBuffer.toString('base64')

        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/jpeg;base64,${tutorialBase64}`)}`)
        return
      } catch (error) {
        ctx.logger.error(`Error sending tutorial image: ${error}`)
        return `发送教程图片失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
