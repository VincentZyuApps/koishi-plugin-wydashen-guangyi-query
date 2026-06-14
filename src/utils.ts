import { Context } from 'koishi'
import fs from 'fs/promises'
import path from 'path'
import { parseString } from 'xml2js'
import { promisify } from 'util'
import { WingTagMap, ExtraWingTagMap } from './types'
import { categoryOrder } from './const'

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

  constructor(private ctx: Context, private wyWingMapUrl: string, private skyAppXmlPath: string, private verboseLog: boolean = false) {
    this.wingMapPath = WING_MAP_FILE;
    this.fallbackMap = [...WingTagMap, ...ExtraWingTagMap];
    this.xmlPath = skyAppXmlPath;
  }

  async initialize(): Promise<void> {
    this.ctx.logger.info('🚀 初始化光翼映射管理器 Initializing WingMapManager...');

    try {
      this.ctx.logger.info('📖 正在加载Sky App XML文件...');
      const xmlData = await parseXmlFile(this.xmlPath);
      this.spiritNameMap = extractSpiritNames(xmlData);
      this.ctx.logger.info(`✅ 成功加载 ${this.spiritNameMap.size} 个先祖名称映射`);
    } catch (error) {
      this.ctx.logger.error('❌ 加载Sky App XML文件失败:', error);
    }

    try {
      await fs.access(this.wingMapPath);
      this.ctx.logger.info('📂 发现本地光翼映射文件 Local wing map file found, loading...');
      await this.loadWingMap();

      this.ctx.logger.info('🔄 检查远程更新 Checking for remote updates...');
      const refreshResult = await this.refreshWingMap();

      if (refreshResult.startsWith('❌') && this.wingMap.length > 0) {
        this.ctx.logger.warn('⚠️ 远程更新失败，继续使用本地缓存 Remote update failed, using local cache');
      }
    } catch (error) {
      this.ctx.logger.info('🌐 本地光翼映射文件不存在 Local file not found, fetching from remote...');
      await this.refreshWingMap();

      if (this.wingMap.length === 0) {
        this.ctx.logger.warn('🔄 远程获取失败，使用内置映射表 Remote fetch failed, using fallback wing map');
        this.wingMap = [...this.fallbackMap];
      }
    }

    this.ctx.logger.info(`✅ 光翼映射管理器初始化完成 WingMapManager initialized! Total wings loaded: ${this.wingMap.length}`);

    if (this.verboseLog) {
      const unknownSpirits = this.wingMap
        .filter(item => item.光翼名字.startsWith('s_'))
        .filter(item => !this.getSpiritName(item.光翼名字))
      if (unknownSpirits.length > 0) {
        this.ctx.logger.warn(`🔍❓ 光翼映射表中发现 ${unknownSpirits.length} 个未知先祖光翼（不在 XML 映射中）:`)
        unknownSpirits.forEach((item, idx) => {
          const no = idx + 1
          this.ctx.logger.warn(`  - .\\src\\const.ts 里 WingTagMap 的第 ${no} 个 (idx:${idx}): ${item.光翼名字} | 一级标签: ${item.一级标签} | 二级标签: ${item.二级标签}`)
        })
      } else {
        this.ctx.logger.info(`✅ 光翼映射表中的先祖光翼全部有名称映射`)
      }
    }
  }

  private async loadWingMap(): Promise<void> {
    try {
      const data = await fs.readFile(this.wingMapPath, 'utf-8');
      const localMap = JSON.parse(data);
      if (Array.isArray(localMap) && localMap.length > 0) {
        this.wingMap = [...localMap, ...ExtraWingTagMap];
        this.ctx.logger.info(`📖 从本地文件加载成功 Loaded from local: ${localMap.length} wings, total with extra: ${this.wingMap.length}`);
        return;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.ctx.logger.error('❌ 读取或解析本地光翼映射文件失败 Failed to read or parse local wing map file', error);
      } else {
        this.ctx.logger.warn('📭 本地光翼映射文件未找到 Local wing map file not found');
      }
    }

    this.ctx.logger.warn('🔄 使用内置映射表 Using fallback wing map');
    this.wingMap = [...this.fallbackMap];
  }

  async refreshWingMap(): Promise<string> {
    this.ctx.logger.info(`🌐 正在从远程获取最新光翼映射表 Fetching from: ${this.wyWingMapUrl}`);
    try {
      const response = await this.ctx.http.get<WingMapItem[]>(this.wyWingMapUrl);
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid data format from remote URL.');
      }

      await fs.writeFile(this.wingMapPath, JSON.stringify(response, null, 2));
      this.wingMap = [...response, ...ExtraWingTagMap];
      this.ctx.logger.info(`✨ 光翼映射表刷新成功 Wing map refreshed! Remote: ${response.length}, total with extra: ${this.wingMap.length}`);
      return '✅ 光翼ID映射表刷新成功！Wing map refreshed successfully!';
    } catch (error) {
      this.ctx.logger.error('❌ 刷新光翼映射表失败 Failed to refresh wing map:', error);
      if (this.wingMap.length === 0) {
        this.ctx.logger.warn('🔄 刷新失败，回退到内置映射表 Refresh failed, falling back to default map');
        this.wingMap = [...this.fallbackMap];
      }
      return `❌ 刷新失败 Refresh failed: ${error.message}`;
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
