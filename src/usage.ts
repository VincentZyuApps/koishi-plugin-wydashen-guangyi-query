import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

export const usage = `
<h1>Koishi 插件：wydashen-guangyi-query 🕊️</h1>
<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-wydashen-guangyi-query?style=flat-square" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-wydashen-guangyi-query?style=flat-square" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12378" target="_blank">
    <img src="https://img.shields.io/badge/Koishi Forum-12378-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
  <br>
  <a href="https://qm.qq.com/q/4vjto4V7Di" target="_blank">
    <img src="https://img.shields.io/badge/awa群_zyu建的qq群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="awa群-zyu建的qq群">
  </a>
  <a href="https://qm.qq.com/q/oVxZoksppK" target="_blank">
    <img src="https://img.shields.io/badge/光遇Bot群-475328908-D63A4D?style=flat-square&logo=qq&logoColor=white" alt="光遇Bot群">
  </a>
</p>

<h2>🎯 插件版本：<span style="color: #ff6b6b; font-weight: bold;">v${pkg.version}</span></h2>
<p><del>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b> 🎉（已G）</del></p>
<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b style="color: #3498db;">1085190201</b> 🎉</p>
<p>光遇 bot 交流 QQ 群：<b style="color: #EA5252;">475328908</b></p>
<p style="color: #e74c3c;">⚠️ 如果查询光翼的后端挂了，请到群里找 <b>vincentzyu</b> 反馈~</p>

<hr>

<h2 style="color: #3498db;">📖 插件详细说明</h2>

<h3 style="color: #3498db;">📖 插件简介</h3>
<p>查询<b>光遇国服</b>玩家的<b>光翼（Winged Light）</b>获取情况，支持 <b>Puppeteer</b> 和 <b>@napi-rs/canvas</b> 双渲染引擎。</p>
<p>输入玩家角色ID，即可生成一张光翼收集情况的图片，按地图分类展示已收集与未收集的光翼。</p>

<h3 style="color: #27ae60;">🎮 主要指令</h3>
<ul>
  <li><b>查询光翼 &lt;角色ID&gt;</b> — 使用 Puppeteer 渲染图片返回光翼收集情况</li>
  <li><b>查询光翼-canvas &lt;角色ID&gt;</b> / <b>aqgc</b> — 使用 @napi-rs/canvas (Skia) 渲染（性能更高 ⚡）</li>
  <li><b>查询光翼-forward &lt;角色ID&gt;</b> — 以合并转发消息返回（仅 OneBot 平台）</li>
  <li><b>获取id方法</b> — 查看如何获取自己的角色ID</li>
  <li><b>刷新光翼</b> — 手动刷新光翼映射数据</li>
</ul>

<h3 style="color: #e67e22;">⚡ 双引擎渲染</h3>
<p>本插件支持两种渲染方式：</p>
<ul>
  <li><b style="color: #9b59b6;">Puppeteer 渲染</b> — 默认方式，需要 puppeteer 服务，效果精美</li>
  <li><b style="color: #2ecc71;">@napi-rs/canvas 渲染</b> — 可选方式，无需 Puppeteer，性能更高，支持深色模式</li>
</ul>
`
