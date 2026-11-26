// 最近查询队列：localStorage 持久化，按 id 去重、置顶，最多 5 条

export interface RecentItemBase {
  id: string
  savedAt: number
}

const MAX = 5

export function loadRecent<T extends RecentItemBase>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? (arr as T[]) : []
  } catch {
    return []
  }
}

function save<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* 配额或序列化失败，忽略 */
  }
}

export function pushRecent<T extends RecentItemBase>(
  key: string,
  list: T[],
  item: T,
): T[] {
  const next = [item, ...list.filter((x) => x.id !== item.id)].slice(0, MAX)
  save(key, next)
  return next
}

export function removeRecent<T extends RecentItemBase>(
  key: string,
  list: T[],
  id: string,
): T[] {
  const next = list.filter((x) => x.id !== id)
  save(key, next)
  return next
}

export function clearRecent(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function formatSavedAt(ts: number): string {
  const diff = Date.now() - ts
  const m = 60_000
  const h = 3_600_000
  const d = 86_400_000
  if (diff < m) return '刚刚'
  if (diff < h) return `${Math.floor(diff / m)} 分钟前`
  if (diff < d) return `今天 ${new Date(ts).toTimeString().slice(0, 5)}`
  const dt = new Date(ts)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}
