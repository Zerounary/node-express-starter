# 架构与设计（前端 web-antd）

本章介绍 web-antd 的整体架构、核心模块、环境配置、路由与权限、网络层与状态管理、样式与主题，以及与后端的对接策略。

- 代码根：frontend/apps/web-antd/
- 技术栈：Vite + Vue 3 + Vue Router + Pinia + Ant Design Vue + Vben 组件体系
- 运行环境：.env.* 管理变量，Vite 代理联调后端

## 1. 目录与模块

- 配置
  - .env.development：VITE_PORT、VITE_GLOB_API_URL=/api、VITE_INJECT_APP_LOADING 等
  - vite.config.mts：开发代理，将 /api → http://localhost:80/api
- 页面与路由
  - src/router/routes：路由模块化，按领域拆分（例如 core.ts、index.ts）
- API 层
  - src/api：接口封装与领域模块（如 src/api/role.ts）
  - src/api/request.ts：请求实例与拦截器（建议）
- 组件与适配
  - Vben 组件库：@vben/common-ui、@vben/layouts、@vben/hooks 等
  - 示例：PermissionPicker.vue（权限选择组件）
- 状态管理
  - Pinia：用户/权限/偏好等全局状态
- 样式与主题
  - TailwindCSS + Ant Design Vue 主题 token，统一样式体系

## 2. 路由与权限

- 路由模式：在 .env.production 通过 VITE_ROUTER_HISTORY=hash 配置
- 模块化路由
  - src/router/routes/index.ts：聚合与导出
  - src/router/routes/core.ts：核心路由与布局
- 权限与菜单
  - 基于用户角色/权限生成菜单，路由 meta 控制访问
  - 演示组件：PermissionPicker.vue 可用于权限选择交互

## 3. 网络层与请求规范

- API 基础路径：VITE_GLOB_API_URL=/api
- 开发代理：vite.config.mts
```ts
server: {
  proxy: {
    '/api': {
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      target: 'http://localhost:80/api',
      ws: true
    }
  }
}
```
- 请求封装
  - 统一 baseURL、超时、重试（可选）
  - 拦截器：附加 Authorization、统一处理 401/403、错误提示与重定向
- 响应结构：后端约定 { code, message, data }；code 非 0 统一错误处理

## 4. 状态管理与数据流

- Pinia Store
  - 用户：token、基本信息、角色/权限
  - 偏好：主题、布局、语言
- 数据获取策略
  - 列表缓存/查询条件持久化（URL query 或本地存储）
  - 懒加载与按需请求

## 5. 样式、主题与设计体系

- Tailwind：原子化样式，快速构建
- Ant Design Vue 主题
  - 使用 token 调整品牌色与组件风格
- Vben 样式
  - @vben/styles 与 @vben/tailwind-config 提供工程化规范
- 建议
  - 封装业务通用样式变量与 CSS 变量
  - 主题切换：优先 token 与 CSS 变量，而非直接覆盖 class

## 6. 组件组织与复用

- 组件类型
  - 展示组件：无业务逻辑，输入输出明确
  - 容器组件：持有数据与状态，协调多个展示组件
- 命名与边界
  - XxxCard/XxxForm/XxxTable，避免神组件
- 与 Vben 组件协作
  - 表单、表格、Modal/Drawer 等场景优先复用 Vben 组件，减少重复造轮子

## 7. 与后端对接

- 登录与鉴权：登录成功缓存 Token，后续请求附加 Authorization
- 错误处理：401/403 统一跳转登录/无权限页；后端 message 面向用户可读
- 示例（角色 API）
```ts
// src/api/role.ts
import { request } from '#/api/request';
export const fetchRoles = () => request.get('/api/roles');
export const createRole = (data) => request.post('/api/roles', data);
export const updateRole = (id, data) => request.put(\`/api/roles/\${id}\`, data);
export const removeRole = (id) => request.delete(\`/api/roles/\${id}\`);
```

## 8. 性能与可维护性

- 路由与组件懒加载
- 按需引入组件与图标
- 长列表虚拟化（按需）
- 代码分割与缓存策略

——
阅读扩展：
- 开发流程与最佳实践：/frontend/development
- 组件库与定制：/frontend/components
- 与后端集成：/frontend/integration