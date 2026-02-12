import { Context } from 'koishi'
import { existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'

// 字体文件配置
export const FONT_CONFIG = {
  filename: 'LXGWWenKaiMono-Regular.ttf',
  downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image/releases/download/font/LXGWWenKaiMono-Regular.ttf'
}

/**
 * 获取默认字体文件路径
 */
export function getFontPath(): string {
  return join(__dirname, '..', 'assets', FONT_CONFIG.filename)
}

/**
 * 检查字体文件是否存在
 * @param fontPath 可选的自定义字体路径
 */
export function fontExists(fontPath?: string): boolean {
  return existsSync(fontPath || getFontPath())
}

/**
 * 验证并下载字体文件
 * @param ctx Koishi Context 实例
 * @param targetPath 目标字体文件保存路径
 * @returns Promise<boolean> 是否成功
 */
export async function validateAndDownloadFont(ctx: Context, targetPath?: string): Promise<boolean> {
  const fontPath = targetPath || getFontPath()
  const fontDir = dirname(fontPath)
  const fontFilename = basename(fontPath)
  
  // 确保目标目录存在
  if (!existsSync(fontDir)) {
    mkdirSync(fontDir, { recursive: true })
  }
  
  // 检查字体文件是否存在
  if (existsSync(fontPath)) {
    ctx.logger.info(`[Font] ✅ 字体文件 ${fontFilename} 已存在: ${fontPath}`)
    return true
  }
  
  ctx.logger.info(`[Font] 字体文件 ${fontFilename} 不存在，开始下载到: ${fontPath}`)
  
  try {
    // 下载字体文件
    const response = await ctx.http.get(FONT_CONFIG.downloadUrl, { 
      responseType: 'arraybuffer',
      timeout: 60000 // 60秒超时，字体文件可能较大
    })
    const fontBuffer = Buffer.from(response)
    
    // 保存字体文件
    writeFileSync(fontPath, fontBuffer)
    ctx.logger.info(`[Font] 字体文件 ${fontFilename} 下载完成 (${(fontBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
    return true
  } catch (error) {
    ctx.logger.error(`[Font] 下载字体文件 ${fontFilename} 失败: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}
