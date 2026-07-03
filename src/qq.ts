import { h, type Context } from 'koishi'
import type { Config } from './config'
import { logInfo } from './logger'

export const DEFAULT_KEYBOARD_ROWS = {
  rows: [
    {
      buttons: [
        { render_data: { label: '🎨 canvas出图', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${canvasCommandName} ${skyPlayerId}', enter: true } },
        { render_data: { label: '🖼️ pptr出图', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${pptrCommandName} ${skyPlayerId}', enter: true } },
      ],
    },
    {
      buttons: [
        { render_data: { label: '🎮 玩玩别的', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '帮助菜单', enter: true } },
        { render_data: { label: '📚 获取id教程', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '${tutorialCommandName}', enter: true } },
      ],
    },
  ],
}

export function buildQueryMarkdown(apiElapsed: number, skyPlayerId: string, queryTime: Date): string {
  const timeStr = queryTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  return [
    '# 光翼查询结果 ✨',
    '',
    `> 光遇角色ID: ${skyPlayerId}`,
    `> 查询时间: ${timeStr}`,
    `> API响应耗时: ${apiElapsed}ms`,
  ].join('\n')
}

export function buildQueryKeyboard(
  cmds: { canvasCommandName: string; pptrCommandName: string; tutorialCommandName: string },
  skyPlayerId: string,
  customJson?: string,
): object {
  let raw: string
  if (customJson) {
    raw = customJson
  } else {
    raw = JSON.stringify(DEFAULT_KEYBOARD_ROWS)
  }
  try {
    raw = raw.replace(/\$\{canvasCommandName\}/g, cmds.canvasCommandName)
    raw = raw.replace(/\$\{pptrCommandName\}/g, cmds.pptrCommandName)
    raw = raw.replace(/\$\{tutorialCommandName\}/g, cmds.tutorialCommandName)
    raw = raw.replace(/\$\{skyPlayerId\}/g, skyPlayerId)
    const parsed = JSON.parse(raw)
    if (parsed?.rows?.length) return parsed
  } catch {}
  return DEFAULT_KEYBOARD_ROWS
}

export async function sendQQMarkdown(
  ctx: Context,
  config: Config,
  session: any,
  markdown: string,
  keyboard: object,
  _msgSeq?: number,
): Promise<void> {
  try {
    const isCrack = !!(session.bot as any)?.config?.autoStreamText

    if (isCrack) {
      const payload: Record<string, unknown> = {
        markdown: { content: markdown },
      }
      if ((keyboard as any)?.rows?.length) {
        payload.keyboard = { content: keyboard }
      }
      await session.send(h('qq:rawmarkdown', payload))
    } else {
      const payload: Record<string, unknown> = {
        msg_type: 2,
        markdown: { content: markdown },
      }
      if ((keyboard as any)?.rows?.length) {
        payload.keyboard = { content: keyboard }
      }

      const s = session
      if (s.messageId && s.timestamp && Date.now() - s.timestamp < 5 * 60 * 1000 - 2000) {
        s.seq ||= 0
        payload.msg_id = s.messageId
        payload.msg_seq = ++s.seq
      }

      await session.bot.internal.sendMessage(session.channelId, payload)
    }
  } catch (error) {
    logInfo(ctx, config, `⚠️ QQ Markdown 发送失败，不影响图片主流程：${error instanceof Error ? error.message : String(error)}`)
  }
}

export function stringifyCompact(obj: any): string {
  const rows = obj.rows
  let result = '{\n'
  result += '  "rows": [\n'
  for (let ri = 0; ri < rows.length; ri++) {
    const buttons = rows[ri].buttons.map((b: any) => '        ' + JSON.stringify(b))
    result += '    {\n'
    result += '      "buttons": [\n'
    result += buttons.join(',\n')
    result += '\n      ]\n'
    result += '    }' + (ri < rows.length - 1 ? ',' : '') + '\n'
  }
  result += '  ]\n'
  result += '}'
  return result
}
