// 光翼数据层：纯 TS，移植自插件 src/utils.ts 的处理逻辑（无 Koishi/Node 依赖）

export interface WingData {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion?: number
  deposit_id?: string
}

export interface WingMapItem {
  光翼名字: string
  一级标签: string
  二级标签: string
}

export interface WingDisplayData extends WingData {
  displayName: string
  category: string
  subCategory: string
  index: number
  isFromAPI: boolean
}

export type WingStyle = 'vitepress' | 'lxgw' | 'apple'

// 分类固定顺序（稳定小数据，内联兜底）
export const CATEGORY_ORDER: string[] = [
  '遇境', '云巢', '晨岛', '云野', '雨林', '霞谷', '暮土', '禁阁',
  '暴风眼', '普通永久', '复刻永久', '破晓季', '狂欢船队',
]

// 官方 JSON 未含、由 Frida 发现的额外光翼
export const EXTRA_WING_TAG_MAP: WingMapItem[] = [
  { 光翼名字: 'l_MainStreet_0', 一级标签: '云巢', 二级标签: '小黑屋' },
  { 光翼名字: 'l_CandleSpace_0', 一级标签: '遇境', 二级标签: '小黑屋' },
  { 光翼名字: 'l_SunsetEnd_1', 一级标签: '霞谷', 二级标签: '旧版终点' },
]

export const CATEGORY_EMOJI: Record<string, string> = {
  暴风眼: '🌪️', 晨岛: '🌅', 禁阁: '🏛️', 暮土: '💀', 霞谷: '🌇', 雨林: '🌧️',
  云野: '☁️', 复刻永久: '🔄', 普通永久: '⭐', 破晓季: '🌈', 狂欢船队: '🚢',
  遇境: '🏠', 云巢: '🪺',
}

export const SUBCATEGORY_EMOJI: Record<string, string> = {
  '': '⬜', 重生门: '🚪', 预言季: '🔮', 魔法季: '🪄', 梦想季: '💭', 集结季: '🏕️',
  圣岛季: '🏝️', 小王子季: '👑', 风行季: '🌬️', 潜海季: '🤿', 表演季: '🎭',
  追忆季: '📜', 拾光季: '📸', 九色鹿季: '🦌', 姆明季: '🧸', 青鸟季: '🐦',
  迁徙季: '🦅', 狂欢季: '🎉', 小黑屋: '🕳️', 旧版终点: '⬜',
}

// 传送门图标（仅 6 个地图分类有）
export const PORTAL_MAP: Record<string, string> = {
  晨岛: 'chendao.png',
  云野: 'yunye.png',
  雨林: 'yulin.png',
  霞谷: 'xiagu.png',
  暮土: 'mutu.png',
  禁阁: 'jinge.png',
}

// 每个分类的主题色（apple 极光皮肤按分类着色，参考地图/传送门配色）
export const CATEGORY_THEME: Record<string, [string, string]> = {
  遇境: ['#ffe6a3', '#c9a24b'],
  云巢: ['#6fe3c0', '#2bb3a0'],
  晨岛: ['#ffd36e', '#5bc8f5'],
  云野: ['#7bd88f', '#2fae6b'],
  雨林: ['#4fd0c4', '#2b7a9e'],
  霞谷: ['#ff9ec4', '#ff6f91'],
  暮土: ['#2f6f4f', '#1b4332'],
  禁阁: ['#3b5bd6', '#1e2a78'],
  暴风眼: ['#ff3b30', '#1a1a1a'],
  普通永久: ['#d8c08a', '#9a7b3f'],
  复刻永久: ['#b07bff', '#6a3bd6'],
  破晓季: ['#ff8a5c', '#6a5cff'],
  狂欢船队: ['#ff5c8a', '#ffb45c'],
  未知: ['#8a8a93', '#55555c'],
}

export function spiritBaseName(name: string): string | undefined {
  if (!name.startsWith('s_')) return undefined
  return name.slice(2).replace(/_\d+$/, '')
}

export function getSpiritName(
  name: string,
  spiritMap: Map<string, string>,
): string | undefined {
  const base = spiritBaseName(name)
  return base ? spiritMap.get(base) : undefined
}

