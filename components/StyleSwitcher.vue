<script setup lang="ts">
import type { WingStyle } from '../lib/wing'

defineProps<{ modelValue: WingStyle }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: WingStyle): void }>()

const opts: { key: WingStyle; label: string }[] = [
  { key: 'vitepress', label: '🪶 VitePress' },
  { key: 'pptr', label: '🎴 pptr' },
  { key: 'apple', label: '🍎 Apple' },
]
</script>

<template>
  <div class="style-switcher">
    <button
      v-for="o in opts"
      :key="o.key"
      type="button"
      :class="{ active: modelValue === o.key }"
      @click="emit('update:modelValue', o.key)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
