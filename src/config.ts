import { Schema } from 'koishi'
import path from 'path'
import { IMAGE_TYPES, GO_RENDERER_DOWNLOAD_URLS, getDefaultGoBinaryPath, getCurrentArchDescription } from './types'

export interface Config {
  backendUrl: string;
  wyWingMapUrl: string;

  backgroundImagePath: string;
  tutorialImagePath: string;
  skyAppXmlFilePath: string;

  enableImageCommand: boolean;
  enableTextCommand: boolean;
  enableForwardCommand: boolean;

  separateByCategory: boolean;
  containerWidth: number;
  viewportWidth: number;
  imageType: string;
  screenshotQuality: number;
  puppeteerShowPortalIcons: boolean;

  enableGoBackend: boolean;
  goRendererBinaryPath: string;
  goRendererDownloadUrls: { source: string; url: string }[];
  goDownloadFontFromGitee: boolean;
  goUseCustomFont: boolean;
  goCustomFontPath: string;
  goDefaultDarkMode: boolean;
  goShowPortalIcons: boolean;

  verboseConsoleLog: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
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
