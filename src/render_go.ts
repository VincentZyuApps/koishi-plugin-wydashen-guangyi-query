import { Context } from 'koishi'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import http from 'http'

// 二进制文件下载配置
// gitee 放前面，github 放后面
export const BINARY_DOWNLOAD_URLS: { source: string; url: string }[] = [
  // Gitee (中国大陆优先)
  { source: 'gitee', url: 'https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-linux-amd64' },
  { source: 'gitee', url: 'https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-linux-arm64' },
  { source: 'gitee', url: 'https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-darwin-amd64' },
  { source: 'gitee', url: 'https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-darwin-arm64' },
  { source: 'gitee', url: 'https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-windows-amd64.exe' },
  // GitHub
  { source: 'github', url: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-linux-amd64' },
  { source: 'github', url: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-linux-arm64' },
  { source: 'github', url: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-darwin-amd64' },
  { source: 'github', url: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-darwin-arm64' },
  { source: 'github', url: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases/download/{{VERSION}}/wing-renderer-windows-amd64.exe' },
]

// 获取当前平台的二进制文件名 (已废弃，使用 types.ts 中的函数)
export function getBinaryName(): string {
  const platform = os.platform()
  const arch = os.arch()

  let suffix = ''
  if (platform === 'win32') {
    suffix = '-windows-amd64.exe'
  } else if (platform === 'darwin') {
    suffix = arch === 'arm64' ? '-darwin-arm64' : '-darwin-amd64'
  } else {
    // linux
    suffix = arch === 'arm64' ? '-linux-arm64' : '-linux-amd64'
  }

  return `wing-renderer${suffix}`
}

// 获取二进制文件路径 (已废弃，使用配置中的路径)
export function getBinaryPath(): string {
  return path.resolve(__dirname, '../bin', getBinaryName())
}

// 检查二进制文件是否存在 (支持自定义路径)
export function binaryExists(customPath?: string): boolean {
  const binaryPath = customPath || getBinaryPath()
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
  config: { separateByCategory?: boolean; containerWidth?: number; binaryPath?: string; customFontPath?: string; darkMode?: boolean; showPortalIcons?: boolean } = {}
): Promise<string> {
  const binaryPath = config.binaryPath || getBinaryPath()

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
      portalIconsPath: path.resolve(__dirname, '../assets/portal'),
    },
  }

  const inputJson = JSON.stringify(input)

  ctx.logger.debug(`[Go Renderer] 调用渲染器，角色ID: ${roleId}, 光翼数: ${wingBuffs.length}`)

  try {
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
    ctx.logger.error(`[Go Renderer] 渲染失败: ${error}`)
    throw error
  }
}

/**
 * 下载二进制文件
 */
export async function downloadBinary(
  ctx: Context,
  version: string = 'v1.0.0',
  preferredSource: 'gitee' | 'github' = 'gitee'
): Promise<boolean> {
  const binaryName = getBinaryName()
  const binaryPath = getBinaryPath()

  // 确保目录存在
  const binDir = path.dirname(binaryPath)
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }

  // 查找匹配的下载链接
  const urls = BINARY_DOWNLOAD_URLS.filter(item =>
    item.url.includes(binaryName.replace('wing-renderer', ''))
  )

  // 按优先源排序
  urls.sort((a, b) => {
    if (a.source === preferredSource && b.source !== preferredSource) return -1
    if (a.source !== preferredSource && b.source === preferredSource) return 1
    return 0
  })

  for (const { source, url } of urls) {
    const downloadUrl = url.replace('{{VERSION}}', version)
    ctx.logger.info(`[Go Renderer] 尝试从 ${source} 下载: ${downloadUrl}`)

    try {
      await downloadFile(downloadUrl, binaryPath)

      // 添加执行权限
      if (os.platform() !== 'win32') {
        fs.chmodSync(binaryPath, 0o755)
      }

      ctx.logger.info(`[Go Renderer] ✅ 下载成功: ${binaryPath}`)
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
