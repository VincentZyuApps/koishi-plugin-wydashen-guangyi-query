<script setup lang="ts">
import type { Line } from './api'

defineProps<{ modelValue: Line }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Line): void }>()
</script>

<template>
  <div class="line-switch">
    <label
      :class="{ active: modelValue === 'direct' }"
      @click="emit('update:modelValue', 'direct')"
    >
      国内直连
    </label>
    <label
      :class="{ active: modelValue === 'cf' }"
      @click="emit('update:modelValue', 'cf')"
    >
      CF 线路
    </label>
  </div>
</template>

