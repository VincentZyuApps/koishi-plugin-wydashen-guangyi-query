<script setup lang="ts">
import { ref } from 'vue'
import { toPng } from 'html-to-image'

const props = defineProps<{
  target: HTMLElement | null
  filename: string
}>()

const busy = ref(false)
const error = ref('')

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/data:([^;]+)/)?.[1] || 'image/png'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function render(): Promise<Blob> {
  if (!props.target) throw new Error('没有可导出的结果')
  const dataUrl = await toPng(props.target, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor:
      getComputedStyle(document.body).backgroundColor || '#ffffff',
  })
  if (!dataUrl.startsWith('data:image/')) throw new Error('渲染结果不是图片')
  return dataUrlToBlob(dataUrl)
}

async function copy() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') {
      throw new Error('当前浏览器不支持复制图片，请使用下载按钮')
    }
    const blob = await render()
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ])
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = `复制失败：${message}`
  } finally {
    busy.value = false
  }
}

async function download() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const blob = await render()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.filename}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = `下载失败：${message}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="export-wrap">
    <div class="export-actions">
      <button class="primary" :disabled="busy || !target" @click="copy">
        复制图片
      </button>
      <button :disabled="busy || !target" @click="download">下载图片</button>
    </div>
    <p v-if="error" class="export-error">{{ error }}</p>
  </div>
</template>
