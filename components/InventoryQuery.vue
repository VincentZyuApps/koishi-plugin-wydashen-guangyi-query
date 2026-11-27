<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getJson,
  iconUrl,
  LINES,
  type Line,
  type InventoryResponse,
} from './api'
import {
  clearRecent,
  loadRecent,
  pushRecent,
  removeRecent,
} from '../lib/recent'
import LineSwitch from './LineSwitch.vue'
import ExportActions from './ExportActions.vue'
import RecentQueries from './RecentQueries.vue'

interface RecentInventoryEntry {
  id: string
  line: Line
  savedAt: number
  total: number
  uniqueTotal: number
  response: InventoryResponse
}

const RECENT_KEY = 'wgd:recent:outfit:v1'

const uuid = ref('')
const line = ref<Line>('direct')
const loading = ref(false)
const error = ref('')
const role = ref('')
const data = ref<InventoryResponse | null>(null)
const resultRef = ref<HTMLElement | null>(null)
const recent = ref<RecentInventoryEntry[]>([])
const fromCache = ref(false)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const total = computed(() => data.value?.total ?? 0)
const uniqueTotal = computed(() => data.value?.uniqueTotal ?? 0)

const recentItems = computed(() =>
  recent.value.map((e) => ({
    id: e.id,
    title: e.id.slice(0, 8),
    meta: `条目 ${e.total}/${e.uniqueTotal}`,
    savedAt: e.savedAt,
  })),
)

onMounted(() => {
  recent.value = loadRecent<RecentInventoryEntry>(RECENT_KEY)
})

async function query() {
  const id = uuid.value.trim()
  error.value = ''
  data.value = null
  role.value = ''
  if (!UUID_RE.test(id)) {
    error.value = '请输入正确的角色原 ID（UUID），暂不支持短 ID'
    return
  }
  loading.value = true
  try {
    const res = await getJson<InventoryResponse>(
      `${LINES[line.value].base}/queryCbgInv?id=${encodeURIComponent(id)}`,
    )
    if (!res.success) {
      throw new Error(res.message || '查询失败')
    }
    role.value = res.roleId || id
    data.value = res
    fromCache.value = false
    recent.value = pushRecent<RecentInventoryEntry>(RECENT_KEY, recent.value, {
      id: role.value,
      line: line.value,
      savedAt: Date.now(),
      total: res.total ?? 0,
      uniqueTotal: res.uniqueTotal ?? 0,
      response: res,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message.toLowerCase().includes('abort')
      ? '请求超时，请稍后重试'
      : `查询失败：${message}`
  } finally {
    loading.value = false
  }
}

function applyRecent(id: string) {
  const entry = recent.value.find((e) => e.id === id)
  if (!entry) return
  uuid.value = entry.id
  role.value = entry.id
  line.value = entry.line
  data.value = entry.response
  error.value = ''
  fromCache.value = true
}

function refresh() {
  if (!role.value) return
  uuid.value = role.value
  fromCache.value = false
  query()
}

function onRemoveRecent(id: string) {
  recent.value = removeRecent<RecentInventoryEntry>(RECENT_KEY, recent.value, id)
}

function onClearRecent() {
  clearRecent(RECENT_KEY)
  recent.value = []
}
</script>

<template>
  <div class="query-panel">
    <div class="query-form">
      <input
        v-model="uuid"
        type="text"
        placeholder="输入角色原 ID（UUID），例如 37ec67d8-…"
        @keyup.enter="query"
      />
      <LineSwitch v-model="line" />
      <button class="query-btn" :disabled="loading" @click="query">
        {{ loading ? '查询中…' : '查询' }}
      </button>
    </div>

    <RecentQueries
      v-if="recentItems.length"
      :items="recentItems"
      @pick="applyRecent"
      @remove="onRemoveRecent"
      @clear="onClearRecent"
    />

    <p v-if="error" class="query-error">{{ error }}</p>
    <p v-if="loading" class="result-sub">查询中，请稍候…</p>

    <section v-if="data" ref="resultRef" class="result-card">
      <div class="result-head">
        <div>
          <h2 class="result-title">藏宝阁衣柜</h2>
          <p class="result-sub">
            角色：{{ role }} · 线路：{{ LINES[line].label }}
            <span v-if="fromCache"> · 来自缓存</span>
          </p>
        </div>
        <div class="result-actions">
          <button v-if="fromCache" class="refresh-btn" @click="refresh">
            🔄 刷新
          </button>
        </div>
      </div>
      <div class="result-stats">
        <div class="stat"><b>{{ total }}</b><span>分组条目</span></div>
        <div class="stat"><b>{{ uniqueTotal }}</b><span>去重数量</span></div>
      </div>
      <div v-for="category in data.categories || []" :key="category.key">
        <h3 class="category-title">
          {{ category.label }}（{{ category.count }}）
        </h3>
        <div class="inventory-grid">
          <div
            v-for="item in category.items"
            :key="item.id"
            class="inventory-item"
          >
            <img
              v-if="item.icon"
              :src="iconUrl(item.icon, line)"
              :alt="item.name"
              crossOrigin="anonymous"
              loading="lazy"
            />
            <span>{{ item.name }}</span>
            <span v-if="item.season">{{ item.season }}</span>
          </div>
        </div>
      </div>
    </section>

    <ExportActions
      v-if="data"
      :target="resultRef"
      :filename="`inventory-${role}`"
    />
  </div>
</template>
