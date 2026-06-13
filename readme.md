![koishi-plugin-wydashen-guangyi-query](https://socialify.git.ci/VincentZyuApps/koishi-plugin-wydashen-guangyi-query/image?description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff3%2FKoishi.js_Logo.png%2F330px-Koishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-wydashen-guangyi-query 🕊️

[![npm](https://img.shields.io/npm/v/koishi-plugin-wydashen-guangyi-query?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query)
[![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-wydashen-guangyi-query?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query)

[![GitHub](https://img.shields.io/badge/GitHub-点我查看_Readme-181717?logo=github&style=for-the-badge)](https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query)
[![Gitee](https://img.shields.io/badge/Gitee-点我查看_Readme-C71D23?logo=gitee&style=for-the-badge)](https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query)

[![Koishi Forum](https://img.shields.io/badge/forum.koishi.xyz_topic_12467-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/12467)
[![awa群-zyu建的qq群](https://img.shields.io/badge/awa群_zyu建的qq群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/4vjto4V7Di)
[![光遇Bot群](https://img.shields.io/badge/光遇Bot群-475328908-D63A4D?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/oVxZoksppK)

查询**光遇国服**玩家的**光翼（Winged Light）**获取情况，支持 **Puppeteer** 和 **@napi-rs/canvas** 双渲染引擎。

输入玩家角色ID，即可生成一张光翼收集情况的图片，按地图分类展示已收集与未收集的光翼。

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b> 🎉（这个群G了</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>🤖 Nonebot / Koishi /  Zerobot... Python JavaScript TypeScript Go... 等等技术交流 欢迎也来讨论 sky光遇bot交流qq群：<b>475328908</b></p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

> ⚠️ 如果查询光翼的后端挂了，请到群里找 **vincentzyu** 反馈~

---

## ⚡ 双引擎渲染

本插件支持两种渲染方式：

- **Puppeteer 渲染** — 默认方式，需要 puppeteer 服务，效果精美
- **@napi-rs/canvas 渲染** — 可选方式，无需 Puppeteer，性能更高，支持深色模式

---

## 🎮 指令

| 指令 | 说明 |
| --- | --- |
| `查询光翼 <角色ID>` | 使用 Puppeteer 渲染图片返回光翼收集情况 |
| `查询光翼-canvas <角色ID>` / `aqgc` | 使用 @napi-rs/canvas (Skia) 渲染（性能更高 ⚡） |
| `查询光翼-forward <角色ID>` | 以合并转发消息返回（仅 OneBot 平台） |
| `获取id方法` | 查看如何获取自己的角色ID |
| `刷新光翼` | 手动刷新光翼映射数据 |

### 查询光翼 \<玩家id\>
> 返回结果
![assets/query_res.png](assets/query_res.png)

### 查询光翼-canvas \<玩家id\>
> 返回结果（示例）
<!-- TODO: 替换为 canvas 渲染效果图 -->

### 获取id方法
> 返回结果
![assets/tutorial_new_20251026.png](assets/tutorial_new_20251026.png)

---

## 📚 更多文档

| 文档 | 说明 |
|------|------|
| [📡 API 文档](doc/api.md) | 后端 API 端点说明 |
