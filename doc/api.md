## API 端点

### 1. 根路径

```
GET /
```

**请求示例：**
```bash
curl "http://bluerosion.vincentzyu233.cn:51024/"
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

### 2. 健康检查

```
GET /checkhealth
```

**请求示例：**
```bash
curl "http://bluerosion.vincentzyu233.cn:51024/checkhealth"
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

### 3. 查询光翼数据 ⭐

```
GET /queryGuangyi?id=角色ID
```

**参数：**
- `id` (必填): 角色 ID

**请求示例：**
```bash
curl "http://bluerosion.vincentzyu233.cn:51024/queryGuangyi?id=137106295"
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

## 使用示例

### Python 测试脚本
```shell
python ./scripts/test.py
```

### Python 写法

```python
import requests

# 健康检查
response = requests.get("http://bluerosion.vincentzyu233.cn:51024/checkhealth")
print(response.json())

# 查询光翼数据
response = requests.get("http://bluerosion.vincentzyu233.cn:51024/queryGuangyi", params={"id": "137106295"})
print(response.json())
```

### JavaScript 写法

```javascript
// 健康检查
fetch('http://bluerosion.vincentzyu233.cn:51024/checkhealth')
  .then(res => res.json())
  .then(data => console.log(data));

// 查询光翼数据
fetch('http://bluerosion.vincentzyu233.cn:51024/queryGuangyi?id=137106295')
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL

### Linux Bash

```bash
curl "http://bluerosion.vincentzyu233.cn:51024/" | jq
# 健康检查
curl "http://bluerosion.vincentzyu233.cn:51024/checkhealth" | jq
# 查询光翼数据
curl "http://bluerosion.vincentzyu233.cn:51024/queryGuangyi?id=137106295" | jq
```

### Windows Powershell

```powershell
[System.Text.Encoding]::UTF8.GetString((Invoke-WebRequest "http://bluerosion.vincentzyu233.cn:51024/").RawContentStream.ToArray()) | ConvertFrom-Json | ConvertTo-Json -Depth 100
# 健康检查
[System.Text.Encoding]::UTF8.GetString((Invoke-WebRequest "http://bluerosion.vincentzyu233.cn:51024/checkhealth").RawContentStream.ToArray()) | ConvertFrom-Json | ConvertTo-Json -Depth 100
# 查询光翼数据
[System.Text.Encoding]::UTF8.GetString((Invoke-WebRequest "http://bluerosion.vincentzyu233.cn:51024/queryGuangyi?id=137106295").RawContentStream.ToArray()) | ConvertFrom-Json | ConvertTo-Json -Depth 100
```
