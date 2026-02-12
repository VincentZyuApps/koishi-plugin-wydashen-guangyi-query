import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { renderWingImage } from './render_image'
import { generateWingText } from './gen_text'
import { generateWingForward } from './gen_forward'
import { renderWithGo, binaryExists } from './render_go'
import path from 'path'
import fs from 'fs'
import { WingMapManager } from './wing_map_manager'
import { IMAGE_TYPES, GO_RENDERER_DOWNLOAD_URLS, getDefaultGoBinaryPath, getCurrentArchDescription } from './types'
import { validateAndDownloadFont } from './utils'

export const name = 'wydashen-guangyi-query'

export const inject = {
  required: ['puppeteer', 'http']
}

export const Config = Schema.intersect([
  Schema.object({
    backendUrl: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .description('🌐 后端服务器地址')
      .default('http://sh-aliyun2.vincentzyu233.cn:51024'),
    wyWingMapUrl: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .description('🗺️ 光翼 ID 映射 JSON 地址')
      .default('https://s.166.net/config/ds_yy_02/ma75_wing_wings.json'),
  }).description('⚙️ 后端设置'),
  
  Schema.object({
    backgroundImagePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/sky_bg.png'))
      .description(`🖼️ 背景图片路径`),
    tutorialImagePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/tutorial_new_20251026.png'))
      .description(`📚 查询光翼使用方法教程图片路径`),
    skyAppXmlFilePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/0.14.8.xml'))
      .description(`📄 Sky App 导出的 XML 文件路径`),
  }).description('📁 路径设置'),

  Schema.object({
    enableImageCommand: Schema.boolean()
      .default(true)
      .description('🖼️ 注册渲染图片的指令'),
    enableTextCommand: Schema.boolean()
      .default(false)
      .disabled()
      .description('📝 注册发送文字的指令 <em>(东西太多了 onebot 一条发不完，先用合并转发吧)</em>'),
    enableForwardCommand: Schema.boolean()
      .default(true)
      .description('📨 注册发送合并转发的指令 <em>(只适用于 onebot 平台)</em>')
  }).description('🎮 指令设置'),

  Schema.object({
    separateByCategory: Schema.boolean()
      .default(true)
      .description('🏷️ 在生成的图片中，是否按分类分开渲染不同的光翼<br>\
        <em>(遇境 → 云巢 → 晨岛 → 云野 → 雨林 → 霞谷 → 暮土 → 禁阁 → 暴风眼 → <br>普通永久 → 复刻永久 → 破晓季)</em>'),
    containerWidth: Schema.number()
      .default(999)
      .min(0).max(3000)
      .description('📐 图片容器的宽度 (像素)'),
    viewportWidth: Schema.number()
      .default(1000)
      .min(0).max(3000)
      .description('🖥️ 视口宽度 (像素)'),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整quality`),
      Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.PNG)
      .description("📤 渲染图片的输出类型。"),
    screenshotQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(80)
      .description('📏 Puppeteer 截图质量 (0-100)。<br><em>(对于png格式 该选项无效)</em>'),
    puppeteerShowPortalIcons: Schema.boolean()
      .default(true)
      .description('🚪 Puppeteer: 是否显示地图传送门图标'),
  }).description('🎨 Puppeteer图片渲染设置'),

  Schema.object({
    enableGoBackend: Schema.boolean()
      .default(false)
      .description('🐹 是否启用 Go 渲染器。<br><em>启用后，插件将使用 Go 实现的本地渲染器，无需 Puppeteer，性能更高 ⚡</em>'),
    goRendererBinaryPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(getDefaultGoBinaryPath())
      .description('📂 Go 渲染器二进制文件路径。<br><em>适合场景: 1. 开发者快速调试 2. Geek 用户自己编译二进制</em>'),
    goRendererDownloadUrls: Schema.array(
      Schema.object({
        source: Schema.string().description('来源名称'),
        url: Schema.string().description('下载地址'),
      })
    ).role('table')
      .default([...GO_RENDERER_DOWNLOAD_URLS])
      .description(`📥 Go 渲染器二进制文件下载地址表<br>\
        <strong style="color: #10b981;">🖥️ 检测到当前设备架构: <code>${getCurrentArchDescription()}</code></strong>`),
    goDownloadFontFromGitee: Schema.boolean()
      .default(false)
      .description('📥 Go: 是否从 Gitee 下载字体文件。<br><em>启用后，插件启动时会自动下载字体到下方路径</em>'),
    goUseCustomFont: Schema.boolean()
      .default(false)
      .description('🔤 Go: 是否使用自定义字体 (LXGW文楷)。'),
    goCustomFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'))
      .description('📂 Go: 自定义字体文件路径。'),
    goDefaultDarkMode: Schema.boolean()
      .default(true)
      .description('🌙 Go: 是否默认启用黑夜模式渲染'),
    goShowPortalIcons: Schema.boolean()
      .default(true)
      .description('🚪 Go: 是否显示地图传送门图标'),
  }).description('🐹 Go 渲染器设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 是否启用详细的控制台日志输出。启用后，插件将在控制台输出更多调试和运行时信息，有助于问题排查 🔍'),
  }).description('🛠️ 调试设置')

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
    
    // 如果启用了从 Gitee 下载字体，则验证并下载字体
    if (config.goDownloadFontFromGitee) {
      await validateAndDownloadFont(ctx, config.goCustomFontPath);
    }
  });

  ctx.command('刷新光翼')
    .alias('awa_refresh_guangyi')
    .action(async () => {
      return await wingMapManager.refreshWingMap();
    });

  if ( config.enableImageCommand )
  ctx.command('查询光翼-image <userId:string>')
    .alias('查询光翼')
    .alias('aqg')
    .alias('awa_query_guangyi')
    .action(async ({ session }, userId) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼 <角色ID>`)
        return;
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}✨正在查询，请稍候...`);

      try {
        // 调用后端 API 查询光翼数据
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return;
        }

        // 解析响应
        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return;
        }

        // result 字段是 JSON 字符串，需要解析
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

        const portalIconsPathStr = path.resolve(__dirname, '../assets/portal');

        // 渲染图片
        const screenshot = await renderWingImage(
          ctx, userId, wingData.wing_buffs, wingMapManager.getWingMap(), 
          config.backgroundImagePath, wingMapManager, 
          config.separateByCategory, config.containerWidth, config.viewportWidth,
          config.imageType, config.screenshotQuality,
          config.puppeteerShowPortalIcons, portalIconsPathStr
        )

        // 返回图片
        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/${config.imageType};base64,${screenshot}`)}`);
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

  // temporarily deprecate
  if ( config.enableTextCommand )
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
        // 调用后端 API 查询光翼数据
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return;
        }

        // 解析响应
        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return;
        }

        // result 字段是 JSON 字符串，需要解析
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

        // 生成文本
        const textResult = generateWingText(userId, wingData.wing_buffs, wingMapManager.getWingMap(), wingMapManager)

        // 返回文本
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
  
  if ( config.enableForwardCommand )
  ctx.command('查询光翼-forward <userId:string>')
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
        // 调用后端 API 查询光翼数据
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return;
        }

        // 解析响应
        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return;
        }

        // result 字段是 JSON 字符串，需要解析
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

        // 生成合并转发消息
        const forwardMessage = generateWingForward(userId, wingData.wing_buffs, wingMapManager.getWingMap(), wingMapManager)

        // 返回合并转发消息
        await session.send(h.unescape(forwardMessage));
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

  // Go 渲染器指令
  if ( config.enableGoBackend )
  ctx.command('查询光翼-go <userId:string>')
    .alias('aqgo')
    .alias('awa_query_guangyi_go')
    .option('darkMode', '-d [value:string]', { fallback: '' })
    .action(async ( {session, options}, userId ) => {
      if (!userId) {
        await session.send(`${h.quote(session.messageId)}请提供用户ID，用法: 查询光翼-go <角色ID>`)
        return;
      }

      // 处理黑夜模式参数
      let isDarkMode = config.goDefaultDarkMode ?? true
      if (options?.darkMode) {
        const val = String(options.darkMode).toLowerCase()
        if (['yes', 'y', 'true', 't'].includes(val)) {
          isDarkMode = true
        } else if (['no', 'n', 'false', 'f'].includes(val)) {
          isDarkMode = false
        }
      }

      // 检查二进制是否存在
      if (!binaryExists(config.goRendererBinaryPath)) {
        await session.send(`${h.quote(session.messageId)}❌ Go 渲染器二进制文件不存在。请先下载或编译: ${config.goRendererBinaryPath}`)
        return;
      }

      const waitTipMsgIdArr = await session.send(`${h.quote(session.messageId)}✨正在查询 (Go 渲染器)，请稍候...`);

      try {
        // 调用后端 API 查询光翼数据
        const backendUrl = config.backendUrl || 'http://sh-aliyun2.vincentzyu233.cn:51024'
        const apiUrl = `${backendUrl}/queryGuangyi?id=${userId}`

        ctx.logger.debug(`[Go] Querying wing data from: ${apiUrl}`)

        const response = await ctx.http.get(apiUrl)

        if (!response.success) {
          await session.send(`${h.quote(session.messageId)}查询失败: ${response.result || '未知错误'}`)
          return;
        }

        // 解析响应
        const responseData = response.data
        if (!responseData || !responseData.result) {
          await session.send(`${h.quote(session.messageId)}获取数据格式错误`)
          return;
        }

        // result 字段是 JSON 字符串，需要解析
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

        ctx.logger.debug(`[Go] Retrieved ${wingData.wing_buffs.length} wings for role ${userId}`)

        const portalIconsPathStr = path.resolve(__dirname, '../assets/portal');

        // 使用 Go 渲染器渲染图片
        const screenshot = await renderWithGo(
          ctx, 
          userId, 
          wingData.wing_buffs, 
          wingMapManager.getWingMap(),
          { 
            separateByCategory: config.separateByCategory, 
            containerWidth: config.containerWidth,
            binaryPath: config.goRendererBinaryPath,
            customFontPath: config.goUseCustomFont ? config.goCustomFontPath : '',
            darkMode: isDarkMode,
            showPortalIcons: config.goShowPortalIcons,
            portalIconsPath: portalIconsPathStr
          }
        )

        // 返回图片
        await session.send(`${h.quote(session.messageId)}${h.image(`data:image/png;base64,${screenshot}`)}`);
        return;
      } catch (error) {
        ctx.logger.error(`[Go] Error querying wings: ${error}`)
        
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
