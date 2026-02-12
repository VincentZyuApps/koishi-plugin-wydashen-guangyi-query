package types

import "encoding/json"

// WingBuff 光翼数据（来自API）
type WingBuff struct {
	Name           string      `json:"name"`
	Collected      bool        `json:"collected"`
	Deposited      bool        `json:"deposited"`
	LastConversion json.Number `json:"last_conversion"`
	DepositID      json.Number `json:"deposit_id"`
}

// WingMapItem 光翼映射表项
type WingMapItem struct {
	WingName    string `json:"光翼名字"`
	Category    string `json:"一级标签"`
	SubCategory string `json:"二级标签"`
}

// RenderConfig 渲染配置
type RenderConfig struct {
	SeparateByCategory bool   `json:"separateByCategory"`
	ContainerWidth     int    `json:"containerWidth"`
	OutputFormat       string `json:"outputFormat"`    // "png" or "svg"
	CustomFontPath     string `json:"customFontPath"`  // 自定义字体路径，空则使用系统字体
	DarkMode           bool   `json:"darkMode"`        // 黑夜模式
	ShowPortalIcons    bool   `json:"showPortalIcons"` // 显示传送门图标
	PortalIconsPath    string `json:"portalIconsPath"` // 图标资源路径
}

// RenderInput 渲染输入（从stdin读取）
type RenderInput struct {
	RoleID    string        `json:"roleId"`
	WingBuffs []WingBuff    `json:"wingBuffs"`
	WingMap   []WingMapItem `json:"wingMap"`
	Config    RenderConfig  `json:"config"`
}

// RenderOutput 渲染输出（写到stdout）
type RenderOutput struct {
	Success bool   `json:"success"`
	Format  string `json:"format"` // "png"
	Data    string `json:"data"`   // base64 encoded
	Error   string `json:"error,omitempty"`
}

// WingStatus 光翼状态枚举
type WingStatus int

const (
	StatusCollected   WingStatus = iota // 已收集（在斗篷上）
	StatusDeposited                     // 已存放（不在斗篷上）
	StatusNotRedeemed                   // 未兑换（永久翼未拿到）
	StatusUncollected                   // 未收集（地图光翼未解锁）
)

// ProcessedWing 处理后的光翼数据（用于渲染）
type ProcessedWing struct {
	Name        string
	DisplayName string
	Category    string
	SubCategory string
	Status      WingStatus
	IsSpirit    bool // 是否是永久翼（s_开头）
	Index       int
}
