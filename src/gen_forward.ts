import { WingMapItem } from './wing_map_manager'

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
  isFromAPI: boolean  // 标记是否来自API返回
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
      // API返回的数据
      result.push({
        ...wingData,
        ...displayInfo,
        index,
        isFromAPI: true  // 来自API
      })
    } else {
      // JSON有但API没返回的光翼
      result.push({
        name: wingName,
        collected: false,
        deposited: false,
        last_conversion: 0,
        deposit_id: '',
        ...displayInfo,
        index,
        isFromAPI: false  // 不来自API
      })
    }
  })
  
  return result
}

/**
 * 生成光翼查询结果的合并转发消息
 */
export function generateWingForward(
  roleId: string,
  wingBuffs: WingData[],
  wingTagMap: readonly WingMapItem[],
  wingMapManager?: any
): string {
  // 处理光翼数据
  const processedWings = processWingData(wingBuffs, wingTagMap)
  
  const totalWings = processedWings.length
  const collectedWings = processedWings.filter(w => w.collected).length
  
  // 已存放 = API返回 + s_开头 + 未收集
  const depositedWings = processedWings.filter(w => 
    w.isFromAPI && w.name.startsWith('s_') && !w.collected
  ).length
  
  // 未兑换 = API未返回 + s_开头
  const notRedeemedWings = processedWings.filter(w => 
    !w.isFromAPI && w.name.startsWith('s_')
  ).length
  
  // 未收集（地图光翼）
  const uncollectedWings = processedWings.filter(w =>
    !w.isFromAPI && !w.name.startsWith('s_')
  ).length
  
  let messages = ''
  
  // Helper to add a message block with author
  const addMessageBlock = (authorId: string | undefined, authorName: string, content: string) => {
    messages += `
      <message>
        <author ${authorId ? `id="${authorId}"` : ``} name="${authorName}"/>
        ${content}
      </message>`
  }
  
  // 第一条消息：基本信息和统计
  addMessageBlock(
    undefined,
    '✨🌟 光翼查询基本信息 🌟✨',
    [
      `⏰ 当前时间: \t ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      `========= 📊 查询信息 📊 =========`,
      `🆔 角色ID: \t ${roleId}`,
      `🔢 总光翼数: \t ${totalWings}`,
      `✅ 已收集: \t ${collectedWings}`,
      `📦 已存放: \t ${depositedWings}`,
      `🔒 未兑换: \t ${notRedeemedWings}`,
      `❌ 未收集: \t ${uncollectedWings}`
    ].join('\n')
  )
  
  // 按分类分组
  const groupedByCategory = new Map<string, WingDisplayData[]>()
  
  processedWings.forEach(wing => {
    if (!groupedByCategory.has(wing.category)) {
      groupedByCategory.set(wing.category, [])
    }
    groupedByCategory.get(wing.category)!.push(wing)
  })
  
  // 定义分类的顺序
  const categoryOrder = [
    '遇境', '云巢', '晨岛', '云野', '雨林', '霞谷', '暮土', '禁阁', '暴风眼',
    '普通永久', '复刻永久', '破晓季'
  ]
  
  // 按照自定义顺序排序分类
  const sortedCategories: [string, WingDisplayData[]][] = []
  
  // 先添加已定义顺序的分类
  for (const category of categoryOrder) {
    if (groupedByCategory.has(category)) {
      sortedCategories.push([category, groupedByCategory.get(category)!])
    }
  }
  
  // 再添加未在顺序中定义的分类（以防有新分类）
  for (const [category, wings] of groupedByCategory) {
    if (!categoryOrder.includes(category)) {
      sortedCategories.push([category, wings])
    }
  }
  
  // 为每个分类生成消息
  let categoryIndex = 1
  let msgBlockCnt = 0
  
  // 打印所有的 category 到控制台
  console.log('所有分类 (All Categories):');
  for (const [category, wings] of sortedCategories) {
    console.log(`  ${category} - ${wings.length}个光翼`);
  }
  console.log('---');
  
  for (const [category, wings] of sortedCategories) {
    const categoryCollected = wings.filter(w => w.collected).length
    const categoryTotal = wings.length

    const catrgoryOverview = [
        `━━━━━ 🏷️ ${category} ━━━━━`,
        `🔢 总数: ${categoryTotal} | ✅ 已收集: ${categoryCollected}`,
        `📊 收集进度: ${((categoryCollected / categoryTotal) * 100).toFixed(1)}%`,
        `\n`
      ].join('\n')
    
    // 将当前分类的光翼分批，每50个一条消息
    const batchSize = 50
    for (let i = 0; i < wings.length; i += batchSize) {
      const batch = wings.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(wings.length / batchSize)
      
      const batchContent = batch.map((wing, idx) => {
        const isSpirit = wing.name.startsWith('s_')
        let statusIcon: string
        let statusText: string
        
        if (wing.collected) {
          statusIcon = '✅已收集'
          statusText = '✨已收集'
        } else if (wing.isFromAPI && isSpirit) {
          statusIcon = '📦已存放'
          statusText = '📦已存放'
        } else if (!wing.isFromAPI && isSpirit) {
          statusIcon = '🔒未兑换'
          statusText = '🔒未兑换'
        } else {
          statusIcon = '❌未收集'
          statusText = '❌未收集'
        }
        
        const subCategoryDisplay = wing.subCategory ? ` 📍[${wing.subCategory}]` : ''
        const spiritName = isSpirit && wingMapManager?.getSpiritName(wing.name)
          ? ` (👤${wingMapManager.getSpiritName(wing.name)})`
          : !isSpirit ? ' (🗺️地图)' : ''
        
        // return `${i + idx + 1}. [${statusIcon}] ${wing.name}${spiritName}${subCategoryDisplay} - ${statusText}`
        return `${i + idx + 1}. [${statusIcon}] ${wing.name}${spiritName}${subCategoryDisplay}`

      }).join('\n')
      
      const authorName = totalBatches > 1 
        ? `${category} (${batchNumber}/${totalBatches})`
        : category
      
      addMessageBlock(
        undefined,
        authorName,
        catrgoryOverview + batchContent
      )
    //   console.log(`这个messageBlock的信息: \n${catrgoryOverview + batchContent}`)
      msgBlockCnt++;
    //   if ( msgBlockCnt >=18 ) break;
    }
    
    // if ( msgBlockCnt >=18 ) break;
    categoryIndex++;
    // if ( categoryIndex >= 11 ) break;
  }
  
  // 最后一条消息：总结
  addMessageBlock(
    undefined,
    '🎉✨ 查询完成 ✨🎉',
    [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `✅ 查询结果已生成！`,
      `💪 继续加油收集光翼吧！🌟`,
      ``,
      `📖 提示说明：`,
      `✅ 已收集 - 光翼在斗篷上`,
      `📦 已存放 - 永久翼已拿到但未装备`,
      `🔒 未兑换 - 永久翼未兑换`,
      `❌ 未收集 - 地图光翼未解锁`
    ].join('\n')
  )
  
  // 返回完整的合并转发消息
  return `<message forward>\n${messages}\n</message>`
}

