import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

const detailsStyle = 'margin:10px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:6px 14px 12px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'

export const usage = `
<h1>Koishi 插件：wydashen-guangyi-query 🕊️</h1>
<h2>🎯 插件版本：<span style="color: #3b82f6; font-weight: bold;">v${pkg.version}</span></h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-wydashen-guangyi-query" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-wydashen-guangyi-query?style=flat-square" alt="npm version">
  </a>
  <a href="https://npm-stat.com/charts.html?package=koishi-plugin-wydashen-guangyi-query" target="_blank">
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
  <a href="https://qm.qq.com/q/4vjto4V7Di" target="_blank">
    <img src="https://img.shields.io/badge/awa群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="awa群">
  </a>
  <a href="https://qm.qq.com/q/oVxZoksppK" target="_blank">
    <img src="https://img.shields.io/badge/光遇Bot群-475328908-D63A4D?style=flat-square&logo=qq&logoColor=white" alt="光遇Bot群">
  </a>
</p>

<blockquote style="margin: 14px 0; padding: 12px 16px; border-left: 6px solid #3b82f6; border-radius: 8px; background: rgba(59, 130, 246, 0.12); color: inherit; line-height: 1.6; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
  <b style="color: #3b82f6; font-size: 15px;">🕊️ 光遇国服光翼（Winged Light）全景收集与跑图诊断</b><br>
  输入游戏角色 ID 即可快速获取包含晨岛、云野、雨林、霞谷、暮土、禁阁及暴风眼献祭在内的全量光翼收集状态。
</blockquote>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #3b82f6;">📖 功能特性与查询概览</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6;">
    <ul style="margin: 4px 0; padding-left: 18px; line-height: 1.7;">
      <li>🗺️ <b>全景光翼地图分类：</b>清晰罗列各大地图普通光翼与试炼光翼的获取情况。</li>
      <li>⚡ <b>双渲染引擎架构：</b>既支持精美高质感的 Puppeteer HTML 网页截图，也支持毫秒级直出的 Skia Canvas 原生渲染。</li>
      <li>📦 <b>智能数据同步：</b>自动拉取并解析网易大神接口映射数据，无需手动更新点位配置。</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #10b981;">🎮 核心指令与角色 ID 获取</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981;">
    <ul style="margin: 4px 0; padding-left: 18px; line-height: 1.7;">
      <li><code>查询光翼 &lt;角色ID&gt;</code>：使用 Puppeteer 渲染并返回光翼收集概览长图。</li>
      <li><code>查询光翼-canvas &lt;角色ID&gt;</code>（快捷别名 <code>aqgc</code>）：使用 @napi-rs/canvas 引擎高性能极速渲染。</li>
      <li><code>查询光翼-forward &lt;角色ID&gt;</code>：以合并转发节点形式发送图文消息（仅 OneBot 等支持合并转发的平台有效）。</li>
      <li><code>获取id方法</code>：详细图文指导玩家如何在游戏设置中复制自己的真实角色 ID。</li>
      <li><code>刷新光翼</code>：管理员手动刷新光翼点位映射字典。</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #f59e0b;">⚡ 双渲染引擎深度对比</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b;">
    <p><b>🖼️ Puppeteer 渲染（默认模式）：</b></p>
    <ul style="margin: 4px 0; padding-left: 18px;">
      <li>优势：HTML/CSS 渲染表现力丰富，字体排版柔和精致。</li>
      <li>要求：需安装并启用 <code>puppeteer</code> 服务插件。</li>
    </ul>
    <p style="margin-top: 8px;"><b>⚡ @napi-rs/canvas 渲染（轻量极速模式）：</b></p>
    <ul style="margin: 4px 0; padding-left: 18px;">
      <li>优势：基于 Rust + Skia 底层，零浏览器开销，毫秒级出图，内存占用极低。</li>
      <li>支持特性：原生内置暗色主题支持，高并发群聊强烈推荐！</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #8b5cf6;">🤖 QQ 官方 Bot 交互与按钮支持</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(139, 92, 246, 0.08); border-left: 4px solid #8b5cf6;">
    <p><b>📱 官方群聊交互升级：</b></p>
    <ul style="margin: 4px 0; padding-left: 18px; line-height: 1.7;">
      <li>在 QQ 官方 Bot 场景下，渲染长图将配合结构化 Markdown 收集进度看板一同输出。</li>
      <li>消息底部内嵌 <b>[🔄 刷新光翼]</b> 与 <b>[🗺️ 跑图推荐]</b> 原生按钮，群友可直接点按快速复查。</li>
    </ul>
  </div>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #ec4899;">💬 交流反馈与支持</b></summary>
<div style="${detailsBodyStyle}">
  <div style="margin: 8px 0; padding: 10px 14px; border-radius: 6px; background: rgba(236, 72, 153, 0.08); border-left: 4px solid #ec4899;">
    <p style="margin: 4px 0;">💬 欢迎加入官方交流 QQ 群：<b style="color: #3498db;">1085190201</b> 🎉</p>
    <p style="margin: 4px 0;">🤖 光遇 Bot 专属玩家交流群：<b style="color: #EA5252;">475328908</b></p>
    <p style="margin: 4px 0; color: #e74c3c;">⚠️ 如遇网易大神官方接口变动或后端异常，可在群内直接艾特作者反馈维护。</p>
  </div>
</div>
</details>
`
