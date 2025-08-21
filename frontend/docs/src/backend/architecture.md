# 架构与设计

本章深入阐述后端（src/）的技术选型、模块边界、启动流程、路由与中间件、数据与缓存、日志与错误、配置与环境、性能与安全，并提供从零创建 API 的端到端示例，帮助不同层级的读者快速上手与持续演进。

- 适用读者
  - 新同学：按“项目结构 → 启动流程 → 新增 API 示例”顺序阅读
  - 进阶开发：关注“模块边界、缓存、日志、安全、性能优化”
  - 维护者：重点关注“启动/同步流程、动态表、系统初始化、数据库 schema 策略”

## 1. 技术选型与模块边界

- Web 框架：HyperExpress
  - 轻量、高性能；API 风格接近 Express
- ORM/数据库：Sequelize
  - 模型定义、关联、迁移/同步；支持主流数据库
- 目录结构（精简）
  - api/ 路由控制器（输入/输出、参数校验、授权与调用 Service）
  - services/ 业务服务（聚合业务逻辑、可复用、可单测）
  - db/ 模型与初始化（模型定义、系统初始化、动态表schema、sequelize实例）
  - router/ 中间件与装载器（鉴权、日志、跨域、RouteLoader）
  - utils/ 工具（中间件、通用函数）
  - logger/ 日志（结构化日志输出）
  - assets/ 静态资源注册
- 核心边界
  - Controller 薄、Service 厚：Controller 仅负责入口参数校验与转发
  - Model 只定义结构：避免在模型中写业务逻辑
  - Middleware 聚焦横切关注点：鉴权、日志、跨域、限流

## 2. 启动流程与生命周期

入口：src/index.ts

- 初始化静态资源：initAssets(webserver)
- 注册鉴权中间件：authMiddleware（尽早拦截未授权请求）
- 自动加载路由：RouteLoader 扫描 api/ → 统一挂载到 /api
- 注册日志中间件：logMiddleware（在路由注册后，记录命中路由的实际信息）
- 同步核心模型：Tenant/User/Role/Permission/... 使用 sync({ alter: true })（开发阶段方便）
- 系统数据初始化：initAdminUser / initTableCategories / initSystemData
- 动态表初始化：initDynamicTables + SchemaService.createTableFromDefinition
- 初始化缓存：CacheService.initialize()
- 启动监听：start()（默认端口 80）

示例：片段（已在仓库）
```ts
// src/server.ts
import webserver from "./app";

export function start() {
  const port = 80;
  webserver
    .listen(port)
    .then(() => console.log(`Webserver started on port ${port}`))
    .catch(() => console.log(`Failed to start webserver on port ${port}`));
}
```

## 3. 路由装载与中间件

- 跨域：crossMid 在 app 层统一 use
- 鉴权：authMiddleware 在路由之前尽早 use
- 路由：RouteLoader(controllerDir: "src/api", prefix: "/api") 自动装载
- 日志：logMiddleware 在路由加载后 use，记录接口维度数据

建议
- 路由命名与资源语义：REST 优先（/api/roles、/api/users/{id}）
- 统一响应结构：`{ code, message, data }`
- 错误码规范：可在 logger 或统一错误处理中间件中维护字典

伪代码：一个典型 Controller
```ts
// src/api/RoleController.ts
import type { Request, Response, NextFunction } from 'hyper-express';
import RoleService from '@/services/RoleService';

export async function listRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await RoleService.list();
    res.json({ code: 0, message: 'ok', data: list });
  } catch (e) {
    next(e);
  }
}
```

## 4. 数据层与动态表

- 模型同步：开发/测试阶段采用 Model.sync({ alter: true })，生产建议迁移脚本
- 关联关系：Role ↔ Permission（RolePermissions 中间表）、User ↔ Role（UserRoles）
- 动态表：DynamicTable/Column 根据业务配置生成物理表
  - 启动时：对比现有物理表 → 缺失则 SchemaService.createTableFromDefinition(table.id)

建议
- 索引策略：对高频过滤/关联字段加索引
- 事务与并发：在 Service 层封装事务
- 读写分离（可选）：根据部署环境与流量进行扩展

## 5. 缓存与一致性

- CacheService.initialize()：预热或建立连接
- 典型使用场景
  - 权限/菜单缓存：减少数据库压力
  - 数据字典/配置缓存：低变更数据可长缓存
