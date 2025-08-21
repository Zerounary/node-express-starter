# 前端（web-antd）文档总览

本章覆盖前端项目的架构设计、开发流程与最佳实践、测试方法、组件库使用与自定义，以及与后端的联动实践。代码根目录位于 `frontend/apps/web-antd/`。

## 1. 架构与设计决策

- 技术栈与框架
  - Vite + Vue 3（`script setup`）+ Vue Router + Pinia
  - UI：Ant Design Vue + Vben 组件（`@vben/*` 家族包）
  - 样式：TailwindCSS（工程化主题能力）
- 目录与配置
  - `.env.*`：多环境变量（`VITE_GLOB_API_URL=/api`）
  - `vite.config.mts`：本地代理 `/api` → `http://localhost:80/api`
  - `index.html`：注入 `VITE_APP_TITLE`
  - `src/`：路由、页面、组件、API 封装、适配层等
- 运行模式
  - 开发：`pnpm dev`（端口见 `.env.development` 中 `VITE_PORT`）
  - 构建：`pnpm build`（`VITE_ARCHIVER=true` 时打包并产出 `dist.zip`）

## 2. 开发流程与最佳实践

- 路由与页面
  - 路由模块化，按功能域（如系统、角色权限）组织
  - 路由 meta 控制权限与菜单展示
- 状态与数据
  - 使用 Pinia 管理全局状态（用户、偏好、权限）
  - 接口封装 `@vben/request` 或自定义 axios 实例，统一处理 baseURL、token、错误
- 代码风格与可维护性
  - 组件职责单一，容器组件（数据/状态）+ 展示组件（UI）
  - 复用：公共组件沉淀至 `@vben/common-ui` 或本地 `components/`
- 性能与体验
  - 路由懒加载、图片懒加载
  - 按需引入组件与图标；缓存列表页查询条件与分页

## 3. 组件库使用与自定义（Ant Design Vue + Vben）

- 基本使用
  - 表单/Form、表格/Table、Modal/Drawer、通知/反馈组件按需使用
- 自定义主题
  - 通过 Tailwind 与 CSS 变量（或 antd 主题 token）统一主题
- 规范
  - 业务组件命名 `XxxCard/XxxForm/XxxTable`
  - Props/Emit 明确与文档化，避免「神组件」
- 示例（基于 Vben 表单）
```vue
<script setup lang="ts">
import { VbenForm } from '@vben/common-ui';
const schema = [
  { field: 'name', label: '角色名称', component: 'Input', required: true },
  { field: 'desc', label: '描述', component: 'InputTextArea' }
];
</script>

<template>
  <VbenForm :schema="schema" @submit="(v)=>$emit('submit', v)" />
</template>
```

## 4. 测试方法与实现

- 单元/组件测试：Vitest + Vue Test Utils
- 端到端（E2E）：Playwright（或 Cypress）
- 覆盖范围
  - 表单校验、关键渲染逻辑、鉴权路由守卫
  - API 封装的拦截器与错误提示

## 5. 与后端集成（联调）

- 环境与代理
  - `.env.development` 中 `VITE_GLOB_API_URL=/api`
  - 通过 `vite.config.mts` 代理到 `http://localhost:80/api`
- 鉴权与请求
  - 登录成功后缓存 Token，拦截器为每个请求附加 `Authorization`
  - 统一处理 401/403，跳转登录或提示权限不足
- 示例（角色接口封装）
```ts
// src/api/role.ts
import { request } from '#/api/request'; // 或 @vben/request
export const fetchRoles = () => request.get('/api/roles');
export const createRole = (data) => request.post('/api/roles', data);
export const updateRole = (id, data) => request.put(\`/api/roles/\${id}\`, data);
export const removeRole = (id) => request.delete(\`/api/roles/\${id}\`);
```

## 6. 实践示例：角色权限页面

- 列表页：表格 + 查询表单 + 分页 + 批量操作
- 表单：创建/编辑角色（名称、描述）
- 权限分配：树形/多选，提交到 `/api/roles/:id/permissions`
- 交互建议：提交成功后刷新列表与缓存，通知提示