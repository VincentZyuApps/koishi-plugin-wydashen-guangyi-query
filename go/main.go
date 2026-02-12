package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/VincentZyuApps/wing-renderer/renderer"
	"github.com/VincentZyuApps/wing-renderer/types"
)

// 版本信息（构建时通过 -ldflags 注入）
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// 支持 --version 参数
	if len(os.Args) > 1 && (os.Args[1] == "--version" || os.Args[1] == "-v") {
		fmt.Printf("wing-renderer %s\n", Version)
		fmt.Printf("Build time: %s\n", BuildTime)
		fmt.Printf("Git commit: %s\n", GitCommit)
		return
	}

	// 从 stdin 读取 JSON
	reader := bufio.NewReader(os.Stdin)
	inputData, err := io.ReadAll(reader)
	if err != nil {
		outputError(fmt.Sprintf("读取输入失败: %v", err))
		return
	}

	// 解析输入
	var input types.RenderInput
	if err := json.Unmarshal(inputData, &input); err != nil {
		outputError(fmt.Sprintf("解析输入 JSON 失败: %v", err))
		return
	}

	// 验证输入
	if input.RoleID == "" {
		outputError("缺少 roleId")
		return
	}

	// 设置默认值
	if input.Config.ContainerWidth == 0 {
		input.Config.ContainerWidth = 1200
	}
	if input.Config.OutputFormat == "" {
		input.Config.OutputFormat = "png"
	}

	// 创建渲染器（传入自定义字体路径）
	r, err := renderer.NewRenderer(input.Config.CustomFontPath)
	if err != nil {
		outputError(fmt.Sprintf("创建渲染器失败: %v", err))
		return
	}

	// 渲染为 PNG
	base64Data, err := r.RenderToPNG(&input)
	if err != nil {
		outputError(fmt.Sprintf("渲染失败: %v", err))
		return
	}

	// 输出结果
	output := types.RenderOutput{
		Success: true,
		Format:  "png",
		Data:    base64Data,
	}

	outputJSON, _ := json.Marshal(output)
	fmt.Print(string(outputJSON))
}

func outputError(msg string) {
	output := types.RenderOutput{
		Success: false,
		Error:   msg,
	}
	outputJSON, _ := json.Marshal(output)
	fmt.Print(string(outputJSON))
}
