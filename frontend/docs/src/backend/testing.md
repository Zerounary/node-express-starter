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
    await expect(RoleService.create({ name: '' })).rejects.toThrow();
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

——
延伸阅读：
- 全局测试总览：/testing/
- 开发流程与最佳实践：/backend/development