- 失效策略
  - 更新后主动失效相关 key
  - 设置 TTL 与版本号（versioned key）

## 6. 日志与错误处理

- logMiddleware：记录请求方法、路径、耗时、状态码、用户/租户信息等
- logger：统一封装 console/文件/远程（ELK、Loki）输出
- 错误处理
  - 在 next(e) 后由全局错误处理中间件捕获并标准化输出
  - 避免在 Controller 中到处 try/catch + res.end，保持链路清晰

建议字段
- traceId：贯穿请求链路，便于检索
- userId/tenantId：便于审计与问题定位
- error.name/code/stack：结构化记录

## 7. 配置与环境

- 环境变量：使用 .env/.env.production 等（不要将密钥写死在仓库）
- 可配置项
  - 数据库连接串、连接池、日志级别、缓存地址、CORS 白名单
  - 端口号（默认 80，容器内推荐通过环境变量覆盖）
- 分环境策略
  - 开发：sync({ alter: true }) 快速迭代
  - 生产：禁用 alter；使用迁移工具或脚本，灰度/双写/回滚机制

## 8. 性能与安全

- 性能
  - 分页/筛选：避免返回大列表
  - N+1 查询：合理 include 与预加载
  - 批量操作：合并 SQL 或使用 bulk API
- 安全
  - 认证/授权：authMiddleware 尽早拦截；Route/Service 两层鉴权
  - 输入校验：参数类型、范围、长度、白名单
  - 输出过滤：敏感字段脱敏（如密码/密钥）
  - CORS 策略：限制来源、方法、头
- 限流与防刷（可选）
  - 基于 IP/用户/租户的限流器（令牌桶/漏斗）
  - 登录/短信/邮箱验证码接口重点保护

## 9. 新增一个 API：从零到上线（实战）

目标：实现角色管理读取接口 GET /api/roles

- 第一步：Service
```ts
// src/services/RoleService.ts
import Role from '@/db/models/Role';

export default class RoleService {
  static async list() {
    const rows = await Role.findAll({ raw: true, order: [['id', 'ASC']] });
    return rows.map((r) => ({ id: r.id, name: r.name, desc: r.desc }));
  }
}
```

- 第二步：Controller
```ts
// src/api/RoleController.ts
import type { Request, Response, NextFunction } from 'hyper-express';
import RoleService from '@/services/RoleService';

export async function listRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await RoleService.list();
    res.json({ code: 0, message: 'ok', data });
  } catch (e) {
    next(e);
  }
}
```

- 第三步：路由注册（若使用 RouteLoader 自动扫描，导出路由元信息）
```ts
// src/api/role.routes.ts
import type { Router } from 'hyper-express';
import { listRoles } from './RoleController';

export default function register(router: Router) {
  router.get('/roles', listRoles);
}
```

- 第四步：前端联调
  - 代理：frontend/apps/web-antd/vite.config.mts 已将 /api → http://localhost:80/api
  - 请求示例
```ts
// frontend/apps/web-antd/src/api/role.ts
import { request } from '#/api/request';
export const fetchRoles = () => request.get('/api/roles');
```

- 第五步：测试
  - 集成测试（supertest 注入 app 实例）
```ts
import request from 'supertest';
import webserver from '@/app';

test('GET /api/roles', async () => {
  const res = await request(webserver).get('/api/roles').expect(200);
  expect(res.body.code).toBe(0);
  expect(Array.isArray(res.body.data)).toBe(true);
});
```

## 10. 迁移与演进策略

- 模型/表结构变更
  - 开发：alter 快速演进
  - 生产：显式迁移脚本，回滚方案（添加新列→双写→迁移数据→切换读→删除旧列）
- 动态表演进
  - 版本化表定义（例如在 DynamicTable 增加 version 字段）
  - 变更控制：创建/更新时生成变更计划（添加列/索引、变更类型）

## 11. 常见问题清单

- 启动失败：检查数据库连接、端口占用、动态表初始化日志
- 401/403：确认 authMiddleware 的 token 解析与角色权限配置
- 性能抖动：排查慢查询、增加索引、启用缓存、评估 N+1
- 结构不一致：避免生产使用 alter，转为迁移脚本

