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
 * 生成光翼查询结果的文本
 */
export function generateWingText(
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
  
  let output = ''
  
  // 头部信息
  output += `===== ✨🌟 网易国服sky光遇光翼查询 🌟✨ =====\n`
  output += `⏰ 当前时间 (Current Time): ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`
  output += `🆔 角色ID (Role ID): ${roleId}\n\n`
  
  // 统计信息
  output += `----- 📊📈 统计信息 (Statistics) 📈📊 -----\n`
  output += `🔢 总光翼数 (Total Wings): \t${totalWings}\n`
  output += `✅ 已收集 (Collected): \t\t${collectedWings}\n`
  output += `📦 已存放 (Deposited): \t\t${depositedWings}\n`
  output += `🔒 未兑换 (Not Redeemed): \t${notRedeemedWings}\n`
  output += `❌ 未收集 (Uncollected): \t\t${uncollectedWings}\n\n`
  
  // 按分类分组
  const groupedByCategory = new Map<string, WingDisplayData[]>()
  
  processedWings.forEach(wing => {
    if (!groupedByCategory.has(wing.category)) {
      groupedByCategory.set(wing.category, [])
    }
    groupedByCategory.get(wing.category)!.push(wing)
  })
  
  // 输出每个分类的光翼
  let categoryIndex = 1
  for (const [category, wings] of groupedByCategory) {
    output += `\n━━━━━ ${categoryIndex}. 🏷️ ${category} (${wings.length}个光翼) ━━━━━\n`
    
    wings.forEach((wing, idx) => {
      const isSpirit = wing.name.startsWith('s_')
      let statusIcon: string
      let statusText: string
      
      if (wing.collected) {
        statusIcon = '✅'
        statusText = '✨已收集✨'
      } else if (wing.isFromAPI && isSpirit) {
        statusIcon = '📦'
        statusText = '📦已存放'
      } else if (!wing.isFromAPI && isSpirit) {
        statusIcon = '🔒'
        statusText = '🔒未兑换'
      } else {
        statusIcon = '❌'
        statusText = '❌未收集'
      }
      
      const subCategoryDisplay = wing.subCategory ? ` 📍[${wing.subCategory}]` : ''
      const spiritName = isSpirit && wingMapManager?.getSpiritName(wing.name)
        ? ` 👤(${wingMapManager.getSpiritName(wing.name)})`
        : !isSpirit ? ' 🗺️(地图光翼)' : ''
      
      output += `  ${idx + 1}. [${statusIcon}] ${wing.name}${spiritName}${subCategoryDisplay} - ${statusText}\n`
    })
    
    categoryIndex++
  }
  
  output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  output += `🎉✨ 查询完成！继续加油收集光翼吧！💪🌟✨🎉`
  
  return output
}
