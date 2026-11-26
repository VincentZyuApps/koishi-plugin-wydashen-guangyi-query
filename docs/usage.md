# 插件用法

## 安装

```bash
yarn add koishi-plugin-wydashen-guangyi-query
```

## 命令

- `查询光翼 <角色ID>`：Canvas 渲染光翼图片
- `查询光翼-pptr <角色ID>`：Puppeteer 渲染光翼图片
- 支持 OneBot 合并转发

## 配置

在 Koishi 控制台中配置：

- `backendUrl`：API 地址，默认使用生产地址
- 渲染引擎：Canvas / Puppeteer
- 图片类型与质量
- 自定义字体（Puppeteer）

## 注意

- 光翼查询使用**短 ID**
- 藏宝阁衣柜查询使用 **UUID**，暂不支持短 ID
- 公网接口共享 25 次/分钟/IP 限流
