import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { WingMapManager } from './utils'
import { pkg } from './types'
import type { Config } from './config'
import { registerRefreshCommand } from './command/command_refresh'
import { registerPptrCommand } from './command/command_pptr'
import { registerTextCommand } from './command/command_text'
import { registerForwardCommand } from './command/command_forward'
import { registerTutorialCommand } from './command/command_tutorial'
import { registerCanvasCommand } from './command/command_canvas'

export { Config } from './config'

export const name = 'wydashen-guangyi-query'

export const usage = `
<h1>Koishi 插件：wydashen-guangyi-query 🕊️</h1>
<h2>🎯 插件版本：<span style="color: #ff6b6b; font-weight: bold;">v${pkg.version}</span></h2>
<p><del>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b> 🎉（已G）</del></p>
<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b style="color: #50c878;">1085190201</b> 🎉</p>
<p>光遇 bot 交流 QQ 群：<b style="color: #50c878;">475328908</b></p>
<p style="color: #e74c3c;">⚠️ 如果查询光翼的后端挂了，请到群里找 <b>vincentzyu</b> 反馈~</p>

<hr>

<h3 style="color: #3498db;">📖 插件简介</h3>
<p>查询<b>光遇国服</b>玩家的<b>光翼（Winged Light）</b>获取情况，支持 <b>Puppeteer</b> 和 <b>@napi-rs/canvas</b> 双渲染引擎。</p>
<p>输入玩家角色ID，即可生成一张光翼收集情况的图片，按地图分类展示已收集与未收集的光翼。</p>

<h3 style="color: #27ae60;">🎮 主要指令</h3>
<ul>
  <li><b>查询光翼 &lt;角色ID&gt;</b> — 使用 Puppeteer 渲染图片返回光翼收集情况</li>
  <li><b>查询光翼-canvas &lt;角色ID&gt;</b> — 使用 @napi-rs/canvas (Skia) 渲染（性能更高 ⚡）</li>
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

<hr>

<p>📦 插件仓库地址：</p>
<ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-wydashen-guangyi-query">Gitee</a></li>
  <li><a href="https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query">GitHub</a></li>
</ul>

<hr>


`

export const inject = {
  required: ['puppeteer', 'http']
}

export function apply(ctx: Context, config: Config) {
  const wingMapManager = new WingMapManager(ctx, config.wyWingMapUrl, config.skyAppXmlFilePath);

  ctx.on('ready', async () => {
    await wingMapManager.initialize();
  });

  if (config.enableRefreshCommand) {
    registerRefreshCommand(ctx, wingMapManager)
  }

  if (config.enableImagePptrCommand) {
    registerPptrCommand(ctx, config, wingMapManager)
  }

  if (config.enableTextCommand) {
    registerTextCommand(ctx, config, wingMapManager)
  }

  if (config.enableForwardCommand) {
    registerForwardCommand(ctx, config, wingMapManager)
  }

  if (config.enableCanvasCommand) {
    registerCanvasCommand(ctx, config, wingMapManager)
  }

  if (config.enableTutorialCommand) {
    registerTutorialCommand(ctx, config)
  }
}
