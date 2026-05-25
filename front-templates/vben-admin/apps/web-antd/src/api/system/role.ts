import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  export interface SystemRole {
    [key: string]: any;
    id: string;
    name: string;
    permissions: string[];
    remark?: string;
    status: 0 | 1;
  }
}

/**
 * 获取角色列表数据
 */
async function getRoleList(params: Recordable<any>) {
  return requestClient.get<Array<SystemRoleApi.SystemRole>>(
    '/system/role/list',
    { params },
  );
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createRole(data: Omit<SystemRoleApi.SystemRole, 'id'>) {
  return requestClient.post('/system/role', data);
}

/**
 * 更新角色
 *
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateRole(
  id: string,
  data: Omit<SystemRoleApi.SystemRole, 'id'>,
) {
  return requestClient.put(`/system/role/${id}`, data);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteRole(id: string) {
  return requestClient.delete(`/system/role/${id}`);
}

/**
 * 为角色分配权限
 * @param data - 请求数据
 * @param data.roleId - 角色ID
 * @param data.permissions - 权限字符串数组
 */
function assignPermission(data: { roleId: number | string; permissions: string[] }) {
  // 假设 api 对象有一个 post 方法可以发送请求
  return requestClient.post('/roles/assign-permission', data);
}

/**
 * 查询色权限
 * @param data - 请求数据
 * @param data.roleId - 角色ID
 */
function getRolePerms(data: { roleId: number | string; }) {
  // 假设 api 对象有一个 post 方法可以发送请求
  return requestClient.post('/roles/perms', data);
}

export { createRole, deleteRole, getRoleList, updateRole, assignPermission, getRolePerms };
