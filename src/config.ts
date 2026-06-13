import { Schema } from 'koishi'
import path from 'path'
import { IMAGE_TYPES } from './types'
import { categoryOrder } from './const'

export interface Config {
  backendUrl: string;
  wyWingMapUrl: string;

  backgroundImagePath: string;
  tutorialImagePath: string;
  skyAppXmlFilePath: string;

  enableImagePptrCommand: boolean;
  enableTextCommand: boolean;
  enableForwardCommand: boolean;
  enableCanvasCommand: boolean;
  enableTutorialCommand: boolean;
  enableRefreshCommand: boolean;

  separateByCategory: boolean;
  containerWidth: number;
  viewportWidth: number;
  imageType: string;
  screenshotQuality: number;
  puppeteerShowPortalIcons: boolean;

  canvasDarkMode: boolean;
  canvasWidth: number;
  canvasScale: number;
  canvasFontPath: string;
  canvasEmojiFontPath: string;
  canvasShowPortalIcons: boolean;
  canvasImageType: string;
  canvasQuality: number;

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
    enableImagePptrCommand: Schema.boolean()
      .default(true)
      .description('🖼️ 注册 Puppeteer 渲染图片的指令'),
    enableTextCommand: Schema.boolean()
      .default(false)
      .description('📝 注册发送文字的指令 <br> <em>📄 (东西太多了 有可能一条发不完，建议用用图片 or 合并转发吧)</em>'),
    enableForwardCommand: Schema.boolean()
      .default(true)
      .description('📨 注册发送合并转发的指令 <br> <em>📤 (只适用于 onebot 平台)</em>'),
    enableCanvasCommand: Schema.boolean()
      .default(true)
      .description('🎨 注册 Canvas 渲染图片的指令'),
    enableTutorialCommand: Schema.boolean()
      .default(true)
      .description('📚 注册教程指令'),
    enableRefreshCommand: Schema.boolean()
      .default(true)
      .description('🔄 注册手动刷新光翼映射数据的指令')
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
    puppeteerShowPortalIcons: Schema.boolean()
      .default(true)
      .description('🚪 Puppeteer: 是否显示地图传送门图标'),
  }).description('🎨 Puppeteer图片渲染设置'),

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
    canvasFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default(path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'))
      .description('🔤 Canvas: 中文字体文件路径 (绝对路径)'),
    canvasEmojiFontPath: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default('C:\\Windows\\Fonts\\seguiemj.ttf')
      .description('🔤 Canvas: Emoji 字体文件路径 (Windows 默认 Segoe UI Emoji，若不存在会自动忽略)'),
    canvasShowPortalIcons: Schema.boolean()
      .default(true)
      .description('🚪 Canvas: 是否显示地图传送门图标'),
    canvasImageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.PNG)
      .description("📤 Canvas: 渲染图片的输出类型。"),
    canvasQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(90)
      .description('📏 Canvas: JPEG 质量 (0-100)。<br><em>(对于png格式 该选项无效)</em>'),
  }).description('🎨 @napi-rs/canvas 图片渲染设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 是否启用详细的控制台日志输出。启用后，插件将在控制台输出更多调试和运行时信息，有助于问题排查 🔍'),
  }).description('🛠️ 调试设置')

])
