// 光翼数据加载层：运行时从插件 main 分支 GitHub raw 取 wingTagMap.json + xml，
// 浏览器内 DOMParser 解析先祖名，localStorage 缓存 + Contents API sha 做新鲜度核对。

import { EXTRA_WING_TAG_MAP, type WingMapItem } from './wing'

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
  // 1) 全量光翼映射表
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

  // 2) xml 版本 + 先祖名映射
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
