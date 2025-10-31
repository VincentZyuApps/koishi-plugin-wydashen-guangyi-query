import { Context } from 'koishi'
import fs from 'fs/promises'
import path from 'path'
import { WingTagMap, ExtraWingTagMap } from './types'
import { parseXmlFile, extractSpiritNames } from './utils/xml-parser'

export type WingMapItem = {
  "光翼名字": string;
  "一级标签": string;
  "二级标签": string;
};

const WING_MAP_FILE = 'wingTagMap.json'

export class WingMapManager {
  private wingMap: WingMapItem[] = [];
  private readonly wingMapPath: string;
  private fallbackMap: readonly WingMapItem[];
  private spiritNameMap: Map<string, string> = new Map();
  private readonly xmlPath: string;

  constructor(private ctx: Context, private wyWingMapUrl: string, private skyAppXmlPath: string) {
    this.wingMapPath = path.resolve(__dirname, WING_MAP_FILE);
    // Combine default and extra maps for the fallback
    this.fallbackMap = [...WingTagMap, ...ExtraWingTagMap];
    this.xmlPath = skyAppXmlPath;
  }

  async initialize(): Promise<void> {
    this.ctx.logger.info('🚀 初始化光翼映射管理器 Initializing WingMapManager...');
    
    // 先加载XML中的先祖名称映射
    try {
      this.ctx.logger.info('📖 正在加载Sky App XML文件...');
      const xmlData = await parseXmlFile(this.xmlPath);
      this.spiritNameMap = extractSpiritNames(xmlData);
      this.ctx.logger.info(`✅ 成功加载 ${this.spiritNameMap.size} 个先祖名称映射`);
    } catch (error) {
      this.ctx.logger.error('❌ 加载Sky App XML文件失败:', error);
    }
    
    // 检查本地文件是否存在
    try {
      await fs.access(this.wingMapPath);
      // 文件存在，加载本地数据
      this.ctx.logger.info('📂 发现本地光翼映射文件 Local wing map file found, loading...');
      await this.loadWingMap();
      
      // 如果加载后仍然为空（文件损坏或格式错误），则尝试刷新
      if (this.wingMap.length === 0) {
        this.ctx.logger.warn('⚠️ 本地光翼映射文件无效 Local file invalid, refreshing from remote...');
        await this.refreshWingMap();
      }
    } catch (error) {
      // 文件不存在，直接从远程获取
      this.ctx.logger.info('🌐 本地光翼映射文件不存在 Local file not found, fetching from remote...');
      await this.refreshWingMap();
      
      // 如果刷新失败，使用 fallback
      if (this.wingMap.length === 0) {
        this.ctx.logger.warn('🔄 远程获取失败，使用内置映射表 Remote fetch failed, using fallback wing map');
        this.wingMap = [...this.fallbackMap];
      }
    }
    
    this.ctx.logger.info(`✅ 光翼映射管理器初始化完成 WingMapManager initialized! Total wings loaded: ${this.wingMap.length}`);
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
      // If refresh fails, ensure we still have a map to work with
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

  getSpiritName(wingName: string): string | undefined {
    if (!wingName.startsWith('s_')) {
      return undefined;
    }

    const originalName = wingName.substring(2); // Remove 's_' prefix
    return this.spiritNameMap.get(originalName);
  }
}
