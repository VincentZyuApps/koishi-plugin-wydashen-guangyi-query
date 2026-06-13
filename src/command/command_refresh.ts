import { Context } from 'koishi'
import type { WingMapManager } from '../utils'

export function registerRefreshCommand(ctx: Context, wingMapManager: WingMapManager) {
  ctx.command('刷新光翼')
    .alias('awa_refresh_guangyi')
    .action(async () => {
      return await wingMapManager.refreshWingMap();
    })
}
