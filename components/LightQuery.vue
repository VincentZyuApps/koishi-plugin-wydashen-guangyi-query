<script setup lang="ts">
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { getJson, LINES, type Line, type LightResponse } from './api'
import {
  assetUrl,
  buildCategoryView,
  calcWingStats,
  getWingData,
  groupWingsByCategory,
  processWingData,
  type CategoryView,
  type WingData,
  type WingDataResult,
  type WingDisplayData,
  type WingStyle,
} from '../lib/wing'
import {
  clearRecent,
  loadRecent,
  pushRecent,
  removeRecent,
} from '../lib/recent'
import LineSwitch from './LineSwitch.vue'
import ExportActions from './ExportActions.vue'
import StyleSwitcher from './StyleSwitcher.vue'
import RecentQueries from './RecentQueries.vue'
import WingVitepress from './wing/WingVitepress.vue'
import WingLxgw from './wing/WingLxgw.vue'
import WingApple from './wing/WingApple.vue'

interface RecentLightEntry {
  id: string
  line: Line
  savedAt: number
  total: number
  collected: number
  wings: WingData[]
}

const RECENT_KEY = 'wgd:recent:light:v1'

const roleId = ref('')
const line = ref<Line>('direct')
const loading = ref(false)
const error = ref('')
const role = ref('')
const apiWings = ref<WingData[]>([])
const resultRef = ref<HTMLElement | null>(null)
const recent = ref<RecentLightEntry[]>([])
const fromCache = ref(false)

const wingData = ref<WingDataResult | null>(null)
const dataLoading = ref(true)
const dataDegraded = ref(false)

const STYLE_KEY = 'wgd:style'
const savedStyle = localStorage.getItem(STYLE_KEY) as WingStyle | null
const style = ref<WingStyle>(
  savedStyle === 'pptr' ? 'lxgw' : savedStyle || 'vitepress',
)
watch(style, (v) => {
  try {
    localStorage.setItem(STYLE_KEY, v)
  } catch {
    /* ignore */
  }
})

const styleComp = computed(() =>
  markRaw(
    style.value === 'lxgw'
      ? WingLxgw
      : style.value === 'apple'
        ? WingApple
        : WingVitepress,
  ),
)

onMounted(async () => {
  recent.value = loadRecent<RecentLightEntry>(RECENT_KEY)
  try {
    wingData.value = await getWingData()
    dataDegraded.value = wingData.value.degraded
  } catch {
    dataDegraded.value = true
  } finally {
    dataLoading.value = false
  }
})

const useFullMap = computed(
  () => !!wingData.value && !dataDegraded.value,
)

const processedWings = computed<WingDisplayData[]>(() => {
  if (!wingData.value) return []
  if (useFullMap.value) {
    return processWingData(apiWings.value, wingData.value.fullMap)
  }
  return apiWings.value.map((w, i) => ({
    ...w,
    displayName: w.name,
    category: '未分类',
    subCategory: '',
    index: i,
    isFromAPI: true,
  }))
})

const viewGroups = computed<CategoryView[]>(() => {
  if (!wingData.value) return []
  return buildCategoryView(
    groupWingsByCategory(processedWings.value),
    wingData.value.spiritMap,
  )
})

const stats = computed(() => {
  if (wingData.value && useFullMap.value) return calcWingStats(processedWings.value)
  const total = processedWings.value.length
  const collected = processedWings.value.filter((w) => w.collected).length
  return { total, collected, deposited: 0, notRedeemed: 0 }
})

const hasResult = computed(() => apiWings.value.length > 0)

const recentItems = computed(() =>
  recent.value.map((e) => ({
    id: e.id,
    title: e.id,
    meta: `已收集 ${e.collected}/${e.total}`,
    savedAt: e.savedAt,
  })),
)

async function query() {
  const id = roleId.value.trim()
  error.value = ''
  apiWings.value = []
  role.value = ''
  if (!/^\d{6,12}$/.test(id)) {
    error.value = '请输入正确的角色短 ID（6~12 位数字）'
    return
  }
  loading.value = true
  try {
    const res = await getJson<LightResponse>(
      `${LINES[line.value].base}/queryGuangyi?id=${encodeURIComponent(id)}`,
    )
    if (!res.success) {
      throw new Error(res.error?.message || res.result || '查询失败')
    }
    const inner = JSON.parse(res.data?.result || '{}')
    if (!Array.isArray(inner.wing_buffs)) {
      throw new Error('返回数据缺少 wing_buffs')
    }
    role.value = res.roleId || id
    apiWings.value = inner.wing_buffs as WingData[]
    fromCache.value = false
    const collected = apiWings.value.filter((w) => w.collected).length
    recent.value = pushRecent<RecentLightEntry>(RECENT_KEY, recent.value, {
      id: role.value,
      line: line.value,
      savedAt: Date.now(),
      total: apiWings.value.length,
      collected,
      wings: apiWings.value,
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
  roleId.value = entry.id
  role.value = entry.id
  line.value = entry.line
  apiWings.value = entry.wings
  error.value = ''
  fromCache.value = true
}

function refresh() {
  if (!role.value) return
  roleId.value = role.value
  fromCache.value = false
  query()
}

function onRemoveRecent(id: string) {
  recent.value = removeRecent<RecentLightEntry>(RECENT_KEY, recent.value, id)
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
        v-model="roleId"
        type="text"
        placeholder="输入角色短 ID，例如 380594330"
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

    <p v-if="dataLoading" class="result-sub">⏳ 正在加载光翼映射表…</p>
    <p v-else-if="dataDegraded" class="query-error">
      ⚠️ 光翼映射表加载失败，当前仅显示已收集项，分类/季节/先祖名暂不可用。
    </p>

    <p v-if="error" class="query-error">{{ error }}</p>
    <p v-if="loading" class="result-sub">查询中，请稍候…</p>

    <section
      v-if="hasResult"
      ref="resultRef"
      class="result-card"
      :class="`wing-style-${style}`"
    >
      <div class="result-head">
        <div>
          <h2 class="result-title">光翼情况</h2>
          <p class="result-sub">
            角色：{{ role }} · 线路：{{ LINES[line].label }}
            <span v-if="fromCache"> · 来自缓存</span>
          </p>
        </div>
        <div class="result-actions">
          <button v-if="fromCache" class="refresh-btn" @click="refresh">
            🔄 刷新
          </button>
          <StyleSwitcher v-model="style" />
        </div>
      </div>

      <div class="result-stats">
        <div class="stat"><b>{{ stats.total }}</b><span>总数</span></div>
        <div class="stat"><b>{{ stats.collected }}</b><span>已收集</span></div>
        <div class="stat"><b>{{ stats.deposited }}</b><span>已存放</span></div>
        <div class="stat"><b>{{ stats.notRedeemed }}</b><span>未兑换</span></div>
      </div>

      <component :is="styleComp" :groups="viewGroups" :asset-url="assetUrl" />
    </section>

    <ExportActions
      v-if="hasResult"
      :target="resultRef"
      :filename="`light-${role}`"
    />
  </div>
</template>
