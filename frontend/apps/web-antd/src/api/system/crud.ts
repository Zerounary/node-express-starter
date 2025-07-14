import { requestClient } from '#/api/request';

const baseURL = '';

/**
 * 获取分页列表
 */
async function getPage(table: string, params) {
  return requestClient.get<Array<any>>(`/api/data/${table}/page`, {
    baseURL,
    params,
  });
}

/**
 * 获取列表
 */
async function getList(table: string, params) {
  return requestClient.get<Array<any>>(`/api/data/${table}/list`, {
    baseURL,
    params,
  });
}

/**
 * 通过id获取详情
 */
async function getById(table: string, id: string) {
  return requestClient.get<Array<any>>(`/api/data/${table}/${id}`, {
    baseURL,
  });
}

/**
 * 创建
 * @param data 数据
 */
async function create(table: string, data) {
  return requestClient.post(`/api/data/${table}`, data);
}

/**
 * 更新
 *
 * @param id ID
 * @param data 更新的字段对象
 */
async function update(table: string, id: string, data) {
  return requestClient.put(`/api/data/${table}/${id}`, data);
}

/**
 * 删除
 * @param id  ID
 */
async function remove(table: string, id: string) {
  return requestClient.delete(`/api/data/${table}/${id}`);
}


/**
 * 执行动作
 * @param table 表名
 * @param actionName 动作定义
 * @param params
 * @returns
 */
async function execute(table: string, actionName: string, params) {
  return requestClient.post(`/api/data/${table}/actions/${actionName}`, params);
}

/**
 * 导出数据
 * @param table 表名
 * @param params 查询参数
 */
async function exportData(table: string, params) {
  return requestClient.get(`/api/data/${table}/export`, {
    baseURL,
    params,
    responseType: 'blob',
  });
}

/**
 * 导入数据
 * @param table 表名
 * @param file 文件
 */
async function importData(table: string, file: File) {
  // TODO 选择文件进行上传，然后后台任务导入。
}

export { create, update, remove, getPage, getList, getById, execute, exportData, importData };
