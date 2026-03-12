import { Context, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { renderWingImage } from './render_image'
import { generateWingText } from './gen_text'
import { generateWingForward } from './gen_forward'
import { renderWithGo, binaryExists, downloadBinary } from './render_go'
import path from 'path'
import fs from 'fs'
import { WingMapManager } from './wing_map_manager'
import { validateAndDownloadFont } from './utils'
import { pkg } from './types'
import type { Config } from './config'

export { Config } from './config'

export const name = 'wydashen-guangyi-query'

export const usage = `
<h1>Koishi 插件：wydashen-guangyi-query 🕊️</h1>
<h2>🎯 插件版本：<span style="color: #ff6b6b; font-weight: bold;">v${pkg.version}</span></h2>
<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b style="color: #50c878;">259248174</b></p>
<p>nonebot koishi zerobot，py js go， sky光遇bot交流qq群：<b style="color: #50c878;">475328908</b></p>
<p style="color: #e74c3c;">⚠️ 如果查询光翼的后端挂了，请到群里找 <b>vincentzyu</b> 反馈~</p>

<hr>

<h3 style="color: #3498db;">📖 插件简介</h3>
<p>查询<b>光遇国服</b>玩家的<b>光翼（Winged Light）</b>获取情况，支持 <b>Puppeteer</b> 和 <b>Go</b> 双渲染引擎。</p>
<p>输入玩家角色ID，即可生成一张光翼收集情况的图片，按地图分类展示已收集与未收集的光翼。</p>

<h3 style="color: #27ae60;">🎮 主要指令</h3>
<ul>
  <li><b>查询光翼 &lt;角色ID&gt;</b> — 使用 Puppeteer 渲染图片返回光翼收集情况</li>
  <li><b>查询光翼-go &lt;角色ID&gt;</b> — 使用 Go 渲染器渲染（性能更高 ⚡）</li>
  <li><b>查询光翼-forward &lt;角色ID&gt;</b> — 以合并转发消息返回（仅 OneBot 平台）</li>
  <li><b>获取id方法</b> — 查看如何获取自己的角色ID</li>
  <li><b>刷新光翼</b> — 手动刷新光翼映射数据</li>
</ul>

<h3 style="color: #e67e22;">⚡ 双引擎渲染</h3>
<p>本插件支持两种渲染方式：</p>
<ul>
  <li><b style="color: #9b59b6;">Puppeteer 渲染</b> — 默认方式，需要 puppeteer 服务，效果精美</li>
  <li><b style="color: #2ecc71;">Go 渲染器</b> — 可选方式，无需 Puppeteer，性能更高，支持深色模式</li>
</ul>

<hr>

<p>📦 插件仓库地址：</p>
<ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query">Gitee</a></li>
  <li><a href="https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query">GitHub</a></li>
</ul>

<hr>


`

export const inject = {
  required: ['puppeteer', 'http']
}

interface WingBuff {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion: number
  deposit_id: string
}

export function apply(ctx: Context, config: Config) {
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

      // 检查二进制是否存在，不存在则自动下载
      if (!binaryExists(config.goRendererBinaryPath)) {
        await session.send(`${h.quote(session.messageId)}📥 Go 渲染器未找到，正在自动下载...`)
        const success = await downloadBinary(ctx, config.goRendererDownloadUrls, config.goRendererBinaryPath)
        if (!success) {
          await session.send(`${h.quote(session.messageId)}❌ Go 渲染器自动下载失败，请检查网络或手动下载: ${config.goRendererBinaryPath}`)
          return;
        }
        await session.send(`${h.quote(session.messageId)}✅ Go 渲染器下载成功！`)
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
