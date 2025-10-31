import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { renderWingImage } from './render_image'
import path from 'path'
import fs from 'fs'
import { WingMapManager } from './wing_map_manager'
import { findPackageJSON } from 'module'

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
    wyWingMapUrl: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .description('光翼 ID 映射json地址')
      .default('https://s.166.net/config/ds_yy_02/ma75_wing_wings.json'),
  }).description('后端设置'),
  
  Schema.object({
    backgroundImagePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/sky_bg.png'))
      .description(`背景图片路径.`),
    tutorialImagePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/tutorial_new_20251026.png'))
      .description(`查询光翼使用方法教程图片路径.`),
    skyAppXmlFilePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/0.14.8.xml'))
      .description(`Sky App导出的 XML 文件路径.`),
  }).description('路径设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('是否启用详细的控制台日志输出。启用后，插件将在控制台输出更多调试和运行时信息，有助于问题排查。'),
  }).description('debug settings')

])

interface WingBuff {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion: number
  deposit_id: string
}

export function apply(ctx: Context, config: any) {
  const wingMapManager = new WingMapManager(ctx, config.wyWingMapUrl, config.skyAppXmlFilePath);

  ctx.on('ready', async () => {
    await wingMapManager.initialize();
  });

  ctx.command('刷新光翼')
    .alias('awa_refresh_guangyi')
    .action(async () => {
      return await wingMapManager.refreshWingMap();
    });

  ctx.command('查询光翼 <userId:string>')
    .alias('aqg')
    .alias('awa_query_guangyi')
    .action(async ({ session }, userId) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼 <角色ID>`)
        return;
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}正在查询，请稍候...`);

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
        const screenshot = await renderWingImage(ctx, userId, wingData.wing_buffs, wingMapManager.getWingMap(), config.backgroundImagePath, wingMapManager)

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
      } finally {
        await session.bot.deleteMessage(session.channelId, waitTipMsgIdArr[0]);
      }
    })

  ctx.command('获取id方法')
    .alias('atw')
    .alias('awa_tutorial_wing')
    .action(async ({ session }) => {
      try {
        const tutorialImagePath = config.tutorialImagePath || path.resolve(__dirname, '../assets/tutorial.jpg')
        
        if (!fs.existsSync(tutorialImagePath)) {
          return '教程图片不存在，请检查配置路径'
        }

        // 读取教程图片并转换为 base64
        const tutorialBuffer = fs.readFileSync(tutorialImagePath)
        const tutorialBase64 = tutorialBuffer.toString('base64')
        
        // 发送教程图片
        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/jpeg;base64,${tutorialBase64}`)}`)
        return
      } catch (error) {
        ctx.logger.error(`Error sending tutorial image: ${error}`)
        return `发送教程图片失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
