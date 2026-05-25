import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: '项目文档',
  description: '后端（src）与前端（web-antd）开发文档与集成实践',
  themeConfig: {
    nav: [
      { text: '后端(src)', link: '/backend/' },
      { text: '前端(web-antd)', link: '/frontend/' },
      { text: '测试策略', link: '/testing/' }
    ],
    sidebar: {
      '/backend/': [
        {
          text: '后端',
          items: [
            { text: '概览', link: '/backend/' },
            { text: '架构与设计', link: '/backend/architecture' },
            { text: '开发流程与最佳实践', link: '/backend/development' },
            { text: '测试方法与实现', link: '/backend/testing' }
          ]
        }
      ],
      '/frontend/': [
        {
          text: '前端',
          items: [
            { text: '概览', link: '/frontend/' },
            { text: '架构与设计', link: '/frontend/architecture' },
            { text: '开发流程与最佳实践', link: '/frontend/development' },
            { text: '组件库与定制', link: '/frontend/components' },
            { text: '测试方法与实现', link: '/frontend/testing' },
            { text: '与后端集成', link: '/frontend/integration' }
          ]
        }
      ],
      '/testing/': [
        {
          text: '测试',
          items: [{ text: '总览', link: '/testing/' }]
        }
      ]
    },
    outline: [2, 3]
  }
});