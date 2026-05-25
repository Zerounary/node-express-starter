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

## 8. 核心模块速览与代码索引

- 动态表字段配置系统
  - 模型：`src/db/models/DynamicTable.ts`、`src/db/models/DynamicColumn.ts`
  - 关联：`src/db/models/associations.ts`（表-字段、类别自关联）
  - 物理表：`src/services/SchemaService.ts`（创建/变更）
  - 运行期模型：`src/services/DynamicDataService.ts`（属性映射、关系定义、缓存）
  - 渲染/表单：`DynamicColumn.ui` 字段承载，`getTableConfig(tableName)` 提供元数据
- 动态接口功能
  - 控制器：`src/api/DynamicController.ts`
  - 装饰器/装载：`utils/routeDecorators`、`src/utils/routeLoader.ts`
  - 导入/导出：papaparse CSV（/export /import）
- 菜单控制系统
  - 模型：`src/db/models/TableCategory.ts`（type/meta/path/url/redirect/orderno）
  - 绑定：`DynamicTable.belongsTo(TableCategory)`，前端据 `meta.perms` 过滤
- 数据权限体系
  - 权限字符串：`Role/Permission`（`src/db/models/Role.ts`）
  - 路由校验：`checkPermission('data::tableName:action')`
  - 行级权限：`src/services/DataScopeService.ts`（ruleBuilder→Sequelize where/EXISTS）
  - 缓存：`src/services/CacheService.ts`（用户动作集/数据范围）

## 9. 动态接口端点清单（/api/data/:tableName）

- GET `/list`：条件查询（支持 `field-op=value`，如 `status-eq=enabled`）
- GET `/page`：分页查询（`page/pageSize` + 过滤 + 排序 `sorts=field-ASC`）
- GET `/search`：检索（使用 ak 作为关键字字段，dk 作为显示字段）
- GET `/:id`：详情
- POST ``：创建（支持 hooks：beforeCreate/afterCreate）
- PUT `/:id`：更新（支持 hooks：beforeUpdate/afterUpdate）
- DELETE `/:id`：删除（支持 hooks：beforeDelete/afterDelete）
- GET `/export`：导出 CSV
- POST `/import`：导入 CSV

权限字符串模板：`data:{action}:{tableName}`，如 `data:page:products`、`data:create:products`、`data:*:products`、`data:read:*`

## 10. 数据权限配置示例

仅可查看“自己创建”的数据：
```json
{
  "logic": "AND",
  "conditions": [
    { "field": "createdBy", "operator": "eq", "value": "$CURRENT_USER_ID" }
  ]
}
```

基于关系 exists（仅能查看 “customer.ownerId = 当前用户” 的订单）：
```json
{
  "logic": "AND",
  "conditions": [
    {
      "field": "customerId",
      "operator": "exists",
      "value": {
        "table": "customers",
        "conditions": [
          { "field": "ownerId", "operator": "eq", "value": "$CURRENT_USER_ID" }
        ]
      }
    }
  ]
}
```

## 11. 菜单与动态表绑定约定

- `TableCategory` 记录层级菜单与路由元信息（`meta`）
- `DynamicTable` 通过 `categoryId` 归属某一菜单节点
- 前端可据 `TableCategory` 构建路由/菜单树，并以 `meta.perms` 与用户权限集合进行前端过滤；后端路由仍进行权限校验

## 12. 关键UML与时序参考

- 类图（动态表/字段/类别）与服务依赖图、分页查询时序，详见：
  - 架构与设计：/backend/architecture
  - 开发流程与最佳实践：/backend/development
  - 测试方法与实现：/backend/testing

## 文档导航

- [架构与设计](./architecture.md)
- [开发流程与最佳实践](./development.md)
- [测试方法与实现](./testing.md)
