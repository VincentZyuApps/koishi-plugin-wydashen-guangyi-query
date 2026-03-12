![koishi-plugin-wydashen-guangyi-query](https://socialify.git.ci/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/image?description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&name=1&owner=1&pattern=Plus&stargazers=1&theme=Auto)

# koishi-plugin-wydashen-guangyi-query 🕊️

[![npm](https://img.shields.io/npm/v/koishi-plugin-wydashen-guangyi-query?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query) [![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-wydashen-guangyi-query?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query)
[![GitHub](https://img.shields.io/badge/GitHub-点我查看_Readme-181717?logo=github&style=for-the-badge)](https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query)
[![Gitee](https://img.shields.io/badge/Gitee-点我查看_Readme-C71D23?logo=gitee&style=for-the-badge)](https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query)

查询**光遇国服**玩家的**光翼（Winged Light）**获取情况，支持 **Puppeteer** 和 **Go** 双渲染引擎。

输入玩家角色ID，即可生成一张光翼收集情况的图片，按地图分类展示已收集与未收集的光翼。

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b> 🎉（这个群G了</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>🤖 Nonebot Koishi Zerobot... py js go... sky光遇bot交流qq群：<b>475328908</b></p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

> ⚠️ 如果查询光翼的后端挂了，请到群里找 **vincentzyu** 反馈~

<div align="center">

<br/>

**Go 渲染器下载 (支持 Windows / Linux / macOS - x86 / ARM)**

[![GitHub Releases](https://img.shields.io/badge/GitHub-Go_Renderer_Binary-181717?logo=github&style=for-the-badge)](https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/releases)
[![Gitee Releases](https://img.shields.io/badge/Gitee-Go_Renderer_Binary-C71D23?logo=gitee&style=for-the-badge)](https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query/releases)

</div>

---

## ⚡ 双引擎渲染

本插件支持两种渲染方式：

- **Puppeteer 渲染** — 默认方式，需要 puppeteer 服务，效果精美
- **Go 渲染器** — 可选方式，无需 Puppeteer，性能更高，支持深色模式

---

## 🎮 指令

| 指令 | 说明 |
| --- | --- |
| `查询光翼 <角色ID>` | 使用 Puppeteer 渲染图片返回光翼收集情况 |
| `查询光翼-go <角色ID>` | 使用 Go 渲染器渲染（性能更高 ⚡） |
| `查询光翼-forward <角色ID>` | 以合并转发消息返回（仅 OneBot 平台） |
| `获取id方法` | 查看如何获取自己的角色ID |
| `刷新光翼` | 手动刷新光翼映射数据 |

### 查询光翼 \<玩家id\>
> 返回结果
![assets/query_res.png](assets/query_res.png)

### 查询光翼-go \<玩家id\>
> 返回结果
![assets/query_go_res.png](assets/query_go_res.png)

### 获取id方法
> 返回结果
![assets/tutorial_new_20251026.png](assets/tutorial_new_20251026.png)

---

## 📚 更多文档

| 文档 | 说明 |
|------|------|
| [📡 API 文档](doc/api.md) | 后端 API 端点说明 |
| [🔧 构建与发布工作流](.github/workflows/build-go-renderer.md) | CI/CD 流水线说明、关键词触发、Gitee 同步配置 |
