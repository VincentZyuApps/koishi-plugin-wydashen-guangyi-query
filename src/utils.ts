import { existsSync } from 'fs'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

import { Context } from 'koishi'
import { parseString } from 'xml2js'

import { categoryOrder } from './const'
import type { Config } from './config'
import { logInfo } from './logger'
import { WingTagMap, ExtraWingTagMap } from './types'

export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf'
export type FontRenderer = 'Puppeteer' | 'Canvas'

const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts'
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts'

interface FontIntegrity {
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

const FONT_INTEGRITY: Record<string, FontIntegrity> = {
  [LXGW_WENKAI_FILE_NAME]: {
    size: 24755236,
    md5: '90e75a25cca0e8868977b880352c6a53',
    sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
    sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
    sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
  },
}

const FONT_DOWNLOAD_URLS: Record<string, { source: string; url: string }[]> = {
  [LXGW_WENKAI_FILE_NAME]: [
    { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
    { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
  ],
}

export function getFontDirByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts')
}

export function getLxgwWenKaiPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), LXGW_WENKAI_FILE_NAME)
}

// Schema 默认值拿不到 ctx.baseDir，这里只给 Koishi Console 展示一个 cwd fallback。
export const DEFAULT_LXGW_WENKAI_PATH = getLxgwWenKaiPathByBaseDir(process.cwd())

export class FontConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FontConfigError'
  }
}

export function isFontConfigError(error: unknown): error is FontConfigError {
  return error instanceof FontConfigError
}

export function createFontLoadError(
  renderer: FontRenderer,
  fontPath: string,
  reason: string,
  fontLabel = '字体',
) {
  return new FontConfigError(`❌ ${renderer} 加载${fontLabel}失败: ${fontPath}。${reason}，请检查字体配置。`)
}

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  }
}

async function verifyFontIntegrity(filePath: string, expected: FontIntegrity): Promise<boolean> {
  if (!existsSync(filePath)) return false
  const buffer = await fs.readFile(filePath)
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
}

function verifyFontBuffer(buffer: Buffer, expected: FontIntegrity): boolean {
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
}

function getCrossPlatformBasename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath
}

export function resolveRuntimeFontPath(ctx: Context, filePath: string, renderer: FontRenderer): string {
  const runtimePath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const resolvedPath = filePath === DEFAULT_LXGW_WENKAI_PATH || filePath === runtimePath
    ? runtimePath
    : filePath

  if (!resolvedPath) {
    throw new FontConfigError(`❌ ${renderer} 自定义字体路径为空。已开启自定义字体，请填写有效的字体文件绝对路径，或关闭自定义字体。`)
  }

  if (!existsSync(resolvedPath)) {
    throw createFontLoadError(renderer, resolvedPath, '文件不存在')
  }

  return resolvedPath
}

// ============================================================
// 📄🔍 XML 解析工具
// ============================================================

export const parseXmlStringAsync = promisify(parseString)

export async function parseXmlFile(filePath: string): Promise<any> {
  const xmlContent = await fs.readFile(filePath, 'utf-8')
  return parseXmlStringAsync(xmlContent)
}

export function extractSpiritNames(xmlData: any): Map<string, string> {
  const spiritNameMap = new Map<string, string>()

  if (!xmlData?.resources?.string) {
    return spiritNameMap
  }

  xmlData.resources.string.forEach((entry: any) => {
    if (entry?.$?.name?.startsWith('name_')) {
      const englishName = entry.$.name.replace('name_', '')
      const chineseName = entry._
      if (englishName && chineseName) {
        const baseEnglishName = englishName.replace(/_\d+$/, '')
        spiritNameMap.set(baseEnglishName, chineseName)
      }
    }
  })

  return spiritNameMap
}

// ============================================================
// ✨🕊️ 光翼数据处理
// ============================================================

export interface WingData {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion: number
  deposit_id: string
}

export interface WingDisplayData extends WingData {
  displayName: string
  category: string
  subCategory: string
  index: number
  isFromAPI: boolean
}

export type WingMapItem = {
  "光翼名字": string;
  "一级标签": string;
  "二级标签": string;
}

export function getWingDisplayInfo(wingName: string, wingTagMap: readonly WingMapItem[]): { displayName: string; category: string; subCategory: string; index: number } {
  const found = wingTagMap.findIndex(item => item.光翼名字 === wingName)
  if (found !== -1) {
    const item = wingTagMap[found]
    return {
      displayName: item.光翼名字,
      category: item.一级标签,
      subCategory: item.二级标签 || '',
      index: found
    }
  }
  return {
    displayName: wingName,
    category: '未知',
    subCategory: '',
    index: 9999
  }
}

