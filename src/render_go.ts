import { Context } from 'koishi'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import http from 'http'
import { getDefaultGoBinaryPath, getCurrentArchDescription } from './types'

// 检查二进制文件是否存在 (支持自定义路径)
export function binaryExists(customPath?: string): boolean {
  const binaryPath = customPath || getDefaultGoBinaryPath()
  return fs.existsSync(binaryPath)
}

// 渲染输入类型
interface RenderInput {
  roleId: string
  wingBuffs: readonly any[]
  wingMap: readonly any[]
  config: {
    separateByCategory: boolean
    containerWidth: number
    outputFormat: string
    customFontPath: string
    darkMode: boolean
    showPortalIcons: boolean
    portalIconsPath: string // assets/portal 目录的绝对路径
  }
}

// 渲染输出类型
interface RenderOutput {
  success: boolean
  format: string
  data: string
  error?: string
}

/**
 * 使用 Go 渲染器生成光翼图片
 */
export async function renderWithGo(
  ctx: Context,
  roleId: string,
  wingBuffs: readonly any[],
  wingMap: readonly any[],
  config: { 
    separateByCategory?: boolean; 
    containerWidth?: number; 
    binaryPath?: string; 
    customFontPath?: string; 
    darkMode?: boolean; 
    showPortalIcons?: boolean;
    portalIconsPath?: string;
  } = {}
): Promise<string> {
  const binaryPath = config.binaryPath || getDefaultGoBinaryPath()

  if (!binaryExists(binaryPath)) {
    throw new Error(`Go 渲染器二进制文件不存在: ${binaryPath}。请先下载或编译二进制文件。`)
  }

  // 构造输入
  const input: RenderInput = {
    roleId,
    wingBuffs,
    wingMap,
    config: {
      separateByCategory: config.separateByCategory ?? true,
      containerWidth: config.containerWidth ?? 1200,
      outputFormat: 'png',
      customFontPath: config.customFontPath ?? '',
      darkMode: config.darkMode ?? true,
      showPortalIcons: config.showPortalIcons ?? true,
      portalIconsPath: config.portalIconsPath || path.resolve(__dirname, '../assets/portal'),
    },
  }

  const inputJson = JSON.stringify(input)

  ctx.logger.debug(`[Go Renderer] 调用渲染器，角色ID: ${roleId}, 光翼数: ${wingBuffs.length}`)

  const maxRetries = 3
  const retryDelay = 1000 // 1秒

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 检查文件状态
      const stats = fs.statSync(binaryPath)
      ctx.logger.debug(`[Go Renderer] 二进制文件状态: size=${stats.size}, mode=${stats.mode.toString(8)}`)
      
      // 尝试杀死可能残留的同名进程（避免 Text file busy）
      try {
        const { execSync } = require('child_process')
        execSync(`pkill -f "wing-renderer-linux-amd64" 2>/dev/null || true`, { stdio: 'ignore' })
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) { /* ignore */ }
      
      // 调用 Go 二进制，使用 spawn 以便写入 stdin
      const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(binaryPath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        child.on('error', (err) => {
          reject(err)
        })

        child.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Go 渲染器退出码: ${code}, stderr: ${stderr}`))
          } else {
            resolve({ stdout, stderr })
          }
        })

        // 设置超时
        const timeout = setTimeout(() => {
          child.kill()
          reject(new Error('Go 渲染器超时 (30秒)'))
        }, 30000)

        child.on('close', () => clearTimeout(timeout))

        // 写入 stdin
        child.stdin.write(inputJson)
        child.stdin.end()
      })

    if (stderr) {
      ctx.logger.warn(`[Go Renderer] stderr: ${stderr}`)
    }

    // 解析输出
    const output: RenderOutput = JSON.parse(stdout)

    if (!output.success) {
      throw new Error(output.error || '渲染失败')
    }

    ctx.logger.debug(`[Go Renderer] 渲染成功，格式: ${output.format}`)

    return output.data // base64 编码的 PNG
    } catch (error) {
      ctx.logger.warn(`[Go Renderer] 第 ${attempt}/${maxRetries} 次尝试失败: ${error}`)
      
      if (attempt < maxRetries) {
        ctx.logger.info(`[Go Renderer] 等待 ${retryDelay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
      
      ctx.logger.error(`[Go Renderer] 渲染失败: ${error}`)
      throw error
    }
  }
}

/**
 * 从配置的下载地址列表中，自动选择匹配当前平台的 URL 下载二进制文件
 * @param ctx Koishi 上下文
 * @param downloadUrls 下载地址列表（来自 config.goRendererDownloadUrls）
 * @param savePath 保存路径（来自 config.goRendererBinaryPath）
 * @param preferGitee 是否优先使用 Gitee（中国大陆用户推荐）
 */
export async function downloadBinary(
  ctx: Context,
  downloadUrls: { source: string; url: string }[],
  savePath: string,
  preferGitee: boolean = true
): Promise<boolean> {
  // 获取当前平台架构描述，例如 "linux-amd64", "darwin-arm64", "windows-amd64"
  const archDesc = getCurrentArchDescription()
  ctx.logger.info(`[Go Renderer] 当前平台: ${archDesc}`)

  // 从 URL 列表中筛选匹配当前平台的链接
  const matchedUrls = downloadUrls.filter(item => item.url.includes(archDesc))

  if (matchedUrls.length === 0) {
    ctx.logger.error(`[Go Renderer] ❌ 在下载列表中未找到匹配 ${archDesc} 的链接`)
    return false
  }

  // 按优先源排序：gitee 优先（中国大陆网络更快）
  const preferredSource = preferGitee ? 'gitee' : 'github'
  matchedUrls.sort((a, b) => {
    if (a.source === preferredSource && b.source !== preferredSource) return -1
    if (a.source !== preferredSource && b.source === preferredSource) return 1
    return 0
  })

  // 确保目录存在
  const binDir = path.dirname(savePath)
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }

  // 生成临时文件名（带时间戳，避免文件被占用）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_')

  for (const { source, url } of matchedUrls) {
    ctx.logger.info(`[Go Renderer] 尝试从 ${source} 下载: ${url}`)

    try {
      // 下载到临时文件
      const tempPath = `${savePath}.tmp.${timestamp}`
      await downloadFile(url, tempPath)

      // 复制到正式文件名（覆盖旧文件）
      fs.copyFileSync(tempPath, savePath)

      // 删除临时文件
      fs.unlinkSync(tempPath)

      // 添加执行权限 (非 Windows)
      if (os.platform() !== 'win32') {
        fs.chmodSync(savePath, 0o755)
      }

      ctx.logger.info(`[Go Renderer] ✅ 下载成功: ${savePath}`)
      return true
    } catch (error) {
      ctx.logger.warn(`[Go Renderer] 从 ${source} 下载失败: ${error}`)
    }
  }

  ctx.logger.error(`[Go Renderer] ❌ 所有下载源均失败`)
  return false
}

// 下载文件辅助函数
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    })

    request.on('error', (err) => {
      fs.unlink(dest, () => { }) // 删除不完整的文件
      reject(err)
    })

    file.on('error', (err) => {
      fs.unlink(dest, () => { })
      reject(err)
    })
  })
}
