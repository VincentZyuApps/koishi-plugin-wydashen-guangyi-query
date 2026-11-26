<script setup lang="ts">
import type { CategoryView } from '../../lib/wing'

defineProps<{
  groups: CategoryView[]
  assetUrl: (p: string) => string
}>()
</script>

<template>
  <div class="wp-categories">
    <section
      v-for="g in groups"
      :key="g.category"
      class="wp-cat"
      :style="{ '--cat-c1': g.theme[0], '--cat-c2': g.theme[1] }"
    >
      <div class="wp-cat-head">
        <span class="wp-cat-title">{{ g.categoryEmoji }} {{ g.category }}</span>
        <img
          v-if="g.portalFile"
          class="wp-portal"
          :src="assetUrl('assets/image/portal/' + g.portalFile)"
          :alt="g.category"
          loading="lazy"
          crossOrigin="anonymous"
        />
        <span class="wp-cat-stats">
          总数 {{ g.total }} · 已收集 {{ g.collected }} · 进度
          {{ g.progress.toFixed(1) }}%
        </span>
      </div>
      <div class="wp-grid">
        <div
          v-for="(w, i) in g.items"
          :key="w.name + i"
          class="wp-card"
          :class="w.status"
        >
          <div class="wp-status">{{ w.statusText }}</div>
          <div class="wp-name">{{ w.name }}</div>
          <div class="wp-nature">{{ w.natureText }}</div>
          <div v-if="w.subCategory" class="wp-sub">{{ w.subCategory }}</div>
        </div>
      </div>
    </section>
  </div>
</template>