export function processWingData(wingBuffs: WingData[], wingTagMap: readonly WingMapItem[]): WingDisplayData[] {
  const wingMap = new Map(wingBuffs.map(w => [w.name, w]))
  const result: WingDisplayData[] = []

  wingTagMap.forEach((mapItem, index) => {
    const wingName = mapItem.光翼名字
    const wingData = wingMap.get(wingName)
    const displayInfo = getWingDisplayInfo(wingName, wingTagMap)

    if (wingData) {
      result.push({
        ...wingData,
        ...displayInfo,
        index,
        isFromAPI: true
      })
    } else {
      result.push({
        name: wingName,
        collected: false,
        deposited: false,
        last_conversion: 0,
        deposit_id: '',
        ...displayInfo,
        index,
        isFromAPI: false
      })
    }
  })

  return result
}

export function groupWingsByCategory(wings: WingDisplayData[]): [string, WingDisplayData[]][] {
  const groupedByCategory = new Map<string, WingDisplayData[]>()

  wings.forEach(wing => {
    if (!groupedByCategory.has(wing.category)) {
      groupedByCategory.set(wing.category, [])
    }
    groupedByCategory.get(wing.category)!.push(wing)
  })

  const sortedCategories: [string, WingDisplayData[]][] = []

  for (const category of categoryOrder) {
    if (groupedByCategory.has(category)) {
      sortedCategories.push([category, groupedByCategory.get(category)!])
    }
  }

  for (const [category, categoryWings] of groupedByCategory) {
    if (!(categoryOrder as readonly string[]).includes(category)) {
      sortedCategories.push([category, categoryWings])
    }
  }

  return sortedCategories
}

export function calcWingStats(wings: WingDisplayData[]) {
  const total = wings.length
  const collected = wings.filter(w => w.collected).length
  const deposited = wings.filter(w => w.isFromAPI && w.name.startsWith('s_') && !w.collected).length
  const notRedeemed = wings.filter(w => !w.isFromAPI && w.name.startsWith('s_')).length
  return { total, collected, deposited, notRedeemed }
}

