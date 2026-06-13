import { Context } from 'koishi'
import type { Config } from '../config'
import type { WingMapManager } from '../utils'

export function registerRefreshCommand(ctx: Context, config: Config, wingMapManager: WingMapManager) {
  ctx.command(config.refreshCommandName)
    .alias('awa_refresh_guangyi')
    .action(async () => {
      return await wingMapManager.refreshWingMap();
    })
}
