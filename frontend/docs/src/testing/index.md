# 测试策略与实现总览

本章从整体视角给出测试金字塔与落地方案，并串联后端（HyperExpress + Sequelize）、前端（Vue3 + Ant Design Vue + Vben）与端到端（E2E）的最佳实践与示例。

- 适用读者：从初学者到进阶开发，均可参考
- 关联章节：
  - 后端总览：/backend/
  - 前端总览：/frontend/

## 1. 测试金字塔与范围

- 单元测试（基础广度）
  - 后端：Service/Util 纯逻辑（Mock ORM/外部依赖）
  - 前端：组件渲染/交互、小函数
- 集成测试（关键路径）
  - 后端：以路由为入口，黑盒验证响应/鉴权/错误码
  - 前端：页面与 API 的集成（可用 MSW 模拟后端）
- 端到端 E2E（核心业务闭环）
  - 登录 → 列表 → 表单 → 提交 → 校验结果
  - 使用真实服务或 Docker Compose 编排环境

目录建议：
- 后端：tests/unit、tests/integration、tests/fixtures
- 前端：src/**/__tests__、test/e2e

## 2. 后端测试

### 2.1 单元测试（以 Service 为中心）

- 目标：验证业务逻辑正确性，屏蔽数据库/网络
- 做法：用 Vitest + Spy/Mock 模拟 Sequelize Model/外部服务

示例（Mock Sequelize Model）：
```ts
// tests/unit/services/role.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Role from '@/db/models/Role';
import RoleService from '@/services/RoleService';

vi.mock('@/db/models/Role', () => ({
  default: { findAll: vi.fn(), create: vi.fn() }
}));

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

### 2.2 集成测试（路由黑盒）

- 目标：以 HTTP 维度验证路由、鉴权、日志、错误处理链路
- 工具：supertest + Vitest（或 Jest）

示例（基于 HyperExpress 实例）：
```ts
// tests/integration/routes/roles.test.ts
import request from 'supertest';
import webserver from '@/app';
import { start } from '@/server';

beforeAll(async () => {
  // 可选：若需真实监听端口
  start();
});

describe('GET /api/roles', () => {
  it('should return 200 and array', async () => {
    const res = await request(webserver).get('/api/roles').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

### 2.3 数据库与事务

- 建议使用独立测试数据库或事务回滚策略，避免污染数据
- 每个用例前后创建/回滚事务

示例（Sequelize 事务包装）：
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

## 3. 前端测试

### 3.1 组件/单元测试

- 工具：Vitest + Vue Test Utils
- 范围：表单校验、渲染逻辑、事件交互
- 建议：对请求层做 mock（如 axios/请求封装），对复杂依赖（如 Router/Store）以简化 Provider 包裹

示例（表单组件）：
```ts
// src/components/role/__tests__/RoleForm.test.ts
import { mount } from '@vue/test-utils';
import RoleForm from '../RoleForm.vue';

test('emit submit when valid', async () => {
  const wrapper = mount(RoleForm);
  await wrapper.find('input[name="name"]').setValue('管理员');
  await wrapper.find('form').trigger('submit.prevent');
  expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({ name: '管理员' });
});
```

### 3.2 路由/鉴权守卫

- 用 createMemoryHistory 创建路由实例
- Mock 用户权限状态，断言跳转/拦截行为

示例（伪代码）：
```ts
import { createRouter, createMemoryHistory } from 'vue-router';
import { beforeEachGuard } from '@/router/guards';

test('redirect to login if unauthenticated', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/secure', component: { template: '<div/>' } }]
  });
  router.beforeEach(beforeEachGuard({ isAuthed: () => false }));
  await router.push('/secure');
  expect(router.currentRoute.value.path).toBe('/login');
});
```

### 3.3 网络 Mock（MSW 可选）

- 在组件/页面测试时，用 MSW 模拟 `/api` 响应，避免依赖真实后端
- 使用场景：复杂交互、列表/表单联动

## 4. 端到端 E2E（Playwright/Cypress）

- 目标：从用户视角验证核心业务流程稳定性
- 环境要求：
  - 后端监听：http://localhost:80
  - 前端开发服：http://localhost:5666（见 `.env.development`）

示例（Playwright）：
```ts
// test/e2e/role.spec.ts
import { test, expect } from '@playwright/test';

test('role list and create', async ({ page }) => {
  await page.goto('http://localhost:5666');
  // 登录（可封装为自定义命令）
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', '123456');
  await page.click('button:has-text("登录")');

  // 导航到角色管理
  await page.click('text=系统管理');
  await page.click('text=角色管理');

  // 新建角色
  await page.click('button:has-text("新建")');
  await page.fill('input[name="name"]', '测试角色');
  await page.click('button:has-text("保存")');

  // 断言出现成功提示或列表包含新角色
  await expect(page.getByText('保存成功')).toBeVisible();
});
```

## 5. 覆盖率与 CI

- 覆盖率：开启 Vitest 覆盖率（c8），关注语句/分支/行/函数维度
- CI：在 CI 中串联 后端单测+集测 → 前端单测 → E2E（可选分阶段或夜间构建）
- 缓存：缓存依赖、node_modules、构建产物，提升流水线速度

示例（Vitest 覆盖率配置）：
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: { reporter: ['text', 'lcov'], provider: 'c8' }
  }
});
```

## 6. 契约与回归

- 契约测试：约定统一响应结构 `{ code, message, data }`，用 schema（Zod/Yup）或 OpenAPI 校验输入/输出
- 回归测试：对修过的 Bug 增加针对性用例，避免重复出现
- 性能/基准（可选）：autocannon/k6 覆盖关键接口，建立基线

## 7. 快速清单

- 后端
  - [ ] Service 纯逻辑单测
  - [ ] 路由集测（鉴权/日志/错误）
  - [ ] 事务/测试数据隔离
- 前端
  - [ ] 组件单测（表单/表格/Modal）
  - [ ] 路由守卫/权限
  - [ ] API 封装与错误处理
- E2E
  - [ ] 核心流程（登录/列表/表单/提交流程）
  - [ ] 数据前置/清理策略
  - [ ] 覆盖率与阈值