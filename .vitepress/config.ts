import { defineConfig } from 'vitepress'

const base = '/koishi-plugin-wydashen-guangyi-query/'

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
      { text: '👗 衣柜查询', link: '/outfit' },
      { text: '🆔 获取 ID', link: '/tutorial' },
      { text: '📖 文档', link: '/docs/api' },
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
})
