export type Line = 'direct' | 'cf'

export const LINES: Record<Line, { label: string; base: string }> = {
  direct: { label: '国内直连', base: 'https://guangyi.vincentzyu233.cn' },
  cf: { label: 'CF 线路', base: 'https://cf-guangyi.vincentzyu233.cn' },
}

export interface WingBuff {
  name: string
  collected?: boolean
  deposited?: boolean
  [key: string]: unknown
}

export interface LightResponse {
  success: boolean
  roleId?: string
  server?: string
  data?: { result?: string }
  result?: string
  error?: { message?: string }
}

export interface InventoryItem {
  id: string
  name: string
  season?: string
  icon?: string
}

export interface InventoryCategory {
  key: string
  label: string
  count: number
  items: InventoryItem[]
}

export interface InventoryResponse {
  success: boolean
  roleId?: string
  total?: number
  uniqueTotal?: number
  categories?: InventoryCategory[]
  message?: string
}

// 构建时由 .vitepress/config.ts 的 vite.define 注入（格式 YYYYMMDD_HHmm，北京时间）
declare const __BUILD_STAMP__: string

export function iconUrl(icon: string, line: Line): string {
  if (!icon) return ''
  const marker = '/game_res/'
  const index = icon.indexOf(marker)
  if (index === -1) return icon
  return `${LINES[line].base}/cbg-icon/${icon.slice(index + marker.length)}?timestamp=${__BUILD_STAMP__}`
}

export async function getJson<T>(url: string, timeout = 60000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const text = await res.text()
    let body: unknown = text
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      // 非 JSON 响应保留文本
    }
    if (!res.ok) {
      const error = body as { message?: string; detail?: string } | null
      throw new Error(error?.message || error?.detail || `HTTP ${res.status}`)
    }
    return body as T
  } finally {
    clearTimeout(timer)
  }
}
