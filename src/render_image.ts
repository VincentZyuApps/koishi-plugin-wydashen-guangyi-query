import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { WingMapItem } from './wing_map_manager'
import fs from 'fs'

interface WingData {
  name: string
  collected: boolean
  deposited: boolean
  last_conversion: number
  deposit_id: string
}

interface WingDisplayData extends WingData {
  displayName: string
  category: string
  subCategory: string
  index: number
}

/**
 * 根据 WingTagMap 获取光翼的显示信息
 */
function getWingDisplayInfo(wingName: string, wingTagMap: readonly WingMapItem[]): { displayName: string; category: string; subCategory: string; index: number } {
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

/**
 * 将光翼数据按照 WingTagMap 的顺序排序，并补充缺失的光翼
 */
function processWingData(wingBuffs: WingData[], wingTagMap: readonly WingMapItem[]): WingDisplayData[] {
  const wingMap = new Map(wingBuffs.map(w => [w.name, w]))
  
  const result: WingDisplayData[] = []
  
  // 按照 WingTagMap 的顺序遍历
  wingTagMap.forEach((mapItem, index) => {
    const wingName = mapItem.光翼名字
    const wingData = wingMap.get(wingName)
    
    const displayInfo = getWingDisplayInfo(wingName, wingTagMap)
    
    if (wingData) {
      result.push({
        ...wingData,
        ...displayInfo,
        index
      })
    } else {
      // 未收集的光翼
      result.push({
        name: wingName,
        collected: false,
        deposited: false,
        last_conversion: 0,
        deposit_id: '',
        ...displayInfo,
        index
      })
    }
  })
  
  return result
}

/**
 * 生成光翼查询结果的 HTML
 */
function generateWingHtml(roleId: string, wings: WingDisplayData[], bgBase64?: string, bgOffset?: number, wingMapManager?: any): string {
  // 按分类分组
  const groupedByCategory = new Map<string, Map<string, WingDisplayData[]>>()
  
  wings.forEach(wing => {
    if (!groupedByCategory.has(wing.category)) {
      groupedByCategory.set(wing.category, new Map())
    }
    const catMap = groupedByCategory.get(wing.category)!
    const subCat = wing.subCategory || '其他'
    if (!catMap.has(subCat)) {
      catMap.set(subCat, [])
    }
    catMap.get(subCat)!.push(wing)
  })
  
  // 构建 HTML，5 列网格显示光翼
  const wingsHtml = wings
    .map((wing, idx) => {
      // 判断三种状态：已收集、未收集、已存放
      const isDeposited = !wing.collected && parseInt(wing.deposit_id) > 0
      
      let statusClass: string
      let statusText: string
      let icon: string
      let statusIcon: string
      
      if (wing.collected) {
        // 已收集
        statusClass = 'collected'
        statusText = '已收集'
        icon = '✨'
        statusIcon = '✓'
      } else if (isDeposited) {
        // 已存放
        statusClass = 'deposited'
        statusText = '已存放'
        icon = '📦'
        statusIcon = '◐'
      } else {
        // 未收集（未解锁）
        statusClass = 'uncollected'
        statusText = '未收集'
        icon = '❓'
        statusIcon = '✗'
      }
      
      // 如果没有二级标签，显示横杠占位
      const subCategoryDisplay = wing.subCategory || '-'
      
      return `
        <div class="wing-card ${statusClass}">
          <div class="wing-icon-status">
            <span class="icon">${icon}</span>
            <span class="status-text">${statusText}</span>
            <span class="status-icon">${statusIcon}</span>
          </div>
          <div class="wing-name">
            ${wing.name}
            ${wing.name.startsWith('s_') && wingMapManager?.getSpiritName(wing.name)
              ? `<span class="map-wl-or-spirit-name">【${wingMapManager.getSpiritName(wing.name)}】</span>`
              : !wing.name.startsWith('s_') ? `<span class="map-wl-or-spirit-name">【地图光翼】</span>` : '<span>【暂时不知道】</span>'}
          </div>
          <div class="wing-category">${wing.category}</div>
          <div class="wing-subcategory">${subCategoryDisplay}</div>
        </div>
      `
    })
    .join('')
  
  const totalWings = wings.length
  const collectedWings = wings.filter(w => w.collected).length
  const depletedWings = wings.filter(w => w.deposited).length
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 1200px;
      height: auto;
      min-height: 600px;
      ${bgBase64 
        ? `background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%), 
                       url(data:image/webp;base64,${bgBase64});
           background-size: auto 100%;
           background-position: ${bgOffset}% center;
           background-repeat: no-repeat;`
        : `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`
      }
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.2;
    }
    
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    
    .header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 15px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    
    .title {
      font-size: 72px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 15px;
      line-height: 1.1;
      text-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .stat-item {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
    
    .stat-label {
      font-size: 24px;
      color: #666;
      margin-bottom: 5px;
      line-height: 1.2;
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 60px;
      font-weight: 700;
      color: #667eea;
      line-height: 1;
    }
    
    .wings-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    
    .wings-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px 6px;
      padding: 10px 0;
    }
    
    .wing-card {
      background: rgba(255, 255, 255, 0.5);
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
      border: 2px solid rgba(102, 126, 234, 0.2);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 180px;
      line-height: 1.2;
    }
    
    .wing-card.collected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    }
    
    .wing-card.deposited {
      background: linear-gradient(135deg, rgba(255, 165, 0, 0.12), rgba(255, 140, 0, 0.12));
      border-color: rgba(255, 165, 0, 0.4);
      box-shadow: 0 2px 10px rgba(255, 165, 0, 0.15);
      opacity: 0.85;
    }
    
    .wing-card.uncollected {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(200, 200, 200, 0.3);
      opacity: 0.7;
    }
    
    .wing-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }
    
    .wing-icon-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 8px;
      padding: 4px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.5);
    }
    
    .wing-icon-status .icon {
      font-size: 40px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    
    .wing-icon-status .status-icon {
      font-size: 22px;
      font-weight: bold;
      line-height: 1;
    }
    
    .wing-icon-status .status-text {
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .wing-card.collected .wing-icon-status {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }
    
    .wing-card.uncollected .wing-icon-status {
      color: #999;
      background: rgba(150, 150, 150, 0.08);
    }
    
    .wing-name {
      font-size: 22px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 6px;
      word-break: break-word;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 4px;
      line-height: 1.3;
      text-shadow: 0 1px 2px rgba(0,0,0,0.05);
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }
    
    .map-wl-or-spirit-name {
      font-size: 18px;
      color: #764ba2;
      font-weight: 500;
      font-style: italic;
    }
    
    .wing-category {
      font-size: 28px;
      color: #667eea;
      font-weight: 800;
      margin-bottom: 4px;
      line-height: 1.2;
      text-shadow: 0 1px 3px rgba(102, 126, 234, 0.3);
      letter-spacing: 1px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .wing-subcategory {
      font-size: 26px;
      color: #764ba2;
      font-weight: 600;
      margin-bottom: 5px;
      line-height: 1.2;
      font-style: italic;
      text-decoration: underline;
      text-decoration-color: rgba(118, 75, 162, 0.3);
      text-underline-offset: 3px;
    }
    
    .wing-deposited {
      font-size: 18px;
      color: #ff6b6b;
      font-weight: 700;
      margin-top: 3px;
      line-height: 1;
      padding: 3px 8px;
      background: rgba(255, 107, 107, 0.1);
      border-radius: 4px;
      display: inline-block;
    }
    
    .role-id {
      font-size: 24px;
      color: #999;
      margin-top: 12px;
      font-family: 'Courier New', monospace;
      line-height: 1.2;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">✨ 网易国服sky光遇光翼查询</div>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-label">总光翼数</div>
          <div class="stat-value">${totalWings}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">已收集</div>
          <div class="stat-value">${collectedWings}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">已存放</div>
          <div class="stat-value">${depletedWings}</div>
        </div>
      </div>
      <div class="role-id">角色ID: ${roleId}</div>
    </div>
    
    <div class="wings-container">
      <div class="wings-grid">
        ${wingsHtml}
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * 渲染光翼查询结果为图片
 */
export async function renderWingImage(
  ctx: Context,
  roleId: string,
  wingBuffs: WingData[],
  wingTagMap: readonly WingMapItem[],
  backgroundImagePath?: string,
  wingMapManager?: any // Add the wingMapManager parameter
): Promise<string> {
  const browserPage = await ctx.puppeteer.page()
  
  try {
    // 处理光翼数据
    const processedWings = processWingData(wingBuffs, wingTagMap)
    
    // 读取背景图片并转换为 base64
    let bgBase64: string | undefined
    let bgOffset: number | undefined
    
    if (backgroundImagePath && fs.existsSync(backgroundImagePath)) {
      try {
        const bgBuffer = fs.readFileSync(backgroundImagePath)
        bgBase64 = bgBuffer.toString('base64')
        // 生成随机偏移量 (0-100)，用于在背景图中随机选择竖条位置
        bgOffset = Math.floor(Math.random() * 101)
        ctx.logger.debug(`Background image loaded, offset: ${bgOffset}%`)
      } catch (error) {
        ctx.logger.warn(`Failed to load background image: ${error}`)
      }
    }
    
    // 生成 HTML
    const htmlContent = generateWingHtml(roleId, processedWings, bgBase64, bgOffset, wingMapManager)
    
    // 设置视口
    await browserPage.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
    })
    
    // 设置内容
    await browserPage.setContent(htmlContent)
    
    // 等待页面加载完成
    await browserPage.waitForSelector('body', { timeout: 10000 })
    
    // 获取实际内容高度
    const contentHeight = await browserPage.evaluate(() => {
      return document.documentElement.scrollHeight
    })
    
    // 重新设置视口以适应内容
    await browserPage.setViewport({
      width: 1200,
      height: contentHeight,
      deviceScaleFactor: 1,
    })
    
    // 截图
    const screenshot = await browserPage.screenshot({
      encoding: 'base64',
      type: 'png',
      // quality: 90,
    })
    
    return screenshot
  } catch (error) {
    ctx.logger.error(`Failed to render wing image: ${error}`)
    throw error
  } finally {
    await browserPage.close()
  }
}
