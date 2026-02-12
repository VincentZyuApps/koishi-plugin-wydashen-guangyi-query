package renderer

import (
	"strings"

	"github.com/VincentZyuApps/wing-renderer/types"
)

// CategoryOrder 分类排序顺序
var CategoryOrder = []string{
	"遇境", "云巢", "晨岛", "云野", "雨林", "霞谷", "暮土", "禁阁", "暴风眼",
	"普通永久", "复刻永久", "破晓季",
}

// ProcessWingData 处理光翼数据，按照 WingMap 排序并补充缺失的光翼
func ProcessWingData(wingBuffs []types.WingBuff, wingMap []types.WingMapItem) []types.ProcessedWing {
	// 创建 API 返回的光翼 map，便于查找
	buffMap := make(map[string]types.WingBuff)
	for _, buff := range wingBuffs {
		buffMap[buff.Name] = buff
	}

	result := make([]types.ProcessedWing, 0, len(wingMap))

	for idx, mapItem := range wingMap {
		wingName := mapItem.WingName
		isSpirit := strings.HasPrefix(wingName, "s_")

		pw := types.ProcessedWing{
			Name:        wingName,
			DisplayName: wingName,
			Category:    mapItem.Category,
			SubCategory: mapItem.SubCategory,
			IsSpirit:    isSpirit,
			Index:       idx,
		}

		if buff, exists := buffMap[wingName]; exists {
			// API 返回了这个光翼
			if buff.Collected {
				pw.Status = types.StatusCollected
			} else if isSpirit {
				pw.Status = types.StatusDeposited
			} else {
				pw.Status = types.StatusUncollected
			}
		} else {
			// API 没有返回这个光翼
			if isSpirit {
				pw.Status = types.StatusNotRedeemed
			} else {
				pw.Status = types.StatusUncollected
			}
		}

		result = append(result, pw)
	}

	return result
}

// GroupByCategory 按分类分组
func GroupByCategory(wings []types.ProcessedWing) map[string][]types.ProcessedWing {
	grouped := make(map[string][]types.ProcessedWing)
	for _, wing := range wings {
		grouped[wing.Category] = append(grouped[wing.Category], wing)
	}
	return grouped
}

// CalculateStats 计算统计数据
func CalculateStats(wings []types.ProcessedWing) (total, collected, deposited, notRedeemed int) {
	total = len(wings)
	for _, w := range wings {
		switch w.Status {
		case types.StatusCollected:
			collected++
		case types.StatusDeposited:
			deposited++
		case types.StatusNotRedeemed:
			notRedeemed++
		}
	}
	return
}

// CalculateCategoryStats 计算分类统计
func CalculateCategoryStats(wings []types.ProcessedWing) (total, collected int) {
	total = len(wings)
	for _, w := range wings {
		if w.Status == types.StatusCollected {
			collected++
		}
	}
	return
}
