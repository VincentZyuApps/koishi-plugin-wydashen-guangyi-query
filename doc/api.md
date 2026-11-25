# 📖 网易大神光翼查询 API 接口文档

> **服务接口地址**：
> - **生产主线（推荐 / Cloudflare 保护）**：`https://cf-guangyi.vincentzyu233.cn`
> - **国内备用（直连低延迟）**：`https://guangyi.vincentzyu233.cn`
> - 全接口启用 HTTPS 与 CORS 跨域支持。

## 🔌 API 端点

### 🏠 1. 根路径

```
GET /
```

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/"
```

**返回示例：**
```json
{
  "service": "网易大神光翼查询 API",
  "timestamp_unix": 1749984931,
  "timestamp_formatted": "2026年6月15日00:45:31",
  "endpoints": [
    {
      "method": "GET",
      "path": "/",
      "description": "服务根路径，返回所有可用端点和用法"
    },
    {
      "method": "GET",
      "path": "/checkhealth",
      "description": "健康检查，查看 Frida / Token / ADB / 自动登录状态",
      "responses": {
        "200": "服务正常，返回完整状态信息",
        "503": "Token 未就绪或签名服务初始化中"
      }
    },
    {
      "method": "GET",
      "path": "/queryGuangyi?id={roleId}",
      "description": "查询指定角色的光翼数据",
      "parameters": { "id": "角色 ID（必填）" },
      "example": "/queryGuangyi?id=137106295",
      "responses": {
        "200": "查询成功，返回光翼数据",
        "400": "业务错误（如参数错误 code=803）",
        "401": "Token 已过期",
        "503": "签名服务或 Token 未就绪"
      }
    },
    {
      "method": "GET",
      "path": "/refreshToken",
      "description": "手动触发 Token 刷新（通过 URS 凭据自动登录）",
      "responses": {
        "200": "刷新成功，返回新 Token 预览",
        "500": "刷新失败",
        "503": "签名服务未就绪"
      }
    }
  ]
}
```

### 🩺 2. 健康检查

```
GET /checkhealth
```

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/checkhealth"
```

**返回示例（200）：**
```json
{
  "status": "ok",
  "code": 200,
  "timestamp": "2026-06-14T22:41:09.610351",
  "frida_ready": true,
  "token_captured": true,
  "token_preview": "89bb282f...",
  "checks": {
    "frida_connected": true,
    "process_found": true,
    "script_loaded": true,
    "adb_connected": true
  },
  "details": {
    "adb_path": "G:\\SSoftwareFiles\\mumu\\MuMu Player 12\\shell\\adb.exe",
    "package": "com.netease.gl",
    "server": "8000"
  },
  "auto_login": {
    "available": true,
    "last_refresh_at": "2026-06-14T03:32:11.258364",
    "has_error": false,
    "gl_version": "4.3.0",
    "device_id_cached": true,
    "device_id_cached_on_disk": true
  }
}
```

**错误返回（503）：**

Token 未就绪：
```json
{
  "status": "token_refresh_needed",
  "code": 503,
  "message": "Token 未就绪或已过期，请在 APP 中执行一次光翼查询以自动刷新"
}
```

签名服务初始化中：
```json
{
  "status": "initializing",
  "code": 503,
  "message": "签名服务正在初始化"
}
```

### 🪽 3. 查询光翼数据 ⭐

```
GET /queryGuangyi?id=角色ID
```

**参数：**
- `id` (必填): 角色 ID

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295"
```

**返回示例：**
```json
{
  "success": true,
  "roleId": "137106295",
  "server": "8000",
  "timestamp": "2025-10-24T12:00:00.000000",
  "data": {
    // 网易服务器返回的实际数据
  }
}
```

## 💡 使用示例

### 🧪 自动化双线测试套件 (4 语言等价)

全套脚本均内置默认玩家 ID Fallback (`137106295`)，支持命令行传参自定义 ID，同时覆盖 Cloudflare 保护线与国内直连备用线：

```bash
# Python 版
uv run python doc/scripts/test-api.py [角色ID]

# Node.js 版
node doc/scripts/test-api.js [角色ID]

# PowerShell 版 (Windows)
powershell -ExecutionPolicy Bypass -File doc/scripts/test-api.ps1 [-RoleId 角色ID]

# Bash / WSL 版
bash doc/scripts/test-api.sh [角色ID]
```

### 🐍 Python 写法

```python
import requests

# 健康检查
response = requests.get("https://cf-guangyi.vincentzyu233.cn/checkhealth")
print(response.json())

# 查询光翼数据
response = requests.get("https://cf-guangyi.vincentzyu233.cn/queryGuangyi", params={"id": "137106295"})
print(response.json())
```

### 🟨 JavaScript / Node.js 写法

```javascript
// 健康检查
fetch('https://cf-guangyi.vincentzyu233.cn/checkhealth')
  .then(res => res.json())
  .then(data => console.log(data));

// 查询光翼数据
fetch('https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 🌐 cURL 指令

> **提示**：在 Windows PowerShell 中，直接运行 `curl` 默认会调用其内置别名 `Invoke-WebRequest`（其语法和表现与原生 cURL 不一致）。
> 显式指定 **`curl.exe`** 可以直接调用 Windows 自带的 原生 Linux 风格 cURL，语法更简洁通用！

#### 🐧 1. Linux / macOS (Bash)

```bash
# 根路径
curl -s "https://cf-guangyi.vincentzyu233.cn/" | jq

# 健康检查
curl -s "https://cf-guangyi.vincentzyu233.cn/checkhealth" | jq

# 查询光翼数据
curl -s "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295" | jq
```

#### ⚡ 2. Windows PowerShell (显式指定 `curl.exe` Linux 风格 ⭐)

```powershell
# 根路径
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/"

# 健康检查 (可配合 ConvertFrom-Json 格式化高亮)
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/checkhealth" | ConvertFrom-Json | ConvertTo-Json -Depth 5

# 查询光翼数据
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295" | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

#### 💻 3. Windows CMD (命令提示符 `curl.exe`)

```cmd
:: 根路径
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/"

:: 健康检查
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/checkhealth"

:: 查询光翼数据
curl.exe -s "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295"
```

#### 📜 4. 原生 PowerShell Cmdlet 写法 (备选)

```powershell
# 根路径
(Invoke-RestMethod "https://cf-guangyi.vincentzyu233.cn/") | ConvertTo-Json -Depth 5

# 健康检查
(Invoke-RestMethod "https://cf-guangyi.vincentzyu233.cn/checkhealth") | ConvertTo-Json -Depth 5

# 查询光翼数据
(Invoke-RestMethod "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=137106295") | ConvertTo-Json -Depth 5
```
