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

export type WingStyle = 'vitepress' | 'pptr' | 'apple'

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
