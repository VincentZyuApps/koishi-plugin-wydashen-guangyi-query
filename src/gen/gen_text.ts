import { WingMapItem, processWingData, WingDisplayData, WingData } from '../utils'

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
