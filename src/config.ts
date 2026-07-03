import path from 'path'

import { Schema } from 'koishi'

import { categoryOrder } from './const'
import { stringifyCompact, DEFAULT_KEYBOARD_ROWS } from './qq_markdown'
import { IMAGE_TYPES } from './types'
import { DEFAULT_LXGW_WENKAI_PATH } from './utils'

export interface Config {
  // ----- ⚙️ 后端设置 -----
  backendUrl: string;
  wyWingMapUrl: string;

  // ----- 📁 路径设置 -----
  backgroundImagePath: string;
  tutorialImagePath: string;
  skyAppXmlFilePath: string;

  // ----- 🎮 指令设置 -----
  enableImagePptrCommand: boolean;
  pptrCommandName: string;
  enableTextCommand: boolean;
  textCommandName: string;
  enableForwardCommand: boolean;
  forwardCommandName: string;
  enableCanvasCommand: boolean;
  canvasCommandName: string;
  enableTutorialCommand: boolean;
  tutorialCommandName: string;
  enableRefreshCommand: boolean;
  refreshCommandName: string;

  // ----- 🎨 Puppeteer 图片渲染设置 -----
  separateByCategory: boolean;
  containerWidth: number;
  viewportWidth: number;
  imageType: string;
  screenshotQuality: number;
  puppeteerUseCustomFont: boolean;
  puppeteerFontPath: string;
  puppeteerShowPortalIcons: boolean;
  puppeteerShowRenderInfo: boolean;

  // ----- 📝 文字输出设置 -----
  textMaxLength: number;

  // ----- 🎨 Canvas 图片渲染设置 -----
  canvasDarkMode: boolean;
  canvasWidth: number;
  canvasScale: number;
  canvasUseCustomFont: boolean;
  canvasFontPath: string;
  canvasEmojiFontPath: string;
  canvasShowPortalIcons: boolean;
  canvasImageType: string;
  canvasQuality: number;
  canvasShowRenderInfo: boolean;

  // ----- 🤖 QQ 官方 Bot 平台设置 -----
  enableQQMarkdown: boolean;
  qqMarkdownKeyboardJson: string;

