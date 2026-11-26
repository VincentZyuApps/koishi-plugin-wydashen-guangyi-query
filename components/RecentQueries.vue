<script setup lang="ts">
import { formatSavedAt } from '../lib/recent'

defineProps<{
  items: { id: string; title: string; meta: string; savedAt: number }[]
}>()

const emit = defineEmits<{
  (e: 'pick', id: string): void
  (e: 'remove', id: string): void
  (e: 'clear'): void
}>()
</script>

<template>
  <div class="recent-bar">
    <div class="recent-head">
      <span class="recent-label">🕘 最近查询</span>
      <button class="recent-clear" @click="emit('clear')">清空</button>
    </div>
    <div class="recent-chips">
      <span
        v-for="it in items"
        :key="it.id"
        class="recent-chip"
        @click="emit('pick', it.id)"
      >
        <span class="rc-id">{{ it.title }}</span>
        <span class="rc-meta">{{ it.meta }}</span>
        <span class="rc-time">{{ formatSavedAt(it.savedAt) }}</span>
        <button class="rm" @click.stop="emit('remove', it.id)">×</button>
      </span>
    </div>
  </div>
</template>
