<script setup lang="ts">
import type { CategoryView } from '../../lib/wing'

defineProps<{
  groups: CategoryView[]
  assetUrl: (p: string) => string
}>()
</script>

<template>
  <div class="ap-categories">
    <section
      v-for="g in groups"
      :key="g.category"
      class="ap-cat"
      :style="{ '--cat-c1': g.theme[0], '--cat-c2': g.theme[1] }"
    >
      <header class="ap-head">
        <img
          v-if="g.portalFile"
          class="ap-portal"
          :src="assetUrl('assets/image/portal/' + g.portalFile)"
          :alt="g.category"
          loading="lazy"
          crossOrigin="anonymous"
        />
        <div class="ap-headtext">
          <h3 class="ap-title">{{ g.category }}</h3>
          <p class="ap-sub">
            {{ g.collected }}/{{ g.total }} · {{ g.progress.toFixed(0) }}%
          </p>
        </div>
        <div class="ap-bar">
          <span :style="{ width: g.progress + '%' }"></span>
        </div>
      </header>
      <div class="ap-grid">
        <div
          v-for="(w, i) in g.items"
          :key="w.name + i"
          class="ap-card"
          :class="w.status"
        >
          <span class="ap-dot"></span>
          <div class="ap-info">
            <div class="ap-name">{{ w.name }}</div>
            <div class="ap-meta">
              {{ w.statusText }} · {{ w.natureText
              }}<span v-if="w.subCategory"> · {{ w.subCategory }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