  // ----- 🛠️ 调试设置 -----
  verboseConsoleLog: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    backendUrl: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .description('🌐 后端服务器地址')
      .default('http://bluerosion.vincentzyu233.cn:51024'),
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
      .default(path.resolve(__dirname, '../assets/tutorial_20260614_html.png'))
      .description(`📚 查询光翼使用方法教程图片路径`),
    skyAppXmlFilePath: Schema.string()
      .role('textarea', { rows: [2, 5] })
      .default(path.resolve(__dirname, '../assets/0.16.0.xml'))
      .description(`📄 Sky App 导出的 XML 文件路径`),
  }).description('📁 路径设置'),

  Schema.object({
    enableImagePptrCommand: Schema.boolean()
      .default(true)
      .description('🖼️ 注册 Puppeteer 渲染图片的指令'),
    pptrCommandName: Schema.string()
      .default('查询光翼-pptr')
      .description('🖼️ Puppeteer 指令名称'),
    enableTextCommand: Schema.boolean()
      .default(false)
      .description('📝 注册发送文字的指令 <br> <em>📄 (东西太多了 有可能一条发不完，建议用用图片 or 合并转发吧)</em>'),
    textCommandName: Schema.string()
      .default('查询光翼-text')
      .description('📝 文字指令名称'),
    enableForwardCommand: Schema.boolean()
      .default(true)
      .description('📨 注册发送合并转发的指令 <br> <em>📤 (只适用于 onebot 平台)</em>'),
    forwardCommandName: Schema.string()
      .default('查询光翼-forward')
      .description('📨 合并转发指令名称'),
    enableCanvasCommand: Schema.boolean()
      .default(true)
      .description('🎨 注册 Canvas 渲染图片的指令'),
    canvasCommandName: Schema.string()
      .default('查询光翼-canvas')
      .description('🎨 Canvas 指令名称'),
    enableTutorialCommand: Schema.boolean()
      .default(true)
      .description('📚 注册教程指令'),
    tutorialCommandName: Schema.string()
      .default('获取id方法')
      .description('📚 教程指令名称'),
    enableRefreshCommand: Schema.boolean()
      .default(true)
      .description('🔄 注册手动刷新光翼映射数据的指令'),
    refreshCommandName: Schema.string()
      .default('刷新光翼')
      .description('🔄 刷新指令名称'),
  }).description('🎮 指令设置'),

  Schema.object({
    separateByCategory: Schema.boolean()
      .default(true)
      .description(`🏷️ 在生成的图片中，是否按分类分开渲染不同的光翼<br>\
        <em>(${categoryOrder.slice(0, -3).join(' → ')} → <br>${categoryOrder.slice(-3).join(' → ')})</em>`),
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
    puppeteerUseCustomFont: Schema.boolean()
      .default(true)
      .description('🔤 Puppeteer: 是否使用自定义字体<br><em>开启后必须保证下方字体路径可用，否则会直接报错；关闭后忽略下方路径并使用系统默认字体</em>'),
    puppeteerFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(DEFAULT_LXGW_WENKAI_PATH)
      .description('🔤 Puppeteer: 中文字体文件路径 (绝对路径)<br><em>仅在开启自定义字体时生效；默认运行时优先使用 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf，缺失时会先尝试 Gitee，再尝试 GitHub 下载并校验大小与 hash。若路径为空、文件不存在或读取失败，会直接报错</em>'),
    puppeteerShowPortalIcons: Schema.boolean()
      .default(true)
      .description('🚪 Puppeteer: 是否显示地图传送门图标'),
    puppeteerShowRenderInfo: Schema.boolean()
      .default(true)
      .description('📊 Puppeteer: 在图片消息后显示渲染耗时统计'),
  }).description('🎨 Puppeteer图片渲染设置'),

  Schema.object({
    textMaxLength: Schema.number()
      .default(1000)
      .min(100).max(10000).step(100)
      .description('📝 文字指令返回结果的最大字符数'),
  }).description('📝 文字输出设置'),

  Schema.object({
    canvasDarkMode: Schema.boolean()
      .default(false)
      .description('🌙 Canvas: 是否默认启用黑夜模式渲染'),
    canvasWidth: Schema.number()
      .default(910)
      .min(400).max(1600)
      .description('📐 Canvas: 图片宽度 (像素)'),
    canvasScale: Schema.number()
      .default(2)
      .min(0.5).max(10).step(0.1)
      .description('🔍 Canvas: 内部渲染缩放倍率（值越大越清晰，但耗时和图片体积也会增加）'),
    canvasUseCustomFont: Schema.boolean()
      .default(true)
      .description('🔤 Canvas: 是否使用自定义字体<br><em>开启后必须保证下方字体路径可用，否则会直接报错；关闭后忽略下方路径并使用系统默认字体</em>'),
    canvasFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(DEFAULT_LXGW_WENKAI_PATH)
      .description('🔤 Canvas: 中文字体文件路径 (绝对路径)<br><em>仅在开启自定义字体时生效；默认运行时优先使用 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf，缺失时会先尝试 Gitee，再尝试 GitHub 下载并校验大小与 hash。若路径为空、文件不存在或注册失败，会直接报错</em>'),
    canvasEmojiFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default('')
      .description('🔤 Canvas: Emoji 字体文件路径'),
    canvasShowPortalIcons: Schema.boolean()
      .experimental()
      .default(true)
      .description('🚪 Canvas: 是否显示地图传送门图标 <br> <i>🚧还未生效，调试中</i>'),
    canvasImageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG} ❌ 不支持调整quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.PNG)
      .description("📤 Canvas: 渲染图片的输出类型。"),
    canvasQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(90)
      .description('📏 Canvas: JPEG 质量 (0-100)。<br><em>(对于png格式 该选项无效)</em>'),
    canvasShowRenderInfo: Schema.boolean()
      .default(true)
      .description('📊 Canvas: 在图片消息后显示渲染耗时统计'),
  }).description('🎨 @napi-rs/canvas 图片渲染设置'),

  Schema.object({
    enableQQMarkdown: Schema.boolean()
      .default(true)
      .description('💬 在 QQ 官方 Bot 平台发送图片时附带 Markdown + 按钮消息'),
    qqMarkdownKeyboardJson: Schema.string()
      .role('textarea', { rows: [5, 10] })
      .default(stringifyCompact(DEFAULT_KEYBOARD_ROWS))
      .description('📋 QQ Markdown 按钮 JSON 配置<br><em>支持变量: <code>${canvasCommandName}</code> <code>${pptrCommandName}</code> <code>${tutorialCommandName}</code> <code>${userId}</code></em>'),
  }).description('🤖 QQ 官方 Bot 平台设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 是否启用详细的控制台日志输出。启用后，插件将在控制台输出更多调试和运行时信息，有助于问题排查 🔍'),
  }).description('🛠️ 调试设置')

])
