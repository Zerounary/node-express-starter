# 后端（src）文档总览

本章覆盖后端项目的架构与设计、开发流程与最佳实践、测试方法与实现、以及与前端集成要点。代码根目录位于 `src/`。

## 1. 架构与设计决策

- 技术栈与框架
  - Web 框架：HyperExpress（极简高性能）
  - ORM/数据库：Sequelize（模型迁移/同步，支持多种数据库）
  - 模块划分：`api/`（路由控制器）、`services/`（业务服务）、`db/`（模型与初始化）、`utils/`（工具）、`router/`（中间件与路由装载）、`logger/`（日志）
- 启动流程（入口 `src/index.ts`）
  1) 初始化静态资源：`initAssets(webserver)`
  2) 挂载鉴权中间件：`authMiddleware`
  3) 路由自动装载：`RouteLoader` 扫描 `src/api` 挂载到 `/api`
  4) 挂载日志中间件：`logMiddleware`
  5) 同步核心模型（`Tenant/User/Role/Permission/...` 等）
  6) 初始化系统数据：`initAdminUser / initTableCategories / initSystemData`
  7) 动态表初始化：`initDynamicTables` + `SchemaService.createTableFromDefinition(...)`
  8) 初始化缓存：`CacheService.initialize()`
  9) 启动服务：`start()`（默认端口 `80`）
- 关键文件
  - `src/app.ts`：构建 HyperExpress 实例、跨域中间件 `crossMid`
  - `src/server.ts`：监听端口与错误处理
  - `src/router/auth.ts`：鉴权中间件
  - `src/router/middlewares/logMiddleware.ts`：请求日志
  - `src/utils/routeLoader.ts`：路由装载器

示例：`src/app.ts`
```ts
import HyperExpress from "hyper-express";
import { crossMid } from "./utils/middleware";

const webserver = new HyperExpress.Server({
  max_body_buffer: 1024 * 1,
  max_body_length: 1024 * 1024 * 300,
});

// 跨域设置
webserver.use(crossMid);

export default webserver;
```

示例：`src/server.ts`
```ts
import webserver from "./app";

export function start() {
  const port = 80;
  webserver
    .listen(port)
    .then(() => console.log(`Webserver started on port ${port}`))
    .catch(() => console.log(`Failed to start webserver on port ${port}`));
}
```

## 2. 开发流程与最佳实践

- 目录与职责
  - `api/` 控制器尽量薄，仅做参数校验与调用 Service
  - `services/` 聚合业务逻辑，可复用，可测试
  - `db/models/` 单一职责，定义字段、索引、关联，避免业务逻辑
- 路由规范
  - 统一前缀 `/api`
  - RESTful 优先，资源名使用复数，例如 `/api/roles`
- 错误与日志
  - 中间件捕获异常并结构化输出日志，包含 `traceId`/`userId`/`path`/`duration`
- 配置与环境
  - 使用环境变量区分本地/测试/生产，禁止将密钥写死在仓库
- 性能与安全
  - 对大对象响应进行分页/筛选；必要时启用缓存（`CacheService`）
  - 鉴权中间件应尽早返回 401/403，避免无谓 SQL 查询

## 3. 测试方法与实现

- 单元测试：以 Service 为主（Mock ORM/外部依赖）
- 集成测试：起应用（或用 supertest 注入 app），对 `/api` 路由做黑盒测试
- 基治（契约）测试：对外暴露 API 的接口契约（入参/出参/错误码）保持稳定
- 测试数据：使用独立测试数据库或事务回滚

伪示例（集成测试思路）：
```ts
// 假设使用 vitest/supertest
import request from 'supertest';
import webserver from '@/app';

test('GET /api/roles should return 200', async () => {
  const res = await request(webserver).get('/api/roles').expect(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

## 4. 组件（模块）与中间件

- `authMiddleware`：解析 token/会话，注入 `req.user`，未授权直接返回
- `logMiddleware`：请求耗时、状态码、主体大小
- `crossMid`：跨域设置
- `RouteLoader`：扫描 `src/api`，统一注册到 `/api`

## 5. 数据库与模型（Sequelize）

- 模型同步：项目启动阶段 `Model.sync({ alter: true })` 保障结构一致
- 动态表：`DynamicTable` 表驱动结构，缺表时通过 `SchemaService.createTableFromDefinition` 动态创建
- 建议
  - 对关键字段加索引
  - 明确外键/约束与级联策略
  - 读写分离/连接池配置按环境调优

## 6. 与前端集成与联调

- 前端代理：`frontend/apps/web-antd/vite.config.mts` 已将 `/api` 代理至 `http://localhost:80/api`
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
- 约定
  - 统一响应结构：`{ code, message, data }`
  - 错误码与文案对齐，前端拦截器统一处理

## 7. 实践示例：角色权限（端到端）

- 后端
  - 路由：`GET /api/roles`、`POST /api/roles`、`PUT /api/roles/:id`、`DELETE /api/roles/:id`
  - 关联：`Role`、`Permission`、`RolePermissions`、`UserRoles`
- 前端
  - API 封装：`src/api/role.ts`
  - 页面：列表/创建/编辑/分配权限
- 流程
  1) 前端列表页请求 `/api/roles`
  2) 新建/编辑角色调用相应接口
  3) 分配权限后刷新缓存或拉取最新数据

## 8. 部署与运维

- 端口：默认 80（容器中通过端口映射暴露）
- 迁移策略：生产环境避免 `alter:true`，改为显式迁移脚本
- 观测性：接入结构化日志与告警；关键接口埋点耗时