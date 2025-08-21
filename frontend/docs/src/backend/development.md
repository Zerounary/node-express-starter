# 开发流程与最佳实践

本章给出后端（src/）的日常开发流程、编码规范与最佳实践，覆盖目录职责、路由与中间件、错误与日志、配置与环境、数据访问与事务、缓存策略与性能优化等。

- 适用读者
  - 新同学：按“目录 → 路由 → 响应 → 数据 → 缓存 → 日志/错误 → 性能”的顺序阅读
  - 进阶开发：重点关注“事务、缓存一致性、安全与限流”

## 1. 目录职责与命名约定

- 目录结构（核心）
  - api/ 控制器（薄）：参数校验、鉴权入口、调用 Service，返回统一响应
  - services/ 业务服务（厚）：业务聚合、可复用、可单测
  - db/ 模型与初始化：Sequelize 实例、模型定义、系统与动态表初始化
  - router/ 中间件与装载：authMiddleware/logMiddleware/crossMid、RouteLoader
  - utils/ 工具函数与通用中间件
  - logger/ 结构化日志封装
  - assets/ 静态资源注册（initAssets）
- 命名约定
  - 文件小写中划线或大驼峰，类/模型用大驼峰：Role、DynamicTable
  - Service：XxxService（如 RoleService）
  - Controller：XxxController 或 *.routes（RouteLoader 自动装载）

## 2. 本地开发与环境

- Node 版本与包管理：对齐团队约定
- 环境变量：在本地 .env 中配置数据库连接、端口、CORS 白名单等敏感信息
- 端口：src/server.ts 默认 80，可通过环境变量覆盖
- 与前端联调：web-antd 开发代理已将 /api 代理至 http://localhost:80/api

## 3. 路由与中间件

