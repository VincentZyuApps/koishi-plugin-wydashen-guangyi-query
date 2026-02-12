package renderer

import "image/color"

// Theme 主题接口
type Theme struct {
// 背景色
ColorBgMain   color.RGBA
ColorBgCard   color.RGBA
ColorBgHeader color.RGBA

// 文字色
ColorTextPrimary   color.RGBA
ColorTextSecondary color.RGBA
ColorTextMuted     color.RGBA
ColorTitle         color.RGBA

// 状态色 (背景/前景色)
ColorCollectedBg   color.RGBA
ColorCollectedFg   color.RGBA
ColorDepositedBg   color.RGBA
ColorDepositedFg   color.RGBA
ColorNotRedeemedBg color.RGBA
ColorNotRedeemedFg color.RGBA
ColorUncollectedBg color.RGBA
ColorUncollectedFg color.RGBA

// 边框色
ColorBorder      color.RGBA
ColorBorderLight color.RGBA

// 强调色
ColorAccent color.RGBA

// 分类色
CategoryColors map[string]color.RGBA
}

// LightTheme 亮色主题
var LightTheme = Theme{
ColorBgMain:    color.RGBA{240, 242, 245, 255}, // #f0f2f5 浅灰背景
ColorBgCard:    color.RGBA{255, 255, 255, 255}, // #ffffff 卡片背景 (白)
ColorBgHeader:  color.RGBA{255, 255, 255, 230}, // #ffffff 头部背景 (半透明白)

ColorTextPrimary:   color.RGBA{10, 10, 10, 255},    // #0a0a0a 接近纯黑
ColorTextSecondary: color.RGBA{60, 60, 60, 255},    // #3c3c3c 深灰
ColorTextMuted:     color.RGBA{100, 100, 100, 255}, // #646464 中灰
ColorTitle:         color.RGBA{64, 158, 255, 255},  // #409eff 标题色 (蓝)

ColorCollectedBg:   color.RGBA{236, 245, 255, 255}, // #ecf5ff
ColorCollectedFg:   color.RGBA{64, 158, 255, 255},  // #409eff
ColorDepositedBg:   color.RGBA{253, 246, 236, 255}, // #fdf6ec
ColorDepositedFg:   color.RGBA{230, 162, 60, 255},  // #e6a23c
ColorNotRedeemedBg: color.RGBA{244, 244, 245, 255}, // #f4f4f5
ColorNotRedeemedFg: color.RGBA{144, 147, 153, 255}, // #909399
ColorUncollectedBg: color.RGBA{255, 255, 255, 255}, // #ffffff
ColorUncollectedFg: color.RGBA{192, 196, 204, 255}, // #c0c4cc

ColorBorder:      color.RGBA{220, 223, 230, 255}, // #dcdfe6
ColorBorderLight: color.RGBA{235, 238, 245, 255}, // #ebeef5

ColorAccent: color.RGBA{64, 158, 255, 255}, // #409eff

CategoryColors: map[string]color.RGBA{
"遇境":   {160, 207, 255, 255},
"云巢":   {133, 236, 239, 255},
"晨岛":   {250, 211, 144, 255},
"云野":   {185, 246, 202, 255},
"雨林":   {128, 222, 234, 255},
"霞谷":   {255, 204, 128, 255},
"暮土":   {209, 196, 233, 255},
"禁阁":   {159, 168, 218, 255},
"暴风眼":  {207, 216, 220, 255},
"普通永久": {144, 202, 249, 255},
"复刻永久": {255, 224, 178, 255},
"破晓季":  {244, 143, 177, 255},
},
}

