import { Context, h } from 'koishi'
import type { Config } from '../config'
import { generateWingText } from '../gen/gen_text'
import type { WingMapManager } from '../utils'

export function registerTextCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command('查询光翼-text <userId:string>')
    .alias('aqgt')
    .alias('awa_query_guangyi_text')
    .action ( async ( {session}, userId ) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼-text <角色ID>`)
        return;
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}✨正在查询，请稍候...`);

      try {
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
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

        const textResult = generateWingText(userId, wingData.wing_buffs, wingMapManager.getWingMap(), wingMapManager)

        await session.send(`${h.quote(session.messageId)}${textResult.slice(0,1000)}`);
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
