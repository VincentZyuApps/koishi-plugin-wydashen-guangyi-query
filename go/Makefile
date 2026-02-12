.PHONY: build build-all clean test version

# 二进制名称
BINARY_NAME=wing-renderer

# 输出目录
OUTPUT_DIR=../bin

# 从 ../package.json 读取版本号（与 npm 包版本保持一致）
VERSION=$(shell cat ../package.json 2>/dev/null | grep '"version"' | head -1 | sed 's/.*: "\(.*\)".*/\1/' || echo "dev")
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS=-ldflags "-s -w -X main.Version=v$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT)"

# 显示版本信息
version:
	@echo "Version: v$(VERSION)"
	@echo "Build time: $(BUILD_TIME)"
	@echo "Git commit: $(GIT_COMMIT)"

# 默认目标：编译当前平台
build:
	@mkdir -p $(OUTPUT_DIR)
	go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME) .
	@echo "✅ 编译完成: $(OUTPUT_DIR)/$(BINARY_NAME) (v$(VERSION))"

# 编译所有平台（带版本号后缀）
build-all: clean
	@mkdir -p $(OUTPUT_DIR)
	@echo "📦 版本: v$(VERSION)"
	
	@echo "🔨 编译 linux/amd64..."
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-amd64-v$(VERSION) .
	
	@echo "🔨 编译 linux/arm64..."
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-arm64-v$(VERSION) .
	
	@echo "🔨 编译 darwin/amd64..."
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-amd64-v$(VERSION) .
	
	@echo "🔨 编译 darwin/arm64..."
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-arm64-v$(VERSION) .
	
	@echo "🔨 编译 windows/amd64..."
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(OUTPUT_DIR)/$(BINARY_NAME)-windows-amd64-v$(VERSION).exe .
	
	@echo "✅ 所有平台编译完成! (v$(VERSION))"
	@ls -la $(OUTPUT_DIR)/

# 清理
clean:
	rm -rf $(OUTPUT_DIR)

# 运行测试
test:
	go test -v ./...

# 安装依赖
deps:
	go mod download
	go mod tidy

# 运行（用于开发测试）
run:
	go run . < test_input.json

# 格式化代码
fmt:
	go fmt ./...
	gofmt -s -w .
