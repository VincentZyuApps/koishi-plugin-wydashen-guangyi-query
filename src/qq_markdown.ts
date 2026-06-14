import { h } from 'koishi'

export function buildQueryMarkdown(apiElapsed: number, userId: string, queryTime: Date): string {
  const timeStr = queryTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  return [
    '# 光翼查询结果 ✨',
    '',
    `> 国服用户游戏ID: ${userId}`,
    `> 查询时间: ${timeStr}`,
    `> API响应耗时: ${apiElapsed}ms`,
  ].join('\n')
}

export function buildQueryKeyboard(
  cmds: { canvasCommandName: string; pptrCommandName: string; tutorialCommandName: string },
  userId: string,
  customJson?: string,
): object {
  if (customJson) {
    try {
      let raw = customJson
      raw = raw.replace(/\$\{canvasCommandName\}/g, cmds.canvasCommandName)
      raw = raw.replace(/\$\{pptrCommandName\}/g, cmds.pptrCommandName)
      raw = raw.replace(/\$\{tutorialCommandName\}/g, cmds.tutorialCommandName)
      raw = raw.replace(/\$\{userId\}/g, userId)
      const parsed = JSON.parse(raw)
      if (parsed?.rows?.length) return parsed
    } catch {}
  }
  return {
    rows: [
      {
        buttons: [
          { render_data: { label: '🎨 canvas出图', style: 1 }, action: { type: 2, permission: { type: 2 }, data: `${cmds.canvasCommandName} ${userId}`, enter: true } },
          { render_data: { label: '🖼️ pptr出图', style: 1 }, action: { type: 2, permission: { type: 2 }, data: `${cmds.pptrCommandName} ${userId}`, enter: true } },
        ],
      },
      {
        buttons: [
          { render_data: { label: '🎮 玩玩别的', style: 1 }, action: { type: 2, permission: { type: 2 }, data: '帮助菜单', enter: true } },
          { render_data: { label: '📚 获取id教程', style: 1 }, action: { type: 2, permission: { type: 2 }, data: cmds.tutorialCommandName, enter: true } },
        ],
      },
    ],
  }
}

export async function sendQQMarkdown(
  session: any,
  markdown: string,
  keyboard: object,
  _msgSeq: number,
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
  } catch (e) {
    console.warn('⚠️💬 [QQ Markdown] 发送失败, 不影响图片:', e?.message || e)
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
