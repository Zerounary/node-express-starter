# 测试方法与实现（后端）

本章聚焦后端（HyperExpress + Sequelize）的测试落地，给出单元/集成/契约测试策略、示例与落地建议。

- 适用读者：负责后端开发与联调的同学
- 关联章节：/testing/（全局测试总览）

## 1. 分层策略

- 单元测试（Service/Util）
  - 目标：验证业务逻辑正确性，隔离外部依赖（ORM/网络/缓存）
  - 方法：Mock Sequelize Model、Mock 外部服务
- 集成测试（路由）
  - 目标：以 HTTP 维度验证路由、鉴权、错误码、日志链路
  - 方法：基于应用实例进行请求（可选 supertest 或启动端口配合 undici/axios）
- 契约测试（可选）
  - 目标：输入/输出契约稳定，便于前后端独立演进
  - 方法：OpenAPI + 校验（Zod/Yup）

## 2. 单元测试（示例）

- 要点：以 Service 为中心，Mock Model 的方法（findAll/create/update/destroy）

```ts
// tests/unit/services/role.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Role from '@/db/models/Role';
import RoleService from '@/services/RoleService';

vi.mock('@/db/models/Role', () => ({
  default: { findAll: vi.fn(), create: vi.fn() }
}));

describe('RoleService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list roles', async () => {
    (Role.findAll as any).mockResolvedValue([{ id: 1, name: 'admin' }]);
    const roles = await RoleService.list();
    expect(roles).toHaveLength(1);
  });

  it('create role validates input', async () => {
    await expect(RoleService.create({ name: '' } as any)).rejects.toThrow();
  });
});
```

## 3. 集成测试（示例）

- 方式一：直接对应用实例发起请求（如 supertest）
- 方式二：启动端口后使用 undici/axios 发起真实 HTTP 请求（更接近真实）

```ts
// tests/integration/routes/roles.test.ts
import request from 'supertest';
import webserver from '@/app';

describe('GET /api/roles', () => {
  it('should return 200 and array', async () => {
    const res = await request(webserver).get('/api/roles').expect(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

- 鉴权用例：构造无 Token/错误 Token/权限不足的请求，断言 401/403
- 错误处理：模拟 Service 抛错，断言统一错误响应结构

## 4. 事务与数据隔离

- 建议使用独立测试数据库，或对每个用例使用事务回滚
- 事务包装工具
```ts
// tests/helpers/with-transaction.ts
import sequelize from '@/db/sequelize';

export async function withTransaction(fn: () => Promise<void>) {
  const t = await sequelize.transaction();
  try {
    await fn();
    await t.rollback(); // 或按需 commit
  } catch (e) {
    await t.rollback();
    throw e;
  }
}
```

## 5. 覆盖率与基线

- 工具：Vitest + c8 覆盖率
- 关注：语句/分支/函数/行；对关键路径（鉴权、角色权限、动态表）提升覆盖
- 基线：在 CI 中设置最小阈值并持续拉齐

## 6. CI 集成与数据准备

- 阶段
  1) 安装依赖与构建（如需）
  2) 启动数据库/准备测试数据
  3) 运行单元测试 → 集成测试
  4) 生成覆盖率报告并归档
- 数据管理
  - fixtures：存放初始化/对比用的数据
  - 工具脚本：一键清理/导入/对比

## 7. 性能与回归

- 性能回归（可选）：autocannon/k6 覆盖关键接口，建立基线
- 回归用例：Bug 修复必须附带测试，防止重复出现

## 8. 面向“动态模块”的测试样例

本节结合现有代码（DynamicController/DynamicDataService/DataScopeService/PermissionService/HookService）给出针对性用例。

### 8.1 PermissionService：用户动作集合聚合与通配匹配

```ts
// tests/unit/services/permission.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import PermissionService from '@/services/PermissionService';
import User from '@/db/models/User';
import { Role, Permission } from '@/db/models/Role';

vi.mock('@/db/models/User');
vi.mock('@/db/models/Role');

function mockUserWithPerms(actions: string[]) {
  (User.findByPk as any).mockResolvedValue({
    Roles: [{
      Permissions: actions.map(a => ({ action: a } as Permission))
    }] as Role[]
  });
}

describe('PermissionService', () => {
  it('aggregates and matches wildcard permissions', async () => {
    mockUserWithPerms(['data:page:products', 'data:create:*']);
    const ok1 = await PermissionService.hasPermission(1, 'data:page:products');
    const ok2 = await PermissionService.hasPermission(1, 'data:create:orders');
    const no1 = await PermissionService.hasPermission(1, 'data:delete:orders');
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(no1).toBe(false);
  });
});
```

### 8.2 DataScopeService：ruleBuilder 转 where + EXISTS

```ts
// tests/unit/services/datascope.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import DataScopeService from '@/services/DataScopeService';
import User from '@/db/models/User';
import { DataScope } from '@/db/models/DataScope';
import CacheService from '@/services/CacheService';

vi.mock('@/db/models/User');
vi.mock('@/services/CacheService');

