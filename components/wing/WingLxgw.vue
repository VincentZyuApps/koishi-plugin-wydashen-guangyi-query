<script setup lang="ts">
import type { CategoryView, WingStatus } from '../../lib/wing'

defineProps<{
  groups: CategoryView[]
  assetUrl: (p: string) => string
}>()

function statusIcon(s: WingStatus): string {
  return s === 'collected'
    ? '✨'
    : s === 'deposited'
      ? '📦'
      : s === 'notRedeemed'
        ? '🔒'
        : '❓'
}
function statusMark(s: WingStatus): string {
  return s === 'collected'
    ? '✓'
    : s === 'deposited'
      ? '◐'
      : s === 'notRedeemed'
        ? '⊗'
        : '✗'
}
</script>

<template>
  <div class="pp-categories">
    <div v-for="g in groups" :key="g.category" class="pp-cat">
      <div class="pp-cat-head">
        <span class="pp-tag">🏷️</span>
        <span class="pp-cat-title">{{ g.category }}</span>
        <img
          v-if="g.portalFile"
          class="pp-portal"
          :src="assetUrl('assets/image/portal/' + g.portalFile)"
          :alt="g.category"
          loading="lazy"
          crossOrigin="anonymous"
        />
        <span class="pp-cat-stats">
          总数: {{ g.total }} | 已收集: {{ g.collected }} | 进度:
          {{ g.progress.toFixed(1) }}%
        </span>
      </div>
      <div class="pp-grid">
        <div
          v-for="(w, i) in g.items"
          :key="w.name + i"
          class="pp-card"
          :class="w.status"
        >
          <div class="pp-badge">
            <span class="pp-ico">{{ statusIcon(w.status) }}</span>
            <span class="pp-status-text">{{ w.statusText }}</span>
            <span class="pp-check">{{ statusMark(w.status) }}</span>
          </div>
          <div class="pp-name">{{ w.name }}</div>
          <div class="pp-nature">【{{ w.natureText }}】</div>
          <div class="pp-cat2">
            {{ g.category }}<span v-if="w.subCategory" class="pp-sub">（{{ w.subCategory }}）</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