// DarkTheme 暗色主题
var DarkTheme = Theme{
ColorBgMain:    color.RGBA{20, 20, 23, 255},    // #141417 深黑背景
ColorBgCard:    color.RGBA{30, 30, 34, 255},    // #1e1e22 卡片背景 (深灰)
ColorBgHeader:  color.RGBA{30, 30, 34, 230},    // #1e1e22 头部背景 (半透明深灰)

ColorTextPrimary:   color.RGBA{240, 240, 245, 255}, // #f0f0f5 接近纯白
ColorTextSecondary: color.RGBA{180, 180, 190, 255}, // #b4b4be 浅灰
ColorTextMuted:     color.RGBA{120, 120, 130, 255}, // #787882 暗灰
ColorTitle:         color.RGBA{100, 181, 255, 255}, // #64b5ff 亮蓝

ColorCollectedBg:   color.RGBA{25, 50, 80, 255},    // 深蓝背景
ColorCollectedFg:   color.RGBA{100, 181, 255, 255}, // 亮蓝
ColorDepositedBg:   color.RGBA{60, 40, 20, 255},    // 深橙背景
ColorDepositedFg:   color.RGBA{255, 180, 80, 255},  // 亮橙
ColorNotRedeemedBg: color.RGBA{40, 40, 45, 255},    // 深灰背景
ColorNotRedeemedFg: color.RGBA{140, 140, 150, 255}, // 灰白
ColorUncollectedBg: color.RGBA{35, 35, 40, 255},    // 稍浅黑背景
ColorUncollectedFg: color.RGBA{100, 100, 110, 255}, // 暗灰文字

ColorBorder:      color.RGBA{60, 60, 65, 255},    // #3c3c41
ColorBorderLight: color.RGBA{50, 50, 55, 255},    // #323237

ColorAccent: color.RGBA{100, 181, 255, 255}, // 亮蓝

CategoryColors: map[string]color.RGBA{
// 降低饱和度适应暗色
"遇境":   {60, 90, 120, 255},
"云巢":   {40, 100, 100, 255},
"晨岛":   {120, 90, 50, 255},
"云野":   {60, 100, 70, 255},
"雨林":   {40, 90, 100, 255},
"霞谷":   {120, 80, 40, 255},
"暮土":   {80, 70, 100, 255},
"禁阁":   {63, 81, 181, 255},
"暴风眼":  {80, 85, 90, 255},
"普通永久": {50, 80, 110, 255},
"复刻永久": {120, 100, 70, 255},
"破晓季":  {110, 60, 80, 255},
},
}

// GetTheme 根据模式获取主题
func GetTheme(darkMode bool) Theme {
if darkMode {
return DarkTheme
}
return LightTheme
}

// ========== 布局常量 ==========

const (
// 图片宽度
ImageWidth = 1000 // 稍微窄一点，适应手机

// 边距
PaddingOuter = 20
PaddingInner = 12
PaddingCard  = 8

// 卡片尺寸 (更紧凑，更高屏效比)
CardWidth   = 158 // 稍微变宽利用空间 (1000-40)/6 ≈ 160
CardHeight  = 125 // [Modified] 再次减小高度 (原150)
CardGap     = 8   // [Modified] 减小间距
CardsPerRow = 6

// 字体大小
FontSizeTitle       = 48
FontSizeSubtitle    = 20
FontSizeCategory    = 28 // [Modified] 分类标题加大
FontSizeStats       = 20 // [Modified] 统计标签加大
FontSizeStatsVal    = 34 // [Modified] 统计数值加大
FontSizeCardName    = 14 // [Modified] 英文ID加大 (原13->14)
FontSizeCardType    = 13 // [Modified] 类型标记加大 (原12->13)
FontSizeCardMain    = 32 // [Modified] 主标题(中文)更大 (原28->32)
FontSizeCardSubName = 14 // [Modified] 子分类加大 (原12->14)
FontSizeCardStatus  = 13 // [Modified] 状态文字加大 

// 头部高度
HeaderHeight = 180 // [Modified] 减小头部高度 (原220)

// 分类标题高度
CategoryHeaderHeight = 55

// 圆角
RadiusLarge  = 20
RadiusMedium = 12
RadiusSmall  = 8
)
