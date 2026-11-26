# API

公网仅开放 3 个接口，其余管理端点不对外网开放。

## 线路

- 国内直连：`https://guangyi.vincentzyu233.cn`
- CF 线路：`https://cf-guangyi.vincentzyu233.cn`

## `GET /checkHealth`

精简健康检查。

```bash
curl "https://cf-guangyi.vincentzyu233.cn/checkHealth"
```

```json
{
  "status": "ok",
  "code": 200,
  "version": "0.5.0",
  "timestamp": "2026-11-27T10:00:00",
  "cbg": { "mode": "browser", "logged_in": true }
}
```

## `GET /queryGuangyi?id=<短ID>`

```bash
curl "https://cf-guangyi.vincentzyu233.cn/queryGuangyi?id=380594330"
```

返回 `data.result`，其中 `wing_buffs` 为光翼数组。

```json
{
  "success": true,
  "roleId": "380594330",
  "server": "8000",
  "timestamp": "2026-11-27T10:00:00",
  "data": {
    "result": {
      "result": "ok",
      "wing_buffs": [
        { "name": "wing_1", "collected": true },
        { "name": "wing_2", "collected": false }
      ]
    }
  }
}
```

> 原始响应中 `data.result` 是 JSON 字符串，需要再 `JSON.parse` 一次才能得到上面的对象。

## `GET /queryCbgInv?id=<UUID>`

```bash
curl "https://cf-guangyi.vincentzyu233.cn/queryCbgInv?id=37ec67d8-b55b-4cb3-b124-b20b67a98a10"
```

返回 `categories`，每个分类包含 `items`（`id` / `name` / `season` / `icon`）。

```json
{
  "success": true,
  "roleId": "37ec67d8-b55b-4cb3-b124-b20b67a98a10",
  "server": "8000",
  "timestamp": "2026-11-27T10:00:00",
  "total": 390,
  "uniqueTotal": 386,
  "categories": [
    {
      "key": "outfit",
      "label": "上衣",
      "count": 2,
      "items": [
        {
          "id": "1001",
          "name": "示例上衣 A",
          "season": "晨岛",
          "icon": "https://cbg-sky.res.netease.com/game_res/icon_1001.png"
        },
        {
          "id": "1002",
          "name": "示例上衣 B",
          "season": "云野",
          "icon": "https://cbg-sky.res.netease.com/game_res/icon_1002.png"
        }
      ]
    }
  ]
}
```

## 错误

| 状态码 | 说明 |
| :--- | :--- |
| 400 | 参数错误或使用了短 ID 查衣柜 |
| 401 | Token / 藏宝阁会话失效 |
| 404 | 未查询到衣柜数据 |
| 429 | 超过公网限流（25 次/分钟/IP） |
| 503 | 服务未就绪 |
