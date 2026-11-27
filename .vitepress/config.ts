import { defineConfig } from 'vitepress'

const base = '/koishi-plugin-wydashen-guangyi-query/'

// 构建戳（精确到分钟，北京时间）：20261127_1317
// 用于图标 URL 的 ?timestamp=，每次部署自动变化以绕过 CDN/CF 旧缓存
const buildStamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
  .format(new Date())
  .replace(/[-:]/g, '')
  .replace(' ', '_')

export default defineConfig({
  title: '网易大神光翼 / 藏宝阁',
  description: '光翼与藏宝阁衣柜在线查询、API 文档',
  lang: 'zh-CN',
  base,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],
  themeConfig: {
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      alt: 'VitePress',
    },
    nav: [
      { text: '🪽 光翼查询', link: '/light' },
      { text: '👗 衣柜查询', link: '/inventory' },
      { text: '🆔 获取国服玩家ID教程', link: '/tutorial' },
      { text: '📖 文档', link: '/docs/api' },
      { text: '🤖 Koishi插件', link: '/koishi-plugin' },
      {
        text: '🐙 GitHub',
        link: 'https://github.com/VincentZyuApps/koishi-plugin-wydashen-guangyi-query',
      },
    ],
    sidebar: {
      '/docs/': [
        {
          text: '文档',
          items: [
            { text: '📖 API', link: '/docs/api' },
            { text: '🔌 插件用法', link: '/docs/usage' },
            { text: '🧪 测试', link: '/docs/test' },
          ],
        },
      ],
    },
    outline: { level: [2, 3], label: '本页目录' },
    search: { provider: 'local' },
  },
  vite: {
    define: {
      __BUILD_STAMP__: JSON.stringify(buildStamp),
    },
  },
})
