import { resolve } from 'path'
import { readFileSync } from 'fs'

// ============================================================
// 📦📋 包信息
// ============================================================

export const pkg: Record<string, any> = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

// ============================================================
// 🖼️🎨 图片格式与风格
// ============================================================

//图片风格
export const IMAGE_STYLES = {
  THICK_WHITE_BACKGROUND: '厚实白色背景',
  SEMI_TRANSPARENT_FROSTED_GLASS: '半透明磨砂玻璃',
} as const;

//图片格式
export const IMAGE_TYPES = {
  PNG: 'png',
  JPEG: 'jpeg',
  WEBP: 'webp',
} as const;

export type ImageType = typeof IMAGE_TYPES[keyof typeof IMAGE_TYPES];

// ============================================================
// 🗺️📌 光翼映射相关
// ============================================================

export type WingMapItem = {
  "光翼名字": string;
  "一级标签": string;
  "二级标签": string;
};

export { WingTagMap, ExtraWingTagMap } from './const'

