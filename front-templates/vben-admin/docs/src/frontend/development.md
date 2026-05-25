# 开发流程与最佳实践（前端 web-antd）

本章给出 web-antd 的本地开发、目录规范、代码风格、请求与状态、提交与发布等日常实践指引，帮助从入门到进阶的同学高效协作。

- 代码根目录：frontend/apps/web-antd/
- 技术栈：Vite + Vue 3 + Vue Router + Pinia + Ant Design Vue + Vben
- 运行与构建：依赖 .env.* 与 vite.config.mts 中的代理与打包配置

## 1. 环境与脚本

- 关键环境变量（示例）
  - .env.development
    - VITE_PORT=5666
    - VITE_GLOB_API_URL=/api
    - VITE_INJECT_APP_LOADING=true
  - .env.production
    - VITE_GLOB_API_URL=/api
    - VITE_ROUTER_HISTORY=hash
    - VITE_ARCHIVER=true（打包生成 dist.zip）
- 常用脚本（package.json）
  - 启动开发：pnpm dev
  - 构建生产：pnpm build
  - 预览构建：pnpm preview
  - 类型检查：pnpm typecheck

注意：vite.config.mts 已配置开发代理，将 /api 转发至 http://localhost:80/api，确保后端服务监听在 80 端口（或按需调整）。

## 2. 目录结构与职责

- src/
  - api/ 接口封装（按领域拆分，如 role.ts、user.ts）
  - router/ 路由与守卫（routes 模块化）
  - stores/ Pinia 状态（用户、权限、偏好）
  - components/ 业务组件（容器组件/展示组件分层）
  - adapter/ 适配层（对接 Vben 组件或第三方库）
  - styles/ 全局样式与变量（按需）
- 命名与组织
  - 领域优先：按业务域组织 API、页面与组件
  - 组件命名：XxxCard/XxxForm/XxxTable，避免“神组件”
  - 可复用逻辑下沉为 composable（useXxx）

## 3. 请求与响应约定

- 基础路径：VITE_GLOB_API_URL=/api
- 统一响应结构：{ code, message, data }
  - code=0 表示成功；非 0 统一错误处理
- 请求封装建议（request.ts）
  - 附加 Authorization
  - 401/403 拦截跳转登录/无权限
  - 统一错误消息提示（Antd message/notification）

示例（角色 API）：
```ts
// src/api/role.ts
import { request } from '#/api/request';
export const fetchRoles = () => request.get('/api/roles');
export const createRole = (data) => request.post('/api/roles', data);
export const updateRole = (id, data) => request.put(\`/api/roles/\${id}\`, data);
export const removeRole = (id) => request.delete(\`/api/roles/\${id}\`);
```

## 4. 路由与权限

- 路由模式：生产使用 hash（.env.production: VITE_ROUTER_HISTORY=hash）
- 权限控制
  - 路由 meta 声明所需权限
  - 进入路由前校验用户角色/权限
  - 菜单与路由联动：基于权限过滤菜单

## 5. 状态与数据流

- Pinia store
  - user：token/基本信息/角色/权限
  - prefs：主题/布局/语言偏好
- 数据策略
  - 列表页的查询条件与分页持久化（URL query 或 localStorage）
  - 懒加载与按需请求

## 6. 样式与主题

- TailwindCSS：统一原子类规范
- Ant Design Vue 主题 token：按需自定义品牌色与组件风格
- 与 Vben 样式体系协作：@vben/styles 与 @vben/tailwind-config

## 7. 代码质量与提交

- 类型与规范：TS 严格、ESLint、Prettier（对齐团队规范）
- 提交信息建议：基于 Conventional Commits（feat/fix/docs/refactor/test/chore）
- PR 检查清单
  - [ ] 类型通过与无 ESLint 严重告警
  - [ ] 关键页面/组件有基础用例
  - [ ] 请求层拦截器与错误处理未破坏
  - [ ] 文档或注释同步更新

## 8. 性能与可维护性

- 路由与组件懒加载、按需引入图标与组件
- 长列表虚拟化（按需）
- 代码分割与浏览器缓存策略
- 低复杂度优先，拆分大组件与重复逻辑

——
延伸阅读：
- 架构与设计：/frontend/architecture
- 组件库与定制：/frontend/components
- 测试方法与实现：/frontend/testing
- 与后端集成：/frontend/integration