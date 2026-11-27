# 📖 网易大神光翼 / 藏宝阁衣柜 API

> **服务接口地址**：
> - **生产主线（推荐 / Cloudflare 保护）**：`https://cf-guangyi.vincentzyu233.cn`
> - **国内备用（直连低延迟）**：`https://guangyi.vincentzyu233.cn`
>
> 公网仅开放 3 个接口：`/checkHealth`、`/queryGuangyi`、`/queryCbgInv`；其余管理端点不对公网开放。

## 🔌 公网接口

### 🩺 1. 健康检查

```
GET /checkHealth
```

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/checkHealth"
```

**返回示例（200）：**
```json
{
  "status": "ok",
  "code": 200,
  "version": "0.6.1",
  "timestamp": "2026-11-26T22:21:25.790975"
}
```

`status` 为 `ok` / `degraded`，仅用于存活探活，不返回任何藏宝阁/Token 内部状态。

### 🪽 2. 查询光翼数据 ⭐

```
GET /queryGuangyi?id=380594330
```

**参数：**
- `id` (必填)：角色 ID

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=380594330"
```

**返回示例：**
```json
{
  "success": true,
  "roleId": "380594330",
  "server": "8000",
  "timestamp": "2026-11-26T22:21:28.837391",
  "data": {
    "result": "{\"result\":\"ok\",\"wing_buffs\":[...]}"
  }
}
```

**错误：** `400` 参数错误（如 `code=803`）、`401` Token 过期、`503` 签名服务/Token 未就绪。

### 🎒 3. 查询藏宝阁衣柜

```
GET /queryCbgInv?id=37ec67d8-b55b-4cb3-b124-b20b67a98a10
```

**参数：**
- `id` (必填)：角色原 ID（UUID）；**不支持短 ID**

**请求示例：**
```bash
curl "https://cf-guangyi.vincentzyu233.cn/queryCbgInv?id=37ec67d8-b55b-4cb3-b124-b20b67a98a10"
```

**返回示例：**
```json
{
  "success": true,
  "roleId": "37ec67d8-b55b-4cb3-b124-b20b67a98a10",
  "server": "8000",
  "timestamp": "2026-11-26T22:21:30.000000",
  "total": 390,
  "uniqueTotal": 390,
  "categories": [
    {
      "key": "outfit",
      "label": "装扮",
      "items": []
    }
  ]
}
```

**错误：** `400` 使用了短 ID、`401` 藏宝阁会话失效（需重新登录）、`404` 未查询到衣柜、`503` 藏宝阁会话未就绪。

## 💡 使用示例

### 🐍 Python

```python
import requests

base = "https://cf-guangyi.vincentzyu233.cn"

print(requests.get(f"{base}/checkHealth").json())
print(requests.get(f"{base}/queryGuangyi", params={"id": "380594330"}).json())
print(
    requests.get(
        f"{base}/queryCbgInv",
        params={"id": "37ec67d8-b55b-4cb3-b124-b20b67a98a10"},
    ).json()
)
```

### 🟨 JavaScript / Node.js

```javascript
const base = 'https://cf-guangyi.vincentzyu233.cn'

for (const url of [
  `${base}/checkHealth`,
  `${base}/queryGuangyi?id=380594330`,
  `${base}/queryCbgInv?id=37ec67d8-b55b-4cb3-b124-b20b67a98a10`,
]) {
  const res = await fetch(url)
  console.log(url, await res.json())
}
```

### 🌐 cURL

```bash
base="https://cf-guangyi.vincentzyu233.cn"

curl -s "$base/checkHealth" | jq
curl -s "$base/queryGuangyi?id=380594330" | jq
curl -s "$base/queryCbgInv?id=37ec67d8-b55b-4cb3-b124-b20b67a98a10" | jq
```

### 🧪 自动化测试脚本（4 语言等价）

默认角色为美西螈斗篷（短 ID `380594330` / UUID `37ec67d8-b55b-4cb3-b124-b20b67a98a10`），覆盖 CF 主线和国内直连，只测试 3 个公网接口：

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
