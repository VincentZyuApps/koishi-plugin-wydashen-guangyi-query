<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getJson,
  iconUrl,
  LINES,
  type Line,
  type OutfitResponse,
} from './api'
import LineSwitch from './LineSwitch.vue'
import ExportActions from './ExportActions.vue'

const uuid = ref('')
const line = ref<Line>('direct')
const loading = ref(false)
const error = ref('')
const role = ref('')
const data = ref<OutfitResponse | null>(null)
const resultRef = ref<HTMLElement | null>(null)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const total = computed(() => data.value?.total ?? 0)
const uniqueTotal = computed(() => data.value?.uniqueTotal ?? 0)

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
    const res = await getJson<OutfitResponse>(
      `${LINES[line.value].base}/queryCbgInv?id=${encodeURIComponent(id)}`,
    )
    if (!res.success) {
      throw new Error(res.message || '查询失败')
    }
    role.value = res.roleId || id
    data.value = res
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

    <p v-if="error" class="query-error">{{ error }}</p>
    <p v-if="loading" class="result-sub">查询中，请稍候…</p>

    <section v-if="data" ref="resultRef" class="result-card">
      <div class="result-head">
        <div>
          <h2 class="result-title">藏宝阁衣柜</h2>
          <p class="result-sub">
            角色：{{ role }} · 线路：{{ LINES[line].label }}
          </p>
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
        <div class="outfit-grid">
          <div
            v-for="item in category.items"
            :key="item.id"
            class="outfit-item"
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
      :filename="`outfit-${role}`"
    />
  </div>
</template>

