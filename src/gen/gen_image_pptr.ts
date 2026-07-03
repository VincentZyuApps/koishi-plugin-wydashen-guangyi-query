import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { WingMapItem, processWingData, WingDisplayData, WingData, createFontLoadError } from '../utils'
import { categoryOrder } from '../const'
import fs from 'fs'

/**
 * 生成单个光翼卡片的 HTML
 */
function generateWingCardHtml(wing: WingDisplayData, wingMapManager?: any): string {
  const isSpirit = wing.name.startsWith('s_')
  
  let statusClass: string
  let statusText: string
  let icon: string
  let statusIcon: string
  
  if (wing.collected) {
    // 已收集（在斗篷上）
    statusClass = 'collected'
    statusText = '已收集'
    icon = '✨'
    statusIcon = '✓'
  } else if (wing.isFromAPI && isSpirit) {
    // 已存放（不在斗篷上）- API返回了但未collected的永久翼
    statusClass = 'deposited'
    statusText = '已存放'
    icon = '📦'
    statusIcon = '◐'
  } else if (!wing.isFromAPI && isSpirit) {
    // 未兑换（永久翼未拿到）- API没返回的永久翼
    statusClass = 'not-redeemed'
    statusText = '未兑换'
    icon = '🔒'
    statusIcon = '⊗'
  } else {
    // 未收集（地图光翼未解锁）- API没返回的地图光翼
    statusClass = 'uncollected'
    statusText = '未收集'
    icon = '❓'
    statusIcon = '✗'
  }
  
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
          ? `<span class="map-wl-or-spirit-name">【👻${wingMapManager.getSpiritName(wing.name)}】</span>`
          : !wing.name.startsWith('s_') ? `<span class="map-wl-or-spirit-name">【🗺️地图光翼】</span>` : '<span class="unknown-name">【❓暂时不知道】</span>'}
      </div>
      <div class="wing-tags"><span class="wing-category">${wing.category}</span>${wing.subCategory ? ` <span class="wing-subcategory">(${wing.subCategory})</span>` : ''}</div>
    </div>
  `
}

/**
 * 生成光翼查询结果的 HTML
 */
function generateWingHtml(
  roleId: string, wings: WingDisplayData[],
  bgBase64?: string, bgOffset?: number, wingMapManager?: any,
  separateByCategory: boolean = false, containerWidth: number = 1300, viewportWidth: number = 1500,
  showPortalIcons: boolean = false, portalIconsPath: string = '', fontBase64: string = ''
): string {
  // 按分类分组
  const groupedByCategory = new Map<string, WingDisplayData[]>()
  
  wings.forEach(wing => {
    if (!groupedByCategory.has(wing.category)) {
      groupedByCategory.set(wing.category, [])
    }
    groupedByCategory.get(wing.category)!.push(wing)
  })
  
  let wingsHtml = ''
  
  if (separateByCategory) {
    // 按分类顺序排序
    const sortedCategories: [string, WingDisplayData[]][] = []
    
    // 先添加已定义顺序的分类
    for (const category of categoryOrder) {
      if (groupedByCategory.has(category)) {
        sortedCategories.push([category, groupedByCategory.get(category)!])
      }
    }
    
    // 再添加未在顺序中定义的分类（以防有新分类）
    for (const [category, categoryWings] of groupedByCategory) {
      if (!(categoryOrder as readonly string[]).includes(category)) {
        sortedCategories.push([category, categoryWings])
      }
    }
    
    // 为每个分类生成 HTML
    for (const [category, categoryWings] of sortedCategories) {
      const categoryCollected = categoryWings.filter(w => w.collected).length
      const categoryTotal = categoryWings.length
      
      let iconHtml = ''
      if (showPortalIcons && portalIconsPath) {
        const iconMap: {[key: string]: string} = {
          '晨岛': 'chendao.png',
          '云野': 'yunye.png',
          '雨林': 'yulin.png',
          '霞谷': 'xiagu.png',
          '暮土': 'mutu.png',
          '禁阁': 'jinge.png'
        }
        
        if (iconMap[category]) {
           const iconPath = `${portalIconsPath}/${iconMap[category]}`
           if (fs.existsSync(iconPath)) {
              try {
                const iconBuf = fs.readFileSync(iconPath)
                const iconB64 = iconBuf.toString('base64')
                iconHtml = `<img src="data:image/png;base64,${iconB64}" class="portal-icon" />`
              } catch (e) {
                // ignore error
              }
           }
        }
      }

      // 添加分类标题
      wingsHtml += `
        <div class="category-header">
          <div class="category-title">🏷️ ${category} ${iconHtml}</div>
          <div class="category-stats">总数: ${categoryTotal} | 已收集: ${categoryCollected} | 进度: ${((categoryCollected / categoryTotal) * 100).toFixed(1)}%</div>
        </div>
      `
      
      // 添加该分类的光翼
      categoryWings.forEach((wing) => {
        wingsHtml += generateWingCardHtml(wing, wingMapManager)
      })
    }
  } else {
    // 不分类，直接显示所有光翼
    wingsHtml = wings.map(wing => generateWingCardHtml(wing, wingMapManager)).join('')
  }
  
  const totalWings = wings.length
  const collectedWings = wings.filter(w => w.collected).length
  
  // 已存放 = API返回 + s_开头 + 未收集
  const depositedWings = wings.filter(w => 
    w.isFromAPI && w.name.startsWith('s_') && !w.collected
  ).length
  
  // 未兑换 = API未返回 + s_开头
  const notRedeemedWings = wings.filter(w => 
    !w.isFromAPI && w.name.startsWith('s_')
  ).length
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${fontBase64 ? `@font-face { font-family: 'CustomFont'; src: url('data:font/truetype;base64,${fontBase64}'); }` : ''}
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${viewportWidth}px;
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
      font-family: ${fontBase64 ? "'CustomFont', " : ''}-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
      padding: 20px;
      color: #333;
      line-height: 1.2;
    }
    
    .container {
      max-width: ${containerWidth}px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.67);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .header {
      background: rgba(255, 255, 255, 0.13);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px 20px 5px 20px;
      margin-bottom: 15px;
      box-shadow: 0 4px 16px rgba(31, 38, 135, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .title {
      font-size: 60px;
      font-weight: 700;
      color: #4a5dc9;
      margin-bottom: 15px;
      line-height: 1.1;
      text-shadow: 
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 15px rgba(255, 255, 255, 0.8),
        0 4px 20px rgba(102, 126, 234, 0.6);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    
    .stat-item {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.13), rgba(118, 75, 162, 0.13));
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      border: 1px solid rgba(102, 126, 234, 0.3);
    }
    
    .stat-label {
      font-size: 24px;
      color: #2c3e50;
      margin-bottom: 5px;
      line-height: 1.2;
      font-weight: 600;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.8);
    }
    
    .stat-value {
      font-size: 60px;
      font-weight: 800;
      color: #4a5dc9;
      line-height: 1;
      text-shadow: 
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 10px rgba(255, 255, 255, 0.9),
        0 3px 15px rgba(74, 93, 201, 0.5);
    }
    
    .wings-container {
      background: rgba(255, 255, 255, 0.13);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(31, 38, 135, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .wings-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px 4px;
      padding: 6px 0;
    }
    
    .category-header {
      grid-column: 1 / -1;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.13), rgba(118, 75, 162, 0.13));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 10px;
      padding: 5px 20px;
      margin: -1px 0 -1px 0;
      border: 2px solid rgba(102, 126, 234, 0.4);
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .category-title {
      font-size: 36px;
      font-weight: 900;
      color: #4a5dc9;
      text-shadow: 
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 12px rgba(255, 255, 255, 0.9),
        0 3px 15px rgba(74, 93, 201, 0.5);
      display: flex;
      align-items: center;
    }

    .portal-icon {
      height: 40px;
      margin-left: 20px;
      margin-right: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }
    
    .category-stats {
      font-size: 23px;
      color: #5a3a7d;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.9);
    }
    
    .wing-card {
      background: rgba(255, 255, 255, 0.13);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      border-radius: 8px;
      padding: 6px 5px;
      text-align: center;
      border: 2px solid rgba(102, 126, 234, 0.2);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 3px;
      min-height: 105px;
      line-height: 1.2;
      width: 100%;
      overflow: hidden;
    }
    
    .wing-card.collected {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 1px 4px 13px rgba(102, 126, 234, 0.45);
    }
    
    .wing-card.deposited {
      background: linear-gradient(135deg, rgba(255, 165, 0, 0.12), rgba(255, 140, 0, 0.12));
      border-color: rgba(255, 165, 0, 0.4);
      box-shadow: 0 2px 10px rgba(255, 165, 0, 0.15);
      opacity: 0.6;
    }
    
    .wing-card.not-redeemed {
      background: linear-gradient(135deg, rgba(156, 39, 176, 0.1), rgba(123, 31, 162, 0.1));
      border-color: rgba(156, 39, 176, 0.35);
      box-shadow: 0 1px 8px rgba(156, 39, 176, 0.12);
      opacity: 0.5;
    }
    
    .wing-card.uncollected {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(200, 200, 200, 0.3);
      opacity: 0.4;
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
      margin-bottom: 3px;
      padding: 4px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.13);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }
    
    .wing-icon-status .icon {
      font-size: 26px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    
    .wing-icon-status .status-icon {
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
    }
    
    .wing-icon-status .status-text {
      font-size: 25px;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 6px rgba(255, 255, 255, 0.9);
    }
    
    .wing-card.collected .wing-icon-status {
      color: #4a5dc9;
      background: rgba(102, 126, 234, 0.1);
    }
    
    .wing-card.uncollected .wing-icon-status {
      color: #555;
      background: rgba(150, 150, 150, 0.08);
    }
    
    .wing-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a2332;
      margin-bottom: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 4px;
      line-height: 1.3;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 6px rgba(255, 255, 255, 0.9),
        0 2px 8px rgba(0, 0, 0, 0.2);
      font-family: ${fontBase64 ? "'CustomFont', " : ''}'PingFang SC', 'Microsoft YaHei', sans-serif;
    }

    .map-wl-or-spirit-name {
      font-size: 21px;
      color: #5a3a7d;
      font-weight: 700;
      font-style: italic;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 6px rgba(255, 255, 255, 0.9);
    }

    .unknown-name {
      font-size: 21px;
      color: #000000;
      font-weight: 700;
      font-style: italic;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 6px rgba(255, 255, 255, 0.9);
    }
    
    .wing-tags {
      margin-bottom: 3px;
      line-height: 1.2;
    }

    .wing-category {
      font-size: 19px;
      color: #4a5dc9;
      font-weight: 900;
      letter-spacing: 1px;
      text-shadow:
        -2px -2px 0 #fff,
        2px -2px 0 #fff,
        -2px 2px 0 #fff,
        2px 2px 0 #fff,
        0 0 10px rgba(255, 255, 255, 0.9),
        0 2px 12px rgba(74, 93, 201, 0.4);
    }

    .wing-subcategory {
      font-size: 12px;
      color: #5a3a7d;
      font-weight: 700;
      font-style: italic;
      text-shadow:
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 8px rgba(255, 255, 255, 0.9);
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
      color: #555;
      margin-top: 9px;
      line-height: 1.2;
      font-weight: 900;
      text-shadow: 
        -1px -1px 0 #fff,
        1px -1px 0 #fff,
        -1px 1px 0 #fff,
        1px 1px 0 #fff,
        0 0 6px rgba(255, 255, 255, 0.9);
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
          <div class="stat-value">${depositedWings}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">未兑换</div>
          <div class="stat-value">${notRedeemedWings}</div>
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
  wingMapManager?: any,
  separateByCategory: boolean = false,
  containerWidth: number = 1300,
  viewportWidth: number = 1500,
  imageType: string = 'png',
  screenshotQuality: number = 80,
  showPortalIcons: boolean = false,
  portalIconsPath: string = '',
  fontPath: string = '',
  onInfo?: (message: string) => void,
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
      } catch (error) {
        onInfo?.(`⚠️ Puppeteer 背景图读取失败，将回退纯色背景：${error instanceof Error ? error.message : String(error)}`)
      }
    }

    let fontBase64 = ''
    if (fontPath) {
      try {
        fontBase64 = fs.readFileSync(fontPath).toString('base64')
      } catch (error) {
        throw createFontLoadError('Puppeteer', fontPath, `无法读取字体文件: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 生成 HTML
    const htmlContent = generateWingHtml(roleId, processedWings, bgBase64, bgOffset, wingMapManager, separateByCategory, containerWidth, viewportWidth, showPortalIcons, portalIconsPath, fontBase64)
    
    // 设置视口
    await browserPage.setViewport({
      width: viewportWidth,
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
      width: viewportWidth,
      height: contentHeight,
      deviceScaleFactor: 1,
    })
    
    // 截图
    const screenshotOptions: any = {
      encoding: 'base64',
      type: imageType,
    }
    
    // PNG不支持quality参数，只有jpeg和webp支持
    if (imageType !== 'png') {
      screenshotOptions.quality = screenshotQuality
    }
    
    const screenshot = await browserPage.screenshot(screenshotOptions)
    
    return screenshot
  } catch (error) {
    onInfo?.(`❌ Puppeteer 渲染图片失败：${error instanceof Error ? error.message : String(error)}`)
    throw error
  } finally {
    await browserPage.close()
  }
}
