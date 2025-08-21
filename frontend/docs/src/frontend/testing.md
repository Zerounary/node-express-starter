# 测试方法与实现（前端）

本章介绍前端的单元/组件测试（Vitest + Vue Test Utils）、路由与权限测试、网络层与拦截器测试，以及端到端 E2E（Playwright/Cypress）策略。

## 1. 测试分层

- 单元/组件测试
  - 组件渲染、交互、表单校验
  - 纯函数/工具函数
- 集成测试
  - 页面与 Store/Router/请求层配合
- E2E
  - 用户视角的核心流程（登录 → 列表 → 表单 → 提交）

## 2. 组件测试（VTU + Vitest）

示例（表单提交流程）：
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

要点
- 使用 createTestingPinia 或手动提供 Store
- 路由相关用 createMemoryHistory
- 请求相关使用 mock（如 axios/自研 request）

## 3. 路由与权限测试

- 场景
  - 未登录访问受限路由跳转登录
  - 权限不足访问显示禁止提示或跳转
- 技巧
  - 将守卫逻辑抽出为函数，便于单测
  - 对用户状态与权限使用 mock store

## 4. 请求层与拦截器测试

- 成功/失败分支与重试（可选）
- 401/403 拦截与路由重定向
- 错误消息提示的触达

## 5. E2E（Playwright 示例）

前置条件
- 后端：http://localhost:80
- 前端开发服：http://localhost:5666

```ts
// test/e2e/role.spec.ts
import { test, expect } from '@playwright/test';

test('role list and create', async ({ page }) => {
  await page.goto('http://localhost:5666');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', '123456');
  await page.click('button:has-text("登录")');

  await page.click('text=系统管理');
  await page.click('text=角色管理');
  await page.click('button:has-text("新建")');
  await page.fill('input[name="name"]', '测试角色');
  await page.click('button:has-text("保存")');

  await expect(page.getByText('保存成功')).toBeVisible();
});
```

## 6. 覆盖率与 CI

- 覆盖率：Vitest + c8
- CI：串联 组件/单元 → 集成 → E2E（可按阶段拆分）
- 对关键流程设定覆盖率基线并持续提升

——
延伸阅读：
- 架构与设计：/frontend/architecture
- 开发流程与最佳实践：/frontend/development
- 与后端集成：/frontend/integration