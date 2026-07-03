import { Context, h } from 'koishi'
import type { Config } from '../config'
import { generateWingForward } from '../gen/gen_forward'
import { logInfo } from '../logger'
import type { WingMapManager } from '../utils'

export function registerForwardCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.forwardCommandName + ' <userId:string>')
    .alias('aqgf')
    .alias('awa_query_guangyi_forward')
    .action(async ( {session}, userId ) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼-forward <角色ID>`)
        return;
      }
      if ( session.platform !== 'onebot' ){
        await session.send(`${h.quote(session.messageId)}该命令仅支持OneBot平台`)
        return;
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}✨正在查询，请稍候...`);

      try {
        const backendUrl = config.backendUrl || 'http://bluerosion.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        logInfo(ctx, config, '', `合并转发模式正在请求光翼数据: ${apiUrl}`)

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
          logInfo(ctx, config, `❌ 合并转发模式光翼数据解析失败: ${e}`)
          await session.send(`${h.quote(session.messageId)}光翼数据解析失败`)
          return;
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          await session.send(`${h.quote(session.messageId)}光翼数据格式错误`)
          return;
        }

        logInfo(ctx, config, '', `合并转发模式已获取光翼数据: userId=${userId}, count=${wingData.wing_buffs.length}`)

        const forwardMessage = generateWingForward(
          userId,
          wingData.wing_buffs,
          wingMapManager.getWingMap(),
          wingMapManager,
          (preview) => logInfo(ctx, config, '', `messageBlock 预览: ${preview}`),
        )

        await session.send(h.unescape(forwardMessage));
        return;
      } catch (error) {
        logInfo(ctx, config, `❌ 合并转发模式查询光翼失败: ${error}`)

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
