import { requestClient } from '#/api/request';

const baseURL = 'http://localhost:22987';

/**
 * 获取列表
 */
async function getList(table: string, params) {
  return requestClient.get<Array<any>>(`/system/${table}/list`, {
    baseURL,
    params,
  });
}

/**
 * 创建
 * @param data 部门数据
 */
async function create(table: string, data) {
  return requestClient.post(`/system/${table}`, data);
}

/**
 * 更新
 *
 * @param id 部门 ID
 * @param data 部门数据
 */
async function update(table: string, id: string, data) {
  return requestClient.put(`/system/${table}/${id}`, data);
}

/**
 * 删除
 * @param id  ID
 */
async function remove(table: string, id: string) {
  return requestClient.delete(`/system/${table}/${id}`);
}

export { create, getList, remove, update };