- 装载顺序（src/index.ts）
  1) initAssets(webserver)
  2) webserver.use(authMiddleware)
  3) RouteLoader(...).load() → 自动注册 /api/* 路由
  4) webserver.use(logMiddleware)
- 路由规范
  - REST 优先，资源使用复数：/api/roles, /api/users/:id
  - 动作语义清晰：GET 查询、POST 创建、PUT/PATCH 更新、DELETE 删除
- 路由文件建议导出 register 函数，供 RouteLoader 调用
```ts
// src/api/role.routes.ts
import type { Router } from 'hyper-express';
import { listRoles, createRole } from './RoleController';

export default function register(router: Router) {
  router.get('/roles', listRoles);
  router.post('/roles', createRole);
}
```

## 4. 统一请求与响应

- 参数校验：在 Controller 层做轻量校验（必填/范围/格式），复杂校验放 Service
- 统一响应结构
  - 成功：`{ code: 0, message: 'ok', data }`
  - 失败：`{ code: 非0, message, data?: any }`
- 错误传递：Controller 中尽量 next(e)，交由全局错误处理中间件统一处理与记录

示例（Controller 精简范式）：
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

## 5. 数据访问、事务与并发

- 数据访问只在 Service 层进行，避免 Controller 直接操作模型
- 事务：在 Service 层封装事务边界
```ts
// 事务范式（示例）
import sequelize from '@/db/sequelize';

await sequelize.transaction(async (t) => {
  // 多个写操作需位于同一事务
});
```
- 并发与锁
  - 乐观锁：通过版本号/更新时间校验冲突
  - 悲观锁：在关键更新时加锁（视数据库/隔离级别而定）
- 查询优化
  - 只取必要字段 attributes
  - 合理 include 预加载，避免 N+1
  - 高频过滤/排序字段加索引

## 6. 缓存策略与一致性

- 使用场景：权限/菜单、数据字典、低变更配置
- 一致性
  - 写后失效：更新数据库后主动删除或刷新缓存
  - TTL + 版本：为关键缓存引入版本号
- 初始化：CacheService.initialize() 在启动阶段执行

## 7. 日志、审计与可观测性

- logMiddleware：记录 path/method/status/duration/size/userId/tenantId
- 结构化日志：统一字段与级别（debug/info/warn/error）
- 审计日志：敏感操作（角色/权限/用户）落表与落盘
- 追踪：引入 traceId（请求头或生成），贯穿全链路

## 8. 安全与合规

- 鉴权：authMiddleware 早拦截；Service 再鉴权（纵深防御）
- 输入校验与防注入：参数白名单、长度限制、类型转换
- 输出脱敏：敏感字段（密码/密钥）不返回或脱敏
- CORS：限制来源/方法/头；严控跨域凭据
- 速率限制：对登录/验证码/导出等高风险接口加限流

## 9. 配置与发布

- 配置集中化：环境变量 + 配置模块（按 env 切换）
- 启动顺序：模型同步与系统初始化需有明确开关（生产禁用 alter）
- 发布
  - 预发布环境做回归
  - 数据迁移脚本先执行，再发布新版本
  - 灰度与回滚预案（尤其是动态表变更）

## 10. 代码质量与检查

- 单元测试覆盖 Service 与关键工具函数
- 集成测试覆盖主要路由与鉴权逻辑
- 静态检查：类型/ESLint/格式化（与团队规范保持一致）
- 代码评审：强调 Controller 薄、Service 厚、事务边界清晰、日志充分

——
阅读扩展：
- 架构与设计：/backend/architecture
- 测试方法与实现：/backend/testing
- 全局测试总览：/testing/

## 补充：按模块的开发指南（结合现有代码）

- 动态表与字段（示例：产品）
```ts
import { DynamicTable, DynamicColumn } from '@/db/models';

const table = await DynamicTable.create({
  tenantId: 1, name: 'products', alias_name: 'products', description: '产品主数据'
});
await DynamicColumn.bulkCreate([
  { tenantId: 1, tableId: table.id, name: 'code', description: '产品编码', dataType: 'STRING', ak: true },
  { tenantId: 1, tableId: table.id, name: 'name', description: '产品名称', dataType: 'STRING', dk: true },
  { tenantId: 1, tableId: table.id, name: 'price', description: '含税价', dataType: 'DECIMAL' },
  { tenantId: 1, tableId: table.id, name: 'status', description: '状态', dataType: 'ENUM', enumValues: ['enabled', 'disabled'] },
]);
```

- 物理表生成/变更
```ts
import SchemaService from '@/services/SchemaService';
await SchemaService.createTableFromDefinition(table.id);
// 新增字段：
await SchemaService.addColumnFromDefinition(newColumnId);
```

- 动态接口与权限（控制器：src/api/DynamicController.ts）
  - 列表分页：GET /api/data/products/page?page=1&pageSize=20&status-eq=enabled
  - 详情：GET /api/data/products/:id
  - 新建：POST /api/data/products
  - 更新：PUT /api/data/products/:id
  - 删除：DELETE /api/data/products/:id
  - 搜索：GET /api/data/products/search?keyword=xxx
  - 导出/导入：GET /export / POST /import（CSV）
  - 权限中间件：checkPermission('data::tableName:action')，例如 data:page:products、data:create:products

- 数据权限配置（行级 DataScope：src/services/DataScopeService.ts）
```json
{
  "logic": "AND",
  "conditions": [
    { "field": "createdBy", "operator": "eq", "value": "$CURRENT_USER_ID" }
  ]
}
```
说明：
- ruleBuilder 将在运行时解析为 Sequelize where，并注入 DynamicController 的查询条件。
- 支持 exists 子查询，按关系字段生成 EXISTS 子查询进行跨表过滤。

- 钩子机制（src/services/HookService.ts）
  - 在 src/hooks/{table}.ts 定义同名导出函数
```ts
// src/hooks/products.ts
export async function beforeCreate(body, req) {
  body.createdBy = req.user.id;
  return body;
}
export async function afterCreate(instance) {
  // 审计/通知
}
export async function beforeUpdate(id, body, req) {
  return body;
}
```

- 关联填充优化（DynamicController.populateRelatedData）
  - 批量收集外键ID → 并行批量查询 → 以 map 缓存 → 一次性回填，减少 N+1 查询。
