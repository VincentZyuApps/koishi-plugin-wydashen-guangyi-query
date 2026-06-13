import { createCanvas, GlobalFonts, SKRSContext2D, Canvas } from '@napi-rs/canvas'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { processWingData, groupWingsByCategory, calcWingStats, WingDisplayData, WingData, WingMapItem } from '../utils'

export interface CanvasRenderOptions {
  darkMode?: boolean
  width?: number
  scale?: number
  separateByCategory?: boolean
  showPortalIcons?: boolean
  portalIconsPath?: string
  fontPath?: string
  emojiFontPath?: string
  imageType?: 'png' | 'jpeg'
  quality?: number
}

const themes = {
  light: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    surfaceAlt: '#f0f2f5',
    text: '#1a1a1a',
    textSecondary: '#5a5a5a',
    textMuted: '#8a8a8a',
    title: '#4a5dc9',
    border: '#e0e3e8',
    shadow: 'rgba(0, 0, 0, 0.06)',
    collected: { bg: '#e8f4ff', border: '#409eff', text: '#1a6bcc' },
    deposited: { bg: '#fff4e6', border: '#e6a23c', text: '#b06b18' },
    notRedeemed: { bg: '#f2f2f2', border: '#909399', text: '#606266' },
    uncollected: { bg: '#ffffff', border: '#dcdfe6', text: '#909399' },
    categoryHeader: '#eef1f6',
  },
  dark: {
    bg: '#141417',
    surface: '#1e1e22',
    surfaceAlt: '#252529',
    text: '#f0f0f5',
    textSecondary: '#b4b4be',
    textMuted: '#787882',
    title: '#64b5ff',
    border: '#2f2f35',
    shadow: 'rgba(0, 0, 0, 0.25)',
    collected: { bg: '#1a2f4a', border: '#64b5ff', text: '#9bcfff' },
    deposited: { bg: '#3d2a18', border: '#ffb74d', text: '#ffcc80' },
    notRedeemed: { bg: '#2a2a2e', border: '#8c8c96', text: '#9e9ea8' },
    uncollected: { bg: '#1e1e22', border: '#3c3c41', text: '#6a6a72' },
    categoryHeader: '#1f2430',
  },
}

type Theme = typeof themes.light

const categoryColors: Record<string, string> = {
  '遇境': '#a0cfff',
  '云巢': '#85ecef',
  '晨岛': '#fad390',
  '云野': '#b9f6ca',
  '雨林': '#80deea',
  '霞谷': '#ffcc80',
  '暮土': '#d1c4e9',
  '禁阁': '#9fa8da',
  '暴风眼': '#cfd8dc',
  '普通永久': '#90caf9',
  '复刻永久': '#ffe0b2',
  '破晓季': '#f48fb1',
}

const darkCategoryColors: Record<string, string> = {
  '遇境': '#5a7fa8',
  '云巢': '#4a8a8a',
  '晨岛': '#8a6a40',
  '云野': '#4a7a56',
  '雨林': '#3a7a84',
  '霞谷': '#8a5a30',
  '暮土': '#6a5a7a',
  '禁阁': '#5a6aa8',
  '暴风眼': '#5a5a60',
  '普通永久': '#3a6a8a',
  '复刻永久': '#8a6a46',
  '破晓季': '#7a3a50',
}

const portalIconMap: Record<string, string> = {
  '晨岛': 'chendao.png',
  '云野': 'yunye.png',
  '雨林': 'yulin.png',
  '霞谷': 'xiagu.png',
  '暮土': 'mutu.png',
  '禁阁': 'jinge.png',
}

const statusConfig: Record<string, { emoji: string; label: string; symbol: string }> = {
  'collected': { emoji: '✨', label: '已收集', symbol: '✓' },
  'deposited': { emoji: '📦', label: '已存放', symbol: '◐' },
  'not-redeemed': { emoji: '🔒', label: '未兑换', symbol: '⊗' },
  'uncollected': { emoji: '❓', label: '未收集', symbol: '✗' },
}

function getStatus(wing: WingDisplayData): keyof typeof statusConfig {
  const isSpirit = wing.name.startsWith('s_')
  if (wing.collected) return 'collected'
  if (wing.isFromAPI && isSpirit) return 'deposited'
  if (!wing.isFromAPI && isSpirit) return 'not-redeemed'
  return 'uncollected'
}

let fontRegistered = false

function registerFonts(fontPath: string, emojiFontPath?: string) {
  if (fontRegistered) return
  if (existsSync(fontPath)) {
    try {
      GlobalFonts.registerFromPath(fontPath, 'LXGWWenKai')
    } catch (e) {
      console.warn('[canvas] Failed to register font:', e.message)
    }
  }
  if (emojiFontPath && existsSync(emojiFontPath)) {
    try {
      GlobalFonts.registerFromPath(emojiFontPath, 'Segoe UI Emoji')
    } catch (e) {
      console.warn('[canvas] Failed to register emoji font:', e.message)
    }
  }
  fontRegistered = true
}

function setFont(ctx: SKRSContext2D, size: number, weight: number, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight === 900 ? '900' : weight === 700 ? '700' : '400'} ${size}px LXGWWenKai, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
}