export async function ensureRuntimeFonts(ctx: Context, config: Config): Promise<void> {
  const fontDir = getFontDirByBaseDir(ctx.baseDir)
  const fontPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir)
  const expected = FONT_INTEGRITY[LXGW_WENKAI_FILE_NAME]

  logInfo(ctx, config, '', `开始检查默认字体: ${fontPath}`)
  if (await verifyFontIntegrity(fontPath, expected)) {
    logInfo(ctx, config, '', `字体文件已存在且校验通过，跳过下载: ${fontPath}`)
    return
  }

  await fs.mkdir(fontDir, { recursive: true })

  if (existsSync(fontPath)) {
    logInfo(ctx, config, `⚠️ 默认字体校验失败，将重新下载: ${fontPath}`)
  } else {
    logInfo(ctx, config, `📥 缺少默认字体，开始下载 ${LXGW_WENKAI_FILE_NAME}...`)
  }

  let lastError: unknown = null
  for (const candidate of FONT_DOWNLOAD_URLS[LXGW_WENKAI_FILE_NAME]) {
    try {
      logInfo(ctx, config, '', `下载字体中: ${LXGW_WENKAI_FILE_NAME} (${candidate.source})`)
      const response = await ctx.http.get(candidate.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      })
      const buffer = Buffer.from(response)

      if (!verifyFontBuffer(buffer, expected)) {
        throw new Error(`字体校验失败: ${LXGW_WENKAI_FILE_NAME}`)
      }

      await fs.writeFile(fontPath, buffer)

      if (!(await verifyFontIntegrity(fontPath, expected))) {
        throw new Error(`字体写入后校验失败: ${LXGW_WENKAI_FILE_NAME}`)
      }

      logInfo(ctx, config, `✅ 字体文件下载完成并校验通过: ${fontPath}`)
      return
    } catch (error) {
      lastError = error
      logInfo(ctx, config, `⚠️ ${candidate.source} 下载失败，准备尝试下一个源：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`字体文件下载失败，Gitee / GitHub 均不可用或校验失败: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

// ============================================================
// 光翼映射管理器
// ============================================================

const WING_MAP_FILE = path.resolve(__dirname, '../assets/wingTagMap.json')

export class WingMapManager {
  private wingMap: WingMapItem[] = [];
  private readonly wingMapPath: string;
  private fallbackMap: readonly WingMapItem[];
  private spiritNameMap: Map<string, string> = new Map();
  private readonly xmlPath: string;

  constructor(private ctx: Context, private wyWingMapUrl: string, private skyAppXmlPath: string, private config: Config) {
    this.wingMapPath = WING_MAP_FILE;
    this.fallbackMap = [...WingTagMap, ...ExtraWingTagMap];
    this.xmlPath = skyAppXmlPath;
  }

  async initialize(): Promise<void> {
    logInfo(this.ctx, this.config, '🚀 初始化光翼映射管理器')

    try {
      logInfo(this.ctx, this.config, '', '📖 正在加载 Sky App XML 文件')
      const xmlData = await parseXmlFile(this.xmlPath);
      this.spiritNameMap = extractSpiritNames(xmlData);
      logInfo(this.ctx, this.config, `✅ 成功加载 ${this.spiritNameMap.size} 个先祖名称映射`)
    } catch (error) {
      logInfo(this.ctx, this.config, `❌ 加载 Sky App XML 文件失败：${error instanceof Error ? error.message : String(error)}`)
    }

    try {
      await fs.access(this.wingMapPath);
      logInfo(this.ctx, this.config, '', '📂 发现本地光翼映射文件，准备加载')
      await this.loadWingMap();

      logInfo(this.ctx, this.config, '', '🔄 正在检查远程更新')
      const refreshResult = await this.refreshWingMap();

      if (refreshResult.startsWith('❌') && this.wingMap.length > 0) {
        logInfo(this.ctx, this.config, '⚠️ 远程更新失败，继续使用本地缓存')
      }
    } catch (error) {
      logInfo(this.ctx, this.config, '', '🌐 本地光翼映射文件不存在，准备远程拉取')
      await this.refreshWingMap();

      if (this.wingMap.length === 0) {
        logInfo(this.ctx, this.config, '🔄 远程获取失败，改用内置映射表')
        this.wingMap = [...this.fallbackMap];
      }
    }

    logInfo(this.ctx, this.config, `✅ 光翼映射管理器初始化完成：共加载 ${this.wingMap.length} 个光翼`)

    if (this.config.verboseConsoleLog) {
      const unknownSpirits = this.wingMap
        .filter(item => item.光翼名字.startsWith('s_'))
        .filter(item => !this.getSpiritName(item.光翼名字))
      if (unknownSpirits.length > 0) {
        logInfo(this.ctx, this.config, '', `🔍❓ 光翼映射表中发现 ${unknownSpirits.length} 个未知先祖光翼（不在 XML 映射中）`)
        unknownSpirits.forEach((item, idx) => {
          const no = idx + 1
          logInfo(this.ctx, this.config, '', `📍 .\\src\\const.ts 里 WingTagMap 的第 ${no} 个 (idx:${idx}): ${item.光翼名字} | 一级标签: ${item.一级标签} | 二级标签: ${item.二级标签}`)
        })
      } else {
        logInfo(this.ctx, this.config, '', '✅ 光翼映射表中的先祖光翼全部有名称映射')
      }
    }
  }

  private async loadWingMap(): Promise<void> {
    try {
      const data = await fs.readFile(this.wingMapPath, 'utf-8');
      const localMap = JSON.parse(data);
      if (Array.isArray(localMap) && localMap.length > 0) {
        this.wingMap = [...localMap, ...ExtraWingTagMap];
        logInfo(this.ctx, this.config, `📖 从本地文件加载成功：本地 ${localMap.length} 个，合并后 ${this.wingMap.length} 个`)
        return;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logInfo(this.ctx, this.config, `❌ 读取或解析本地光翼映射文件失败：${error instanceof Error ? error.message : String(error)}`)
      } else {
        logInfo(this.ctx, this.config, '📭 本地光翼映射文件未找到')
      }
    }

    logInfo(this.ctx, this.config, '🔄 使用内置映射表')
    this.wingMap = [...this.fallbackMap];
  }

  async refreshWingMap(): Promise<string> {
    logInfo(this.ctx, this.config, '', `🌐 正在从远程获取最新光翼映射表: ${this.wyWingMapUrl}`)
    try {
      const response = await this.ctx.http.get<WingMapItem[]>(this.wyWingMapUrl);
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid data format from remote URL.');
      }

      await fs.writeFile(this.wingMapPath, JSON.stringify(response, null, 2));
      this.wingMap = [...response, ...ExtraWingTagMap];
      logInfo(this.ctx, this.config, `✨ 光翼映射表刷新成功：远程 ${response.length} 个，合并后 ${this.wingMap.length} 个`)
      return '✅ 光翼 ID 映射表刷新成功！'
    } catch (error) {
      logInfo(this.ctx, this.config, `❌ 刷新光翼映射表失败：${error instanceof Error ? error.message : String(error)}`)
      if (this.wingMap.length === 0) {
        logInfo(this.ctx, this.config, '🔄 刷新失败，回退到内置映射表')
        this.wingMap = [...this.fallbackMap];
      }
      return `❌ 刷新失败：${error instanceof Error ? error.message : String(error)}`;
    }
  }

  getWingMap(): readonly WingMapItem[] {
    return this.wingMap;
  }

  private extractBaseSpiritName(wingName: string): string | undefined {
    if (!wingName.startsWith('s_')) {
      return undefined;
    }

    let baseName = wingName.substring(2);
    baseName = baseName.replace(/_\d+$/, '');

    return baseName;
  }

  getSpiritName(wingName: string): string | undefined {
    const baseName = this.extractBaseSpiritName(wingName);
    if (!baseName) {
      return undefined;
    }

    return this.spiritNameMap.get(baseName);
  }
}