export function getWingDisplayInfo(name: string, map: WingMapItem[]) {
  const idx = map.findIndex((it) => it.光翼名字 === name)
  if (idx !== -1) {
    const it = map[idx]
    return {
      displayName: it.光翼名字,
      category: it.一级标签,
      subCategory: it.二级标签 || '',
      index: idx,
    }
  }
  return { displayName: name, category: '未知', subCategory: '', index: 9999 }
}

export function processWingData(
  buffs: WingData[],
  map: WingMapItem[],
): WingDisplayData[] {
  const byName = new Map(buffs.map((w) => [w.name, w]))
  const result: WingDisplayData[] = []
  map.forEach((it, index) => {
    const name = it.光翼名字
    const info = getWingDisplayInfo(name, map)
    const w = byName.get(name)
    if (w) {
      result.push({ ...w, ...info, index, isFromAPI: true })
    } else {
      result.push({
        name,
        collected: false,
        deposited: false,
        last_conversion: 0,
        deposit_id: '',
        ...info,
        index,
        isFromAPI: false,
      })
    }
  })
  return result
}

export function groupWingsByCategory(
  wings: WingDisplayData[],
): [string, WingDisplayData[]][] {
  const g = new Map<string, WingDisplayData[]>()
  wings.forEach((w) => {
    if (!g.has(w.category)) g.set(w.category, [])
    g.get(w.category)!.push(w)
  })
  const out: [string, WingDisplayData[]][] = []
  for (const c of CATEGORY_ORDER) if (g.has(c)) out.push([c, g.get(c)!])
  for (const [c, ws] of g) if (!CATEGORY_ORDER.includes(c)) out.push([c, ws])
  return out
}

export function calcWingStats(wings: WingDisplayData[]) {
  const total = wings.length
  const collected = wings.filter((w) => w.collected).length
  const deposited = wings.filter(
    (w) => w.isFromAPI && w.name.startsWith('s_') && !w.collected,
  ).length
  const notRedeemed = wings.filter(
    (w) => !w.isFromAPI && w.name.startsWith('s_'),
  ).length
  return { total, collected, deposited, notRedeemed }
}

export type WingStatus = 'collected' | 'deposited' | 'notRedeemed' | 'uncollected'

export function statusOf(w: WingDisplayData): WingStatus {
  if (w.collected) return 'collected'
  if (w.isFromAPI && w.name.startsWith('s_')) return 'deposited'
  if (!w.isFromAPI && w.name.startsWith('s_')) return 'notRedeemed'
  return 'uncollected'
}

export const STATUS_TEXT: Record<WingStatus, string> = {
  collected: '已收集',
  deposited: '已存放',
  notRedeemed: '未兑换',
  uncollected: '未收集',
}

export interface WingView {
  name: string
  status: WingStatus
  statusText: string
  natureText: string
  subCategory: string
}

export interface CategoryView {
  category: string
  categoryEmoji: string
  portalFile: string | null
  theme: [string, string]
  total: number
  collected: number
  progress: number
  items: WingView[]
}

function natureTextOf(w: WingDisplayData, spiritMap: Map<string, string>): string {
  if (w.name.startsWith('s_')) {
    const sn = getSpiritName(w.name, spiritMap)
    return sn ? `👻${sn}` : '❓暂时不知道'
  }
  return '🗺️地图光翼'
}

export function buildCategoryView(
  grouped: [string, WingDisplayData[]][],
  spiritMap: Map<string, string>,
): CategoryView[] {
  return grouped.map(([category, wings]) => {
    const collected = wings.filter((w) => w.collected).length
    return {
      category,
      categoryEmoji: CATEGORY_EMOJI[category] || '🏷️',
      portalFile: PORTAL_MAP[category] || null,
      theme: CATEGORY_THEME[category] || CATEGORY_THEME['未知'],
      total: wings.length,
      collected,
      progress: wings.length ? (collected / wings.length) * 100 : 0,
      items: wings.map((w) => {
        const status = statusOf(w)
        return {
          name: w.name,
          status,
          statusText: STATUS_TEXT[status],
          natureText: natureTextOf(w, spiritMap),
          subCategory: w.subCategory,
        }
      }),
    }
  })
}

