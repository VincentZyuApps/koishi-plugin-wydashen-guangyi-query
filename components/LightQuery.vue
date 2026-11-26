<script setup lang="ts">
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { getJson, LINES, type Line, type LightResponse } from './api'
import {
  buildCategoryView,
  calcWingStats,
  groupWingsByCategory,
  processWingData,
  type CategoryView,
  type WingData,
  type WingDisplayData,
  type WingStyle,
} from '../lib/wing'
import { assetUrl, getWingData, type WingDataResult } from '../lib/wingData'
import LineSwitch from './LineSwitch.vue'
import ExportActions from './ExportActions.vue'
import StyleSwitcher from './StyleSwitcher.vue'
import WingVitepress from './wing/WingVitepress.vue'
import WingPptr from './wing/WingPptr.vue'
import WingApple from './wing/WingApple.vue'

const roleId = ref('')
const line = ref<Line>('direct')
const loading = ref(false)
const error = ref('')
const role = ref('')
const apiWings = ref<WingData[]>([])
const resultRef = ref<HTMLElement | null>(null)

const wingData = ref<WingDataResult | null>(null)
const dataLoading = ref(true)
const dataDegraded = ref(false)

const STYLE_KEY = 'wgd:style'
const style = ref<WingStyle>(
  (localStorage.getItem(STYLE_KEY) as WingStyle) || 'vitepress',
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
    style.value === 'pptr'
      ? WingPptr
      : style.value === 'apple'
        ? WingApple
        : WingVitepress,
  ),
)

onMounted(async () => {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message.toLowerCase().includes('abort')
      ? '请求超时，请稍后重试'
      : `查询失败：${message}`
  } finally {
    loading.value = false
  }
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
          </p>
        </div>
        <StyleSwitcher v-model="style" />
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
