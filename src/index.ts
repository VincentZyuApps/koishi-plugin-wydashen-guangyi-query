import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { renderWingImage } from './render_image'
import path from 'path'

export const name = 'wydashen-guangyi-query'

export const inject = {
  required: ['puppeteer', 'http']
}

export const Config = Schema.intersect([
  Schema.object({
    backendUrl: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .description('后端地址')
      .default('http://sh-aliyun2.vincentzyu233.cn:51024'),
    backgroundImagePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/sky_bg.png'))
      .description(`背景图片路径.`),
  }).description('后端设置')
])

interface WingBuff {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion: number
  deposit_id: string
}

export function apply(ctx: Context, config: any) {
  ctx.command('查询光翼 <userId:string>')
    .alias('aqg')
    .alias('awa_query_guangyi')
    .action(async ({ session }, userId) => {
      if (!userId) {
        return '请提供用户ID，用法: 查询光翼 <角色ID>'
      }

      try {
        // 调用后端 API 查询光翼数据
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          return `查询失败: ${response.result || '未知错误'}`
        }

        // 解析响应
        const responseData = response.data
        if (!responseData || !responseData.result) {
          return '获取数据格式错误'
        }

        // result 字段是 JSON 字符串，需要解析
        let wingData
        try {
          wingData = JSON.parse(responseData.result)
        } catch (e) {
          ctx.logger.error(`Failed to parse wing data: ${e}`)
          return '光翼数据解析失败'
        }

        if (!wingData.wing_buffs || !Array.isArray(wingData.wing_buffs)) {
          return '光翼数据格式错误'
        }

        ctx.logger.debug(`Retrieved ${wingData.wing_buffs.length} wings for role ${userId}`)

        // 渲染图片
        const screenshot = await renderWingImage(ctx, userId, wingData.wing_buffs, config.backgroundImagePath)

        // 返回图片
        // return h.image(`data:image/jpeg;base64,${screenshot}`);
        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/jpeg;base64,${screenshot}`)}`);
        return;
      } catch (error) {
        ctx.logger.error(`Error querying wings: ${error}`)
        
        if (error instanceof Error && error.message.includes('404')) {
          return `角色ID ${userId} 未找到，请检查ID是否正确`
        }
        
        return `查询失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