——
阅读下一步：
- 开发流程与最佳实践：/backend/development
- 测试方法与实现：/backend/testing
- 与前端联动：/frontend/integration

## 补充：核心模块映射与UML

- 核心文件映射
  - 动态控制器：src/api/DynamicController.ts（CRUD/分页/搜索/导入导出、权限中间件、数据权限注入、关联数据批量填充）
  - 动态模型生成：src/services/DynamicDataService.ts（从 DynamicTable/DynamicColumn 生成 Sequelize 模型与关系）
  - 动态结构变更：src/services/SchemaService.ts（createTableFromDefinition/add/change/drop）
  - 数据权限：src/services/DataScopeService.ts（ruleBuilder → Sequelize where，EXISTS 子查询）
  - 权限聚合：src/services/PermissionService.ts（用户 → 角色 → 权限模式字符串，支持*通配）
  - 钩子机制：src/services/HookService.ts（before/after create/update/delete）
  - 缓存：src/services/CacheService.ts（表结构、权限、数据范围缓存；支持按表/用户刷新）
  - 启动流程：src/index.ts（中间件/路由/模型同步/系统初始化/动态表初始化/缓存预热）

- UML：动态表与字段
```text
classDiagram
  class DynamicTable {
    +id: number
    +tenantId: number
    +categoryId: number
    +name: string
    +alias_name: string
    +description: string
    +orderno: number
  }
  class DynamicColumn {
    +id: number
    +tenantId: number
    +tableId: number
    +name: string
    +description: string
    +dataType: string
    +relatedToTableId: number
    +enumValues: string[]
    +ui: json
    +ak: boolean
    +dk: boolean
    +sortable: boolean
    +orderno: number
  }
  class TableCategory {
    +id: number
    +tenantId: number
    +type: enum
    +name: string
    +parentId: number
    +meta: json
    +path: string
    +url: string
    +redirect: string
    +orderno: number
  }
  DynamicTable "1" --> "many" DynamicColumn : columns
  DynamicTable "*" --> "1" TableCategory : category
  TableCategory "1" --> "many" TableCategory : children
```

- UML：服务与调用关系
```text
classDiagram
  class DynamicDataService {
    -modelCache
    -relationsCache
    +getModelForTable(tableName, tenantId)
    +defineRelationships(model, tableDefinition, tenantId)
  }
  class SchemaService {
    +createTableFromDefinition(tableId)
    +addColumnFromDefinition(columnId)
    +changeColumn(tableName, columnName, def, tenantId)
    +dropColumn(tableName, columnName, tenantId)
  }
  class DataScopeService {
    -parseRule(ruleBuilder, context)
    -buildExistsCondition(field, subRule, tenantId, mainTable)
    +getDataScopeWhere(userId, resource)
  }
  class PermissionService {
    +getAllUserPermissions(userId)
    +hasPermission(userId, action)
  }
  class HookService {
    -hooks: Map
    +executeHook(tableName, hookName, ...args)
  }
  class CacheService {
    -tableCacheByName
    -userPermissionsCache
    -userDataScopesCache
    +initialize()
    +getTableByName(name)
    +setPermissions(userId, perms)
    +setDataScope(userId, resource, scope)
  }
  class DynamicController {
    -tableMetaCache
    +list/find/search/findOne/create/update/remove/exportData/importData
  }
  DynamicController --> DynamicDataService
  DynamicController --> DataScopeService
  DynamicController --> HookService
  DynamicDataService --> SchemaService
  PermissionService --> CacheService
  DataScopeService --> CacheService
```

- 时序：动态分页查询
```text
sequenceDiagram
  actor U as User
  participant R as Router (/api/data/:tableName)
  participant DC as DynamicController
  participant DS as DataScopeService
  participant DDS as DynamicDataService
  participant DB as Sequelize/DB

  U->>R: GET /api/data/products/page?status-eq=enabled
  R->>DC: 命中控制器
  DC->>DS: getDataScopeWhere(userId,"products")
  DS->>DB: 读取角色+DataScope
  DS-->>DC: 返回 where 片段
  DC->>DDS: getModelForTable("products", tenantId)
  DDS->>DB: 动态/缓存模型与关系
  DC->>DB: findAndCountAll(where, order, page)
  DC->>DB: 批量预取关联数据
  DC-->>U: { code:0, data:{items,total} }
```
