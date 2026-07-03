import type { Context } from 'koishi'
import type { Config } from './config'

const LEADING_EMOJI_RE = /^[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u

function ensureEmoji(message: string, fallbackEmoji: string) {
  if (!message) return message
  return LEADING_EMOJI_RE.test(message) ? message : `${fallbackEmoji} ${message}`
}

export function logInfo(
  ctx: Context,
  config: Config,
  msg_info: string,
  msg_debug?: string,
) {
  if (msg_info) ctx.logger.info(ensureEmoji(msg_info, 'ℹ️'))
  if (msg_debug && config.verboseConsoleLog) ctx.logger.info(ensureEmoji(msg_debug, '🔍'))
}
