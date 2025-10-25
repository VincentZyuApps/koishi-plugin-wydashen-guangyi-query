## API 端点

### 1. 根路径

```
GET /
```

返回服务基本信息。

### 2. 健康检查

```
GET /checkhealth
```

返回示例：
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T12:00:00.000000",
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
  }
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
curl "http://sh-aliyun2.vincentzyu233.cn:51024/queryGuangyi?id=137106295"
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

### 4. 重新连接 Frida

```
POST /reconnect
```

用于调试时手动重新连接 Frida。

## 使用示例

### Python 测试脚本
```shell
python test_client.py
```

### Python 客户端

```python
import requests

# 健康检查
response = requests.get("http://sh-aliyun2.vincentzyu233.cn:51024/checkhealth")
print(response.json())

# 查询光翼数据
response = requests.get("http://sh-aliyun2.vincentzyu233.cn:51024/queryGuangyi", params={"id": "137106295"})
print(response.json())
```

### JavaScript 客户端

```javascript
// 健康检查
fetch('http://sh-aliyun2.vincentzyu233.cn:51024/checkhealth')
  .then(res => res.json())
  .then(data => console.log(data));

// 查询光翼数据
fetch('http://sh-aliyun2.vincentzyu233.cn:51024/queryGuangyi?id=137106295')
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL

```bash
# 健康检查
curl http://sh-aliyun2.vincentzyu233.cn:51024/checkhealth

# 查询光翼数据
curl "http://sh-aliyun2.vincentzyu233.cn:51024/queryGuangyi?id=137106295"
```