/* ===== 数据加载层（原 wingData.ts 合并）：运行时从 main GitHub raw 取 wingTagMap + xml，DOMParser 解析先祖名，localStorage 缓存 + Contents API sha 新鲜度核对 ===== */

const OWNER = 'VincentZyuApps'
const REPO = 'koishi-plugin-wydashen-guangyi-query'
const REF = 'main'
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}`
const CDN = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${REF}`
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

export function assetUrl(path: string): string {
  return `${RAW}/${path}`
}

const K_WING = 'wgd:wing:v1'
const K_SPIRIT = 'wgd:spirit:v1'
const K_XMLFILE = 'wgd:xmlfile:v1'
const XML_TTL = 30 * 60 * 1000

function lsGet<T>(k: string): T | null {
  try {
    const s = localStorage.getItem(k)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}
function lsSet(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore quota */
  }
}

async function fetchText(url: string, timeout = 20000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

async function fetchAsset(path: string): Promise<string> {
  try {
    return await fetchText(`${RAW}/${path}`)
  } catch {
    return await fetchText(`${CDN}/${path}`)
  }
}

interface XmlRef {
  file: string
  sha: string
  ts: number
}

async function resolveXml(): Promise<XmlRef> {
  const cached = lsGet<XmlRef>(K_XMLFILE)
  if (cached && cached.file && Date.now() - cached.ts < XML_TTL) return cached
  try {
    const res = await fetch(`${API}/assets/xml`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const entries = (await res.json()) as { name: string; sha: string }[]
    const xmls = entries.filter((e) => e.name.endsWith('.xml'))
    if (!xmls.length) throw new Error('no xml entries')
    xmls.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    )
    const latest = xmls[xmls.length - 1]
    const ref: XmlRef = { file: latest.name, sha: latest.sha, ts: Date.now() }
    lsSet(K_XMLFILE, ref)
    return ref
  } catch {
    return cached ?? { file: '0.16.0.xml', sha: '', ts: 0 }
  }
}

function parseSpiritNames(xmlText: string): Record<string, string> {
  const map: Record<string, string> = {}
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  const nodes = doc.getElementsByTagName('string')
  for (let i = 0; i < nodes.length; i += 1) {
    const el = nodes[i]
    const nm = el.getAttribute('name')
    if (!nm || !nm.startsWith('name_')) continue
    const val = (el.textContent || '').trim()
    if (!val) continue
    const base = nm.slice(5).replace(/_\d+$/, '')
    if (base) map[base] = val
  }
  return map
}

export interface WingDataResult {
  fullMap: WingMapItem[]
  spiritMap: Map<string, string>
  degraded: boolean
}

async function load(): Promise<WingDataResult> {
  let items: WingMapItem[] | null = null
  const wingCache = lsGet<{ data: WingMapItem[] }>(K_WING)
  try {
    const txt = await fetchAsset('assets/json/wingTagMap.json')
    items = JSON.parse(txt) as WingMapItem[]
    if (Array.isArray(items)) lsSet(K_WING, { data: items })
    else items = null
  } catch {
    if (wingCache?.data?.length) items = wingCache.data
  }

  const xml = await resolveXml()
  let spiritMap: Map<string, string> | null = null
  const spiritCache = lsGet<{ sha: string; map: Record<string, string> }>(
    K_SPIRIT,
  )
  if (spiritCache && xml.sha && spiritCache.sha === xml.sha && spiritCache.map) {
    spiritMap = new Map(Object.entries(spiritCache.map))
  } else {
    try {
      const xmlText = await fetchAsset(`assets/xml/${xml.file}`)
      const parsed = parseSpiritNames(xmlText)
      spiritMap = new Map(Object.entries(parsed))
      lsSet(K_SPIRIT, { sha: xml.sha, map: parsed })
    } catch {
      if (spiritCache?.map) spiritMap = new Map(Object.entries(spiritCache.map))
    }
  }

  const degraded = !items
  const fullMap = items ? [...items, ...EXTRA_WING_TAG_MAP] : []
  return { fullMap, spiritMap: spiritMap ?? new Map(), degraded }
}

let inFlight: Promise<WingDataResult> | null = null

export function getWingData(): Promise<WingDataResult> {
  if (!inFlight) {
    inFlight = load().catch((e) => {
      inFlight = null
      throw e
    })
  }
  return inFlight
}