describe('DataScopeService', () => {
  it('returns where clause from ruleBuilder and caches it', async () => {
    (CacheService.getDataScope as any).mockReturnValue(undefined);
    (User.findByPk as any).mockResolvedValue({
      id: 100, tenantId: 1,
      getRoles: vi.fn().mockResolvedValue([{
        DataScopes: [{
          resource: 'products',
          ruleBuilder: {
            logic: 'AND',
            conditions: [{ field: 'createdBy', operator: 'eq', value: '$CURRENT_USER_ID' }]
          }
        } as unknown as DataScope]
      }])
    });
    (CacheService.setDataScope as any).mockImplementation(() => {});
    const where = await DataScopeService.getDataScopeWhere(100, 'products');
    expect(where).toBeTruthy();
    expect(JSON.stringify(where)).toContain('createdBy');
  });
});
```

> 提示：如需测试 `exists`，可为 `field: "customerId", operator: "exists"` 构造子规则，必要时 mock `DynamicDataService.getModelForTable` 与 `CacheService.getTableByAliasName`/`getTableByName` 返回关联表定义。

### 8.3 DynamicController：分页接口（包含权限与数据范围）

```ts
// tests/integration/routes/dynamic.controller.test.ts
import request from 'supertest';
import webserver from '@/app';
import PermissionService from '@/services/PermissionService';
import DataScopeService from '@/services/DataScopeService';
import DynamicDataService from '@/services/DynamicDataService';

// mock 中间件注入用户
function withUserHeaders(req: request.Test) {
  // 具体实现依赖 authMiddleware，将 token 解析为 req.user
  return req.set('Authorization', 'Bearer mocktoken');
}

describe('DynamicController /api/data/:tableName/page', () => {
  it('should respect permission and data scope', async () => {
    // mock 权限：允许 page
    vi.spyOn(PermissionService, 'hasPermission').mockResolvedValue(true);
    // mock 数据范围：仅查看 createdBy=100
    vi.spyOn(DataScopeService, 'getDataScopeWhere').mockResolvedValue({ createdBy: 100 });
    // mock 模型
    const list = [{ id: 1, createdBy: 100, name: 'P1' }];
    const mockModel: any = { findAndCountAll: vi.fn().mockResolvedValue({ count: 1, rows: list.map(x => ({ toJSON: () => x })) }) };
    vi.spyOn(DynamicDataService, 'getModelForTable').mockResolvedValue(mockModel);

    const res = await withUserHeaders(request(webserver).get('/api/data/products/page?page=1&pageSize=10'));
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
  });
});
```

### 8.4 HookService：before/after 钩子链路

```ts
// tests/unit/services/hook.service.test.ts
import { describe, it, expect } from 'vitest';
import HookService from '@/services/HookService';

describe('HookService', () => {
  it('executes _global and table hooks sequentially', async () => {
    // 直接注入内存 hooks（可通过私有属性访问或在 hooks 目录放置测试文件）
    const req: any = { user: { id: 100 } };
    (HookService as any).hooks = new Map<string, any>([
      ['_global', { beforeCreate: (body: any) => ({ ...body, g: true }) }],
      ['products', { beforeCreate: (body: any) => ({ ...body, t: true }) }],
    ]);
    const body = await (HookService as any).executeHook('products', 'beforeCreate', { name: 'p' }, req);
    expect(body.g && body.t).toBe(true);
  });
});
```

### 8.5 导入/导出 CSV

```ts
// tests/integration/routes/dynamic.import-export.test.ts
import request from 'supertest';
import webserver from '@/app';
import DynamicDataService from '@/services/DynamicDataService';

describe('DynamicController import/export', () => {
  it('export returns CSV with filter applied', async () => {
    const mockModel: any = { findAll: vi.fn().mockResolvedValue([{ id: 1, name: 'P1' }]) };
    vi.spyOn(DynamicDataService, 'getModelForTable').mockResolvedValue(mockModel);
    const res = await request(webserver).get('/api/data/products/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('import accepts CSV text and bulk creates within transaction', async () => {
    const mockModel: any = { bulkCreate: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(DynamicDataService, 'getModelForTable').mockResolvedValue(mockModel);
    const csv = 'id,name\n1,P1\n2,P2';
    const res = await request(webserver)
      .post('/api/data/products/import')
      .set('Content-Type', 'text/plain')
      .send(csv);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });
});
```

## 9. SQLite/Sequelize 测试环境建议

- 使用独立 SQLite 文件或内存库（`sqlite::memory:`）作为测试数据库，避免污染 `db/database.sqlite`
- 在 Vitest `setup` 中统一初始化 Sequelize 连接、同步必要模型；或使用 `sequelize-mock` 简化 Model 行为
- 对动态表相关测试，优先 Mock `CacheService`/`DynamicDataService` 以隔离 DB

## 10. 动态表/权限端到端覆盖清单

- DynamicController
  - list/page/read/create/update/delete/search/import/export 正常/异常（参数不合法、权限不足、数据范围限制）
- PermissionService
  - 通配与精确匹配、缓存命中/失效
- DataScopeService
  - ruleBuilder 基础条件 + 嵌套 AND/OR、EXISTS 子查询
- HookService
  - 全局 + 表级钩子顺序与返回值透传
- CacheService
  - 表元数据/用户权限/数据范围缓存与失效

——
延伸阅读：
- 架构与设计：/backend/architecture
- 开发流程与最佳实践：/backend/development
- 全局测试总览：/testing/