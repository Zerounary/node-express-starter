# 与后端集成（web-antd ⇄ src）

本章给出前端（web-antd）与后端（src）的端到端联调指南，覆盖环境配置、认证与请求拦截、统一响应结构、常见问题排查，以及一个“角色管理”的完整集成示例。

- 关联章节
  - 后端概览：/backend/
  - 前端概览：/frontend/
  - 测试总览：/testing/

## 1. 环境与代理

- 后端服务
  - 默认端口：80（见 `src/server.ts`）
  - 启动流程：见 `/backend/architecture` 与 `/backend/development`
- 前端开发代理（已配置）
  - 文件：`frontend/apps/web-antd/vite.config.mts`
  - 作用：将前端请求 `/api` 代理到 `http://localhost:80/api`
```ts
// 片段
server: {
  proxy: {
    '/api': {
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      target: 'http://localhost:80/api',
      ws: true,
    },
  },
}
```
- 环境变量
  - `.env.development`：`VITE_GLOB_API_URL=/api`
  - `.env.production`：`VITE_GLOB_API_URL=/api`、`VITE_ROUTER_HISTORY=hash`

建议：若后端端口非 80，可调整代理 `target` 或通过环境变量在后端自定义端口。

## 2. 认证与请求拦截

- Token 获取：登录成功后缓存 Token（localStorage/Pinia）
- 请求拦截器：为每个请求自动附加 `Authorization`
- 错误处理：统一处理 `401/403`，跳转登录或提示无权限

示例（request 初始化与拦截器，伪代码）：
```ts
// frontend/apps/web-antd/src/api/request.ts
import axios from 'axios';

export const request = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL || '/api',
  timeout: 15_000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // 或 Pinia store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (resp) => {
    // 统一解包后端 { code, message, data }
    const { data } = resp;
    if (data && typeof data.code !== 'undefined') {
      if (data.code === 0) return data.data;
      // 业务错误
      // 这里可触发全局消息提示
      return Promise.reject(new Error(data.message || '业务错误'));
    }
    return resp.data;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // 清理会话并跳转登录
    }
    if (status === 403) {
      // 提示无权限
    }
    return Promise.reject(error);
  }
);
```

## 3. 统一响应结构与约定

- 标准结构：`{ code, message, data }`
  - `code=0` 表示成功；非 0 表示业务错误
  - `message` 面向用户可读
  - `data` 负载
- 列表分页（建议）
  - 入参：`{ page, pageSize, filters, sorter }`
  - 出参：`{ list, total, page, pageSize }`

## 4. 角色管理：端到端集成示例

目标：实现“角色列表/新增/编辑/删除”与“权限分配”的端到端联调。

- 后端接口（示例约定）
  - GET `/api/roles` → 角色列表
  - POST `/api/roles` → 新建角色
  - PUT `/api/roles/:id` → 更新角色
  - DELETE `/api/roles/:id` → 删除角色
  - GET `/api/roles/:id/permissions` → 拉取权限
  - POST `/api/roles/:id/permissions` → 提交权限

- 前端 API 封装
```ts
// frontend/apps/web-antd/src/api/role.ts
import { request } from '#/api/request';

export const fetchRoles = (params?: any) => request.get('/api/roles', { params });
export const createRole = (data: any) => request.post('/api/roles', data);
export const updateRole = (id: number, data: any) => request.put(`/api/roles/${id}`, data);
export const removeRole = (id: number) => request.delete(`/api/roles/${id}`);
export const fetchRolePermissions = (id: number) => request.get(`/api/roles/${id}/permissions`);
export const assignRolePermissions = (id: number, payload: { permissions: string[] }) =>
  request.post(`/api/roles/${id}/permissions`, payload);
```

- 列表页（思路）
  - 组件：表格 + 查询表单 + 分页
  - 生命周期：进入页面即调用 `fetchRoles`
  - 操作：新建/编辑/删除后刷新列表

- 权限分配（结合组件）
  - 组件：PermissionPicker（例如 `src/adapter/component/PermissionPicker.vue`）
  - 交互：
    1) 打开弹窗 → 调用 `fetchRolePermissions(id)` 拉取树
    2) 用户勾选 → `assignRolePermissions(id, { permissions })`
    3) 成功后刷新缓存与 UI

示例（伪代码，聚焦交互）：
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchRoles, removeRole, fetchRolePermissions, assignRolePermissions } from '#/api/role';

const loading = ref(false);
const list = ref<any[]>([]);
const showPerm = ref(false);
const currentRoleId = ref<number | null>(null);
const checkedPerms = ref<string[]>([]);
const permTree = ref<any[]>([]);

async function load() {
  loading.value = true;
  list.value = await fetchRoles();
  loading.value = false;
}

async function openAssignPermissions(roleId: number) {
  currentRoleId.value = roleId;
  permTree.value = await fetchRolePermissions(roleId);
  checkedPerms.value = permTree.value.filter((n: any) => n.checked).map((n: any) => n.key);
  showPerm.value = true;
}

async function submitPermissions() {
  if (!currentRoleId.value) return;
  await assignRolePermissions(currentRoleId.value, { permissions: checkedPerms.value });
  showPerm.value = false;
}

onMounted(load);
</script>

<template>
  <!-- 表格（省略列定义） -->
  <button @click="openAssignPermissions(row.id)">分配权限</button>

  <Modal v-model:open="showPerm" title="分配权限">
    <!-- PermissionPicker 为示意，实际按你的组件 API 传值 -->
    <PermissionPicker
      :treeData="permTree"
      v-model:checkedKeys="checkedPerms"
    />
    <template #footer>
      <a-button @click="showPerm=false">取消</a-button>
      <a-button type="primary" @click="submitPermissions">保存</a-button>
    </template>
  </Modal>
</template>
```

## 5. 路由与权限控制

- 路由 meta 中声明访问所需权限，如 `meta: { auth: ['role:view'] }`
- 进入路由前校验用户权限，不通过则跳转无权限页或提示
- 菜单渲染时依据权限过滤可见项

伪代码（路由守卫）：
```ts
router.beforeEach((to, _from, next) => {
  const user = useUserStore();
  if (!user.isAuthed && to.meta.needAuth) return next('/login');
  if (to.meta.auth && !user.hasAny(to.meta.auth)) return next('/403');
  next();
});
```

## 6. 常见问题排查

- 跨域问题
  - 开发环境使用代理，无需后端另外开启 CORS
  - 生产部署若前后端域不同，需在后端配置 CORS（或网关层解决）
- 401/403 频繁出现
  - 检查 Token 获取与持久化；确认拦截器是否正确附加 Authorization
  - 后端 authMiddleware 的解析规则是否与前端一致
- 响应结构不一致
  - 后端输出请遵循 `{ code, message, data }`，前端拦截器做统一解包
- 大数据列表慢
  - 分页/筛选/排序在服务端执行；必要时缓存常用查询结果

## 7. 联调流程建议

1) 启动后端（监听 80）→ 确认路由健康与核心模型已同步  
2) 启动前端（默认端口 5666）→ 确认代理生效与基础页面可访问  
3) 联调接口（角色/权限为优先路径）→ 输出结构与错误码达成一致  
4) 编写集成测试（后端）与组件/页面测试（前端）→ 建立回归基线  
5) 在 CI 中串联后端单测+集测、前端单测、可选 E2E  

——
进一步阅读：
- 后端架构：/backend/architecture
- 前端组件与定制：/frontend/components
- 测试总览：/testing/