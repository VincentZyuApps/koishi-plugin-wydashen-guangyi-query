package renderer

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image/color"
	"image/png"
	"os"

	"github.com/VincentZyuApps/wing-renderer/types"
	"github.com/fogleman/gg"
	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
)

// Renderer 渲染器
type Renderer struct {
	fontParsed     *opentype.Font // 保存解析后的字体，用于动态生成大小
	fontRegular    font.Face
	fontBold       font.Face
	customFontPath string
	theme          Theme // 当前生效的主题
	isDarkMode     bool  // 当前是否为暗色模式
}

// NewRenderer 创建渲染器
func NewRenderer(customFontPath string) (*Renderer, error) {
	r := &Renderer{
		customFontPath: customFontPath,
	}

	// 尝试加载字体
	if err := r.loadFonts(); err != nil {
		return nil, fmt.Errorf("load fonts: %w", err)
	}

	return r, nil
}

// loadFonts 加载字体
func (r *Renderer) loadFonts() error {
	// 字体路径列表：自定义字体优先
	fontPaths := []string{}

	// 如果有自定义字体路径，优先使用
	if r.customFontPath != "" {
		fontPaths = append(fontPaths, r.customFontPath)
	}

	// 系统字体路径（TTF 单字体文件优先）
	systemFontPaths := []string{
		// TTF 单字体文件优先
		"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
		"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
		"/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
		"/usr/share/fonts/truetype/freefont/FreeSans.ttf",
		"/usr/share/fonts/TTF/DejaVuSans.ttf",
		// Windows
		"C:\\Windows\\Fonts\\arial.ttf",
		"C:\\Windows\\Fonts\\segoeui.ttf",
		// macOS
		"/Library/Fonts/Arial.ttf",
		"/System/Library/Fonts/Helvetica.ttc",
	}

	// 合并字体路径列表
	fontPaths = append(fontPaths, systemFontPaths...)

	var fontData []byte
	var err error

	for _, p := range fontPaths {
		fontData, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}

	if fontData == nil {
		// 如果找不到字体，使用 nil 表示后面用 gg 默认处理
		r.fontParsed = nil
		r.fontRegular = nil
		r.fontBold = nil
		return nil
	}

	// 解析字体
	f, err := opentype.Parse(fontData)
	if err != nil {
		// 解析失败，不报错，用默认方式
		r.fontParsed = nil
		r.fontRegular = nil
		r.fontBold = nil
		return nil
	}
	r.fontParsed = f

	// 创建默认大小的字体 face (为了兼容旧代码)
	r.fontRegular, err = opentype.NewFace(f, &opentype.FaceOptions{
		Size:    FontSizeCardName,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		r.fontRegular = nil
	}

	r.fontBold, err = opentype.NewFace(f, &opentype.FaceOptions{
		Size:    FontSizeTitle,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		r.fontBold = r.fontRegular
	}

	return nil
}

// RenderToPNG 渲染为PNG
func (r *Renderer) RenderToPNG(input *types.RenderInput) (string, error) {
	// 设置主题
	if input.Config.DarkMode {
		r.theme = DarkTheme
		r.isDarkMode = true
	} else {
		r.theme = LightTheme
		r.isDarkMode = false
	}

	// 处理光翼数据
	processedWings := ProcessWingData(input.WingBuffs, input.WingMap)

	// 计算图片高度
	height := r.calculateImageHeight(processedWings, input.Config.SeparateByCategory)

	// 创建画布
	dc := gg.NewContext(ImageWidth, height)

	// 绘制背景
	r.drawBackground(dc, height)

	// 绘制头部
	r.drawHeader(dc, input.RoleID, processedWings)

	// 绘制光翼卡片
	r.drawWings(dc, processedWings, input.Config)

	// 编码为 PNG
	img := dc.Image()
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", fmt.Errorf("encode png: %w", err)
	}

	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

// calculateImageHeight 计算图片高度
func (r *Renderer) calculateImageHeight(wings []types.ProcessedWing, separateByCategory bool) int {
	height := PaddingOuter*2 + HeaderHeight + PaddingInner

	if separateByCategory {
		grouped := GroupByCategory(wings)
		for _, cat := range CategoryOrder {
			if catWings, ok := grouped[cat]; ok && len(catWings) > 0 {
				// 分类标题
				height += CategoryHeaderHeight + PaddingCard
				// 卡片行数
				rows := (len(catWings) + CardsPerRow - 1) / CardsPerRow
				height += rows*(CardHeight+CardGap) + PaddingInner
			}
		}
	} else {
		rows := (len(wings) + CardsPerRow - 1) / CardsPerRow
		height += rows * (CardHeight + CardGap)
	}

	height += PaddingOuter
	return height
}

// drawBackground 绘制背景
func (r *Renderer) drawBackground(dc *gg.Context, height int) {
	// 主背景 - 纯色填充满
	dc.SetColor(r.theme.ColorBgMain)
	dc.Clear()

	// 渐变头部 (模拟天空)
	grad := gg.NewLinearGradient(0, 0, 0, 400)
	if r.isDarkMode {
		// 暗色模式：深蓝到背景色的渐变
		grad.AddColorStop(0, color.RGBA{30, 40, 70, 255})
		grad.AddColorStop(1, r.theme.ColorBgMain)
	} else {
		// 亮色模式：浅蓝到背景色的渐变
		grad.AddColorStop(0, color.RGBA{217, 236, 255, 255})
		grad.AddColorStop(1, r.theme.ColorBgMain)
	}
	dc.SetFillStyle(grad)
	dc.DrawRectangle(0, 0, float64(ImageWidth), 400)
	dc.Fill()
}

// drawHeader 绘制头部
func (r *Renderer) drawHeader(dc *gg.Context, roleID string, wings []types.ProcessedWing) {
	x := float64(PaddingOuter)
	y := float64(PaddingOuter)
	w := float64(ImageWidth - PaddingOuter*2)
	h := float64(HeaderHeight)

	// 头部背景 (半透明白卡片)
	// 强制亮色模式下使用纯白，确保显示正确
	headerBg := r.theme.ColorBgHeader
	if !r.isDarkMode {
		headerBg = color.RGBA{255, 255, 255, 255}
	}
	r.drawRoundedRect(dc, x, y, w, h, RadiusLarge, headerBg)

	// 边框
	dc.SetColor(r.theme.ColorBorderLight)
	dc.SetLineWidth(1)
	r.drawRoundedRectStroke(dc, x, y, w, h, RadiusLarge)

	// 1. 标题 (居中)
	titleY := y + 50.0
	dc.SetColor(r.theme.ColorTitle)
	dc.SetFontFace(r.face(FontSizeTitle, true))
	r.drawTextAnchored(dc, "网易国服sky光遇光翼查询", x+w/2, titleY, 0.5, 0.5)

	// 2. 统计数据 (一行四个块)
	total, collected, deposited, notRedeemed := CalculateStats(wings)
	statsY := y + 105.0 // 上移
	statsBlockW := w / 4.0
	
	// 辅助函数绘制统计块
	drawStat := func(label string, value int, color color.RGBA, idx int) {
		bx := x + float64(idx)*statsBlockW
		
		// 数值
		dc.SetColor(color)
		dc.SetFontFace(r.face(FontSizeStatsVal, true))
		r.drawTextAnchored(dc, fmt.Sprintf("%d", value), bx+statsBlockW/2, statsY, 0.5, 1.0) // 底部对齐
		
		// 标签
		dc.SetColor(r.theme.ColorTextSecondary)
		dc.SetFontFace(r.face(FontSizeStats, false))
		r.drawTextAnchored(dc, label, bx+statsBlockW/2, statsY+10, 0.5, 0.0) // 顶部对齐
	}

	drawStat("总光翼", total, r.theme.ColorTextPrimary, 0)
	drawStat("已收集", collected, r.theme.ColorCollectedFg, 1)
	drawStat("已存放", deposited, r.theme.ColorDepositedFg, 2)
	drawStat("未兑换", notRedeemed, r.theme.ColorNotRedeemedFg, 3)

	// 3. 角色ID (右下角或者左上角? 放在右上角比较好看)
	dc.SetColor(r.theme.ColorTextMuted)
	dc.SetFontFace(r.face(14, false))
	r.drawTextAnchored(dc, fmt.Sprintf("RoleID: %s", roleID), x+w-20, y+20, 1.0, 0.5)
}

// drawWings 绘制光翼卡片
func (r *Renderer) drawWings(dc *gg.Context, wings []types.ProcessedWing, config types.RenderConfig) {
	startY := float64(PaddingOuter + HeaderHeight + PaddingInner)

	if config.SeparateByCategory {
		grouped := GroupByCategory(wings)
		currentY := startY

		for _, cat := range CategoryOrder {
			catWings, ok := grouped[cat]
			if !ok || len(catWings) == 0 {
				continue
			}

			// 绘制分类标题
			currentY = r.drawCategoryHeader(dc, cat, catWings, currentY, config)

			// 绘制该分类的卡片
			currentY = r.drawWingCards(dc, catWings, currentY)

			currentY += PaddingInner
		}
	} else {
		r.drawWingCards(dc, wings, startY)
	}
}

// drawCategoryHeader 绘制分类标题
func (r *Renderer) drawCategoryHeader(dc *gg.Context, category string, wings []types.ProcessedWing, y float64, config types.RenderConfig) float64 {
	x := float64(PaddingOuter)
	w := float64(ImageWidth - PaddingOuter*2)
	h := float64(CategoryHeaderHeight)

	// 背景色 - 使用分类色（半透明）
	bgColor := r.theme.ColorBgCard
	if c, ok := r.theme.CategoryColors[category]; ok {
		bgColor = c
	}
	r.drawRoundedRect(dc, x, y, w, h, RadiusMedium, bgColor)

	// 绘制分类内容起始 X 坐标
	contentStartX := x + PaddingInner

	// 如果需要绘制图标
	if config.ShowPortalIcons && config.PortalIconsPath != "" {
		iconName := ""
		switch category {
		case "晨岛":
			iconName = "chendao.png"
		case "云野":
			iconName = "yunye.png"
		case "雨林":
			iconName = "yulin.png"
		case "霞谷":
			iconName = "xiagu.png"
		case "暮土":
			iconName = "mutu.png"
		case "禁阁":
			iconName = "jinge.png"
		}

		if iconName != "" {
			iconPath := fmt.Sprintf("%s/%s", config.PortalIconsPath, iconName)
			f, err := os.Open(iconPath)
			if err == nil {
				defer f.Close()
				img, err := png.Decode(f)
				if err == nil {
					// 绘制图标，高度设定为 Header 高度的 80% 左右
					iconH := h * 0.8
					srcW := float64(img.Bounds().Dx())
					srcH := float64(img.Bounds().Dy())
					scale := iconH / srcH
					iconW := srcW * scale
					
					// 使用变换矩阵缩放绘制
					dc.Push()
					dc.Translate(contentStartX, y+(h-iconH)/2)
					dc.Scale(scale, scale)
					dc.DrawImage(img, 0, 0)
					dc.Pop()
					
					// 调整文字起始位置 (图标宽 + 间距)
					contentStartX += iconW + 10
				}
			}
		}
	}

	// 分类名称
	dc.SetColor(r.theme.ColorTextPrimary)
	// 用更粗的字
	dc.SetFontFace(r.face(FontSizeCategory, true))
	r.drawTextAnchored(dc, fmt.Sprintf("🏷️ %s", category), contentStartX, y+h/2, 0, 0.5)

	// 统计
	total, collected := CalculateCategoryStats(wings)
	percent := 0.0
	if total > 0 {
		percent = float64(collected) / float64(total) * 100
	}
	
	// 绘制统计条
	statsText := fmt.Sprintf("总数: %d | 已收集: %d | 进度: %.1f%%", total, collected, percent)
	dc.SetColor(r.theme.ColorTextSecondary)
	dc.SetFontFace(r.face(FontSizeStats, false))
	r.drawTextAnchored(dc, statsText, x+w-PaddingInner, y+h/2, 1, 0.5)

	return y + h + PaddingCard
}

// drawWingCards 绘制光翼卡片网格
func (r *Renderer) drawWingCards(dc *gg.Context, wings []types.ProcessedWing, startY float64) float64 {
	startX := float64(PaddingOuter)
	currentY := startY

	for i, wing := range wings {
		col := i % CardsPerRow
		row := i / CardsPerRow

		x := startX + float64(col)*(CardWidth+CardGap)
		y := currentY + float64(row)*(CardHeight+CardGap)

		r.drawWingCard(dc, &wing, x, y)
	}

	rows := (len(wings) + CardsPerRow - 1) / CardsPerRow
	return currentY + float64(rows)*(CardHeight+CardGap)
}

// drawWingCard 绘制单个光翼卡片
func (r *Renderer) drawWingCard(dc *gg.Context, wing *types.ProcessedWing, x, y float64) {
	w := float64(CardWidth)
	h := float64(CardHeight)

	// 根据状态配置样式
	var statusBg, statusFg color.RGBA
	var statusText, statusIcon string
	
	switch wing.Status {
	case types.StatusCollected:
		statusBg = r.theme.ColorCollectedBg
		statusFg = r.theme.ColorCollectedFg
		statusText = "已收集"
		statusIcon = "✓"
	case types.StatusDeposited:
		statusBg = r.theme.ColorDepositedBg
		statusFg = r.theme.ColorDepositedFg
		statusText = "已存放"
		statusIcon = "📦"
	case types.StatusNotRedeemed:
		statusBg = r.theme.ColorNotRedeemedBg
		statusFg = r.theme.ColorNotRedeemedFg
		statusText = "未兑换"
		statusIcon = "🔒"
	default: // StatusUncollected
		statusBg = r.theme.ColorUncollectedBg
		statusFg = r.theme.ColorUncollectedFg
		statusText = "未收集"
		statusIcon = "❓"
	}

	// 1. 卡片背景与阴影
	// 简单阴影
	dc.SetColor(color.RGBA{0, 0, 0, 10})
	dc.DrawRoundedRectangle(x+2, y+2, w, h, RadiusMedium)
	dc.Fill()
	
	// 卡片主体
	r.drawRoundedRect(dc, x, y, w, h, RadiusMedium, r.theme.ColorBgCard)
	
	// 边框 (如果是已收集，可以用强调色边框，或者普通边框)
	borderColor := r.theme.ColorBorderLight
	if wing.Status == types.StatusCollected {
		borderColor = color.RGBA{179, 216, 255, 255} // 淡蓝色边框
	}
	dc.SetColor(borderColor)
	dc.SetLineWidth(1)
	dc.DrawRoundedRectangle(x, y, w, h, RadiusMedium)
	dc.Stroke()

	// 2. 状态标签 (左上角胶囊, 稍微缩小)
	badgeH := 20.0
	badgeW := 60.0 
	
	// 绘制 Badge 背景
	dc.SetColor(statusBg)
	dc.DrawRoundedRectangle(x+4, y+4, badgeW, badgeH, RadiusSmall) // 稍微内缩
	dc.Fill()
	
	// 3. Badge 内容
	dc.SetColor(statusFg)
	dc.SetFontFace(r.face(FontSizeCardStatus, true))
	r.drawTextAnchored(dc, fmt.Sprintf("%s %s", statusIcon, statusText), x+4+badgeW/2, y+4+badgeH/2-1, 0.5, 0.45)

	// 4. 英文ID (Name) - 顶部居中 (变大，加粗，深灰)
	nameY := y + 36.0 
	name := wing.DisplayName 
	
	// 省略号处理
	if len(name) > 18 {
		name = name[:16] + ".."
	}
	
	dc.SetColor(r.theme.ColorTextSecondary) 
	dc.SetFontFace(r.face(FontSizeCardName, true)) // [Modified] 改为粗体
	r.drawTextAnchored(dc, name, x+w/2, nameY, 0.5, 0.5)

	// 5. 类型标记 - ID下方 (变大，加粗，深灰)
	typeY := nameY + 18.0
	typeLabel := "【地图光翼】"
	if wing.IsSpirit {
		typeLabel = "【永久光翼】"
	}
	dc.SetColor(r.theme.ColorTextSecondary) 
	dc.SetFontFace(r.face(FontSizeCardType, true)) 
	r.drawTextAnchored(dc, typeLabel, x+w/2, typeY, 0.5, 0.5)

	// 6. 中文分类 (Category) - 中间醒目
	// 稍微下移一点
	mainY := y + h/2 + 10
	dc.SetColor(r.theme.ColorTextPrimary)
	// 如果分类名太长，稍微缩小
	mainSize := float64(FontSizeCardMain)
	if len(wing.Category) > 5 { 
		mainSize = 24
	}
	dc.SetFontFace(r.face(mainSize, true))
	r.drawTextAnchored(dc, wing.Category, x+w/2, mainY, 0.5, 0.5)

	// 7. 子分类 (SubCategory) - 底部 (变大，加粗，深灰)
	subY := y + h - 16.0
	subText := wing.SubCategory
	if subText == "" {
		subText = "-"
	}
	
	dc.SetColor(r.theme.ColorTextSecondary)
	dc.SetFontFace(r.face(FontSizeCardSubName, true)) // [Modified] 改为粗体
	r.drawTextAnchored(dc, subText, x+w/2, subY, 0.5, 0.5)
}

// ========== 辅助绘图函数 ==========

func (r *Renderer) drawRoundedRect(dc *gg.Context, x, y, w, h, radius float64, c color.Color) {
	dc.SetColor(c)
	dc.DrawRoundedRectangle(x, y, w, h, radius)
	dc.Fill()
}

func (r *Renderer) drawRoundedRectStroke(dc *gg.Context, x, y, w, h, radius float64) {
	dc.DrawRoundedRectangle(x, y, w, h, radius)
	dc.Stroke()
}

func (r *Renderer) drawTextAnchored(dc *gg.Context, text string, x, y, ax, ay float64) {
	dc.DrawStringAnchored(text, x, y, ax, ay)
}

// face 获取字体 face ( helper )
func (r *Renderer) face(size float64, bold bool) font.Face {
	// 这里需要动态调整大小，因为 loadFonts 只加载了固定大小
	// 实际上 fogleman/gg 的 SetFontFace 只能接受预加载的 Face
	// 所以我们应该在 loadFonts 加载多个 size，或者使用 gg.LoadFontFace 动态加载
	
	// 简单起见，使用 DrawStringAnchored 会用当前 context 的 font face
	// 我们需要重新生成 Face 吗？
	// opentype.NewFace 相对昂贵。
	
	// 为了最佳效果，我们应该修改 Renderer 结构体缓存不同大小的字体，或者每次重新 NewFace (性能损耗)
	// 考虑到这是一次性生成图片，每次 NewFace 性能也是可以接受的 (<10ms)
	
	if r.fontRegular == nil {
		// fallback default
		return nil
	}
	
	// 临时生成对应大小的 face
	// 注意：这里需要保存解析后的 font 结构体 *opentype.Font 到 Renderer 中
	// 我们修改 loadFonts 来保存 fontParsed
	
	// 如果还是用的旧结构，只能复用 fontBold / fontRegular (它们是固定大小)
	// 所以为了支持多种 size，必须保存 *opentype.Font
	
	if r.fontParsed == nil {
		if bold {
			return r.fontBold
		}
		return r.fontRegular
	}
	
	f, err := opentype.NewFace(r.fontParsed, &opentype.FaceOptions{
		Size:    size,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		return r.fontRegular
	}
	return f
}