function measureText(ctx: SKRSContext2D, text: string) {
  return ctx.measureText(text).width
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function fillRoundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function strokeRoundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  roundRect(ctx, x, y, w, h, r)
  ctx.stroke()
}

function drawText(ctx: SKRSContext2D, text: string, x: number, y: number, color: string, size: number, weight: number, align: CanvasTextAlign = 'left', baseline: CanvasTextBaseline = 'alphabetic', italic = false) {
  setFont(ctx, size, weight, italic)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(text, x, y)
}

function drawShadowRoundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke: string, shadowColor: string) {
  ctx.save()
  ctx.shadowColor = shadowColor
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2
  fillRoundRect(ctx, x, y, w, h, r, fill)
  ctx.restore()
  strokeRoundRect(ctx, x, y, w, h, r, stroke, 1.5)
}

function drawCard(ctx: SKRSContext2D, wing: WingDisplayData, t: Theme, dark: boolean, x: number, y: number, w: number, h: number, getSpiritName: (name: string) => string | undefined) {
  const status = getStatus(wing)
  const cfg = statusConfig[status]
  const style = status === 'collected' ? t.collected : status === 'deposited' ? t.deposited : status === 'not-redeemed' ? t.notRedeemed : t.uncollected
  const opacity = status === 'collected' ? 1 : status === 'deposited' ? 0.9 : status === 'not-redeemed' ? 0.85 : 0.75

  ctx.save()
  ctx.globalAlpha = opacity
  drawShadowRoundRect(ctx, x, y, w, h, 10, style.bg, style.border, t.shadow)
  ctx.restore()

  const cx = x + w / 2
  const padding = 8

  // 1. Status badge
  const badgeText = `${cfg.emoji} ${cfg.label} ${cfg.symbol}`
  setFont(ctx, 16, 700)
  const badgeW = measureText(ctx, badgeText) + 18
  const badgeH = 24
  const badgeX = cx - badgeW / 2
  const badgeY = y + padding
  fillRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 9, hexToRgba(style.text, 0.08))
  drawText(ctx, badgeText, cx, badgeY + 18, style.text, 16, 700, 'center')

  // 2. Wing name (English)
  drawText(ctx, wing.name, cx, y + 48, t.text, 15, 600, 'center')

  // 3. Spirit / map label
  const isSpirit = wing.name.startsWith('s_')
  const spiritName = getSpiritName(wing.name)
  const label = isSpirit ? (spiritName ? `【${spiritName}】` : '【暂时不知道】') : '【地图光翼】'
  drawText(ctx, label, cx, y + 70, t.textSecondary, 15, 700, 'center', 'alphabetic', true)

  // 4. Category + subcategory (same line)
  const catColor = dark ? darkCategoryColors[wing.category] || t.textMuted : categoryColors[wing.category] || t.textMuted
  const subText = wing.subCategory ? ` · ${wing.subCategory}` : ''
  drawText(ctx, `${wing.category}${subText}`, cx, y + h - 16, catColor, 14, 700, 'center')
}

function drawStatsBar(ctx: SKRSContext2D, t: Theme, x: number, y: number, w: number, stats: { label: string; value: number }[]) {
  const gap = 10
  const itemW = (w - gap * (stats.length - 1)) / stats.length

  stats.forEach((s, i) => {
    const ix = x + i * (itemW + gap)
    drawShadowRoundRect(ctx, ix, y, itemW, 70, 10, t.surface, t.border, t.shadow)

    drawText(ctx, s.label, ix + itemW / 2, y + 26, t.textSecondary, 14, 600, 'center')
    drawText(ctx, String(s.value), ix + itemW / 2, y + 54, t.title, 28, 800, 'center')
  })
}

function drawHeader(ctx: SKRSContext2D, t: Theme, x: number, y: number, w: number, roleId: string, stats: { label: string; value: number }[]) {
  const h = 170
  drawShadowRoundRect(ctx, x, y, w, h, 14, t.surface, t.border, t.shadow)

  drawText(ctx, '✨ 网易国服sky光遇光翼查询', x + 16, y + 36, t.title, 26, 700)
  drawStatsBar(ctx, t, x + 16, y + 52, w - 32, stats)
  drawText(ctx, `角色ID: ${roleId}`, x + 16, y + h - 12, t.textSecondary, 13, 700)

  return h
}

function drawCategoryHeader(ctx: SKRSContext2D, t: Theme, dark: boolean, x: number, y: number, w: number, category: string, count: number, collected: number, portalIcon?: Buffer) {
  const h = 42
  fillRoundRect(ctx, x, y, w, h, 10, t.categoryHeader)
  strokeRoundRect(ctx, x, y, w, h, 10, t.border, 1)

  let iconX = x + 14
  if (portalIcon) {
    try {
      const img = new (require('@napi-rs/canvas').Image)()
      img.src = portalIcon
      const iconH = 22
      const iconW = (img.width / img.height) * iconH
      ctx.drawImage(img, iconX, y + (h - iconH) / 2, iconW, iconH)
      iconX += iconW + 8
    } catch {
      // ignore
    }
  }

  const catColor = dark ? darkCategoryColors[category] || t.title : categoryColors[category] || t.title
  drawText(ctx, `🏷️ ${category}`, iconX, y + 27, catColor, 18, 900)

  const pct = ((collected / count) * 100).toFixed(1)
  drawText(ctx, `总数: ${count} | 已收集: ${collected} | 进度: ${pct}%`, x + w - 14, y + 27, t.textSecondary, 12, 600, 'right')

  return h
}

