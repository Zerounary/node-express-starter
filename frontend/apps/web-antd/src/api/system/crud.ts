import { requestClient } from '#/api/request';
import { downloadJson } from '#/utils';

async function get(url: string, params = {}) {
  return requestClient.get<Array<any>>(url, {
    params,
  });
}

async function post(url: string, data) {
  return requestClient.post(url, data);
}

async function put(url: string, data) {
  return requestClient.put(url, data);
}

/**
 * 关键字搜索
 */
async function getKeywordList(table: string, params = {}) {
  return requestClient.get<Array<any>>(`/data/${table}/search`, {
    params,
  });
}

/**
 * 获取分页列表
 */
async function getPage(table: string, params = {}) {
  return requestClient.get<Array<any>>(`/data/${table}/page`, {
    params,
  });
}

/**
 * 获取列表
 */
async function getList(table: string, params = {}) {
  return requestClient.get<Array<any>>(`/data/${table}/list`, {
    params,
  });
}

/**
 * 通过id获取详情
 */
async function getById(table: string, id: string) {
  return requestClient.get<Array<any>>(`/data/${table}/${id}`);
}

/**
 * 创建
 * @param data 数据
 */
async function create(table: string, data) {
  return requestClient.post(`/data/${table}`, data);
}

/**
 * 更新
 *
 * @param id ID
 * @param data 更新的字段对象
 */
async function update(table: string, id: string, data) {
  return requestClient.put(`/data/${table}/${id}`, data);
}

/**
 * 删除
 * @param id  ID
 */
async function remove(table: string, id: string) {
  return requestClient.delete(`/data/${table}/${id}`);
}


/**
 * 执行动作
 * @param table 表名
 * @param actionName 动作定义
 * @param params
 * @returns
 */
async function execute(table: string, actionName: string, params = {}) {
  let res = await requestClient.post(`/action/${table}/${actionName}`, params);
  if(res.action) {
    switch(res.action) {
      case 'download':
      let data = res.data;
      downloadJson(data)
      break;
    }
  }

  return res
}

/**
 * 导出数据
 * @param table 表名
 * @param params 查询参数
 */
async function exportData(table: string, params) {
  return requestClient.get(`/data/${table}/export`, {
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

async function search(table: string, params) {
  return requestClient.get<Array<any>>(`/data/${table}/search`, {
    params,
  });
}

export { get, post, put, create, update, remove, getPage, getList, getKeywordList, getById, execute, exportData, importData, search };
