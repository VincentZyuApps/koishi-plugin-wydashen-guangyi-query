import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { WingTagMap } from './types'
import fs from 'fs'
import path from 'path'

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
function getWingDisplayInfo(wingName: string): { displayName: string; category: string; subCategory: string; index: number } {
  const found = WingTagMap.findIndex(item => item.光翼名字 === wingName)
  if (found !== -1) {
    const item = WingTagMap[found]
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
function processWingData(wingBuffs: WingData[]): WingDisplayData[] {
  const wingMap = new Map(wingBuffs.map(w => [w.name, w]))
  
  const result: WingDisplayData[] = []
  
  // 按照 WingTagMap 的顺序遍历
  WingTagMap.forEach((mapItem, index) => {
    const wingName = mapItem.光翼名字
    const wingData = wingMap.get(wingName)
    
    const displayInfo = getWingDisplayInfo(wingName)
    
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
function generateWingHtml(roleId: string, wings: WingDisplayData[], bgBase64?: string, bgOffset?: number): string {
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
      const statusClass = wing.collected ? 'collected' : 'uncollected'
      const statusText = wing.collected ? '✓ 已收集' : '未收集'
      const depositedText = wing.deposited ? '(已存放)' : ''
      const icon = wing.collected ? '✨' : '❓'
      
      return `
        <div class="wing-card ${statusClass}">
          <div class="wing-icon">${icon}</div>
          <div class="wing-name">${wing.name}</div>
          <div class="wing-category">${wing.category}</div>
          ${wing.subCategory ? `<div class="wing-subcategory">${wing.subCategory}</div>` : ''}
          <div class="wing-status">${statusText} ${depositedText}</div>
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
      min-height: 800px;
      ${bgBase64 
        ? `background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%), 
                       url(data:image/webp;base64,${bgBase64});
           background-size: auto 100%;
           background-position: ${bgOffset}% center;
           background-repeat: no-repeat;`
        : `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`
      }
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
      padding: 40px;
      color: #333;
    }
    
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    
    .header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    
    .title {
      font-size: 60px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 15px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .stat-item {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
      border-radius: 12px;
      padding: 15px;
      text-align: center;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
    
    .stat-label {
      font-size: 20px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 50px;
      font-weight: 700;
      color: #667eea;
    }
    
    .wings-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    
    .wings-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px 8px;
      padding: 20px 0;
    }
    
    .wing-card {
      background: rgba(255, 255, 255, 0.5);
      border-radius: 9px;
      padding: 12px 8px;
      text-align: center;
      border: 2px solid rgba(102, 126, 234, 0.2);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 180px;
    }
    
    .wing-card.collected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
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
    
    .wing-icon {
      font-size: 50px;
      margin-bottom: 13px;
    }
    
    .wing-name {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 6px;
      word-break: break-word;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .wing-category {
      font-size: 20px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .wing-subcategory {
      font-size: 20px;
      color: #764ba2;
      margin-bottom: 6px;
    }
    
    .wing-status {
      font-size: 20px;
      color: #666;
      font-weight: 600;
    }
    
    .wing-card.collected .wing-status {
      color: #667eea;
    }
    
    .role-id {
      font-size: 20px;
      color: #999;
      margin-top: 15px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">✨ 光遇光翼查询</div>
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
  backgroundImagePath?: string
): Promise<string> {
  const browserPage = await ctx.puppeteer.page()
  
  try {
    // 处理光翼数据
    const processedWings = processWingData(wingBuffs)
    
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
    const htmlContent = generateWingHtml(roleId, processedWings, bgBase64, bgOffset)
    
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