function drawCardGrid(ctx: SKRSContext2D, wings: WingDisplayData[], t: Theme, dark: boolean, x: number, y: number, w: number, getSpiritName: (name: string) => string | undefined) {
  const cardsPerRow = 5
  const gapX = 8
  const gapY = 8
  const cardW = (w - (cardsPerRow - 1) * gapX) / cardsPerRow
  const cardH = 120

  wings.forEach((wing, i) => {
    const row = Math.floor(i / cardsPerRow)
    const col = i % cardsPerRow
    const cx = x + col * (cardW + gapX)
    const cy = y + row * (cardH + gapY)
    drawCard(ctx, wing, t, dark, cx, cy, cardW, cardH, getSpiritName)
  })

  return Math.ceil(wings.length / cardsPerRow) * (cardH + gapY) - gapY
}

function drawSection(ctx: SKRSContext2D, t: Theme, dark: boolean, x: number, y: number, w: number, category: string, wings: WingDisplayData[], showPortalIcons: boolean, portalIconsPath: string, getSpiritName: (name: string) => string | undefined) {
  const collected = wings.filter(w => w.collected).length
  let portalIcon: Buffer | undefined

  if (showPortalIcons && portalIconsPath && portalIconMap[category]) {
    const iconPath = resolve(portalIconsPath, portalIconMap[category])
    if (existsSync(iconPath)) {
      try {
        portalIcon = readFileSync(iconPath)
      } catch {
        portalIcon = undefined
      }
    }
  }

  const headerH = drawCategoryHeader(ctx, t, dark, x, y, w, category, wings.length, collected, portalIcon)
  const gridH = drawCardGrid(ctx, wings, t, dark, x, y + headerH + 10, w, getSpiritName)

  return headerH + 10 + gridH
}

export async function renderWingCanvas(
  roleId: string,
  wingBuffs: WingData[],
  wingTagMap: readonly WingMapItem[],
  getSpiritName: (name: string) => string | undefined,
  options: CanvasRenderOptions = {}
): Promise<Buffer> {
  const {
    darkMode = true,
    width = 910,
    scale = 2,
    separateByCategory = true,
    showPortalIcons = true,
    portalIconsPath = resolve(__dirname, '../../assets/portal'),
    fontPath = resolve(__dirname, '../../assets/LXGWWenKaiMono-Regular.ttf'),
    emojiFontPath = 'C:\\Windows\\Fonts\\seguiemj.ttf',
    imageType = 'png',
    quality = 90,
  } = options

  registerFonts(fontPath, emojiFontPath)

  const t = darkMode ? themes.dark : themes.light
  const processedWings = processWingData(wingBuffs, wingTagMap)
  const stats = calcWingStats(processedWings)

  const padding = 20
  const innerW = width - padding * 2
  const headerH = 170
  const headerGap = 16

  let contentH = 0
  const categorySections: { category: string; wings: WingDisplayData[] }[] = []

  if (separateByCategory) {
    const grouped = groupWingsByCategory(processedWings)
    for (const [category, wings] of grouped) {
      const sectionH = 42 + 10 + (Math.ceil(wings.length / 5) * (120 + 8) - 8)
      categorySections.push({ category, wings })
      contentH += sectionH + 16
    }
    contentH -= 16
  } else {
    const gridH = Math.ceil(processedWings.length / 5) * (120 + 8) - 8
    categorySections.push({ category: '', wings: processedWings })
    contentH += gridH
  }

  const height = padding + headerH + headerGap + contentH + padding

  const canvas: Canvas = createCanvas(Math.round(width * scale), Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Background
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, width, height)

  // Header
  drawHeader(ctx, t, padding, padding, innerW, roleId, [
    { label: '总光翼数', value: stats.total },
    { label: '已收集', value: stats.collected },
    { label: '已存放', value: stats.deposited },
    { label: '未兑换', value: stats.notRedeemed },
  ])

  // Content
  let currentY = padding + headerH + headerGap

  if (separateByCategory) {
    for (const section of categorySections) {
      const h = drawSection(ctx, t, darkMode, padding, currentY, innerW, section.category, section.wings, showPortalIcons, portalIconsPath, getSpiritName)
      currentY += h + 16
    }
  } else {
    drawShadowRoundRect(ctx, padding, currentY, innerW, contentH + 20, 14, t.surface, t.border, t.shadow)
    drawCardGrid(ctx, processedWings, t, darkMode, padding + 10, currentY + 10, innerW - 20, getSpiritName)
  }

  if (imageType === 'jpeg') {
    return canvas.toBuffer('image/jpeg', quality)
  }
  return canvas.toBuffer('image/png')
}
