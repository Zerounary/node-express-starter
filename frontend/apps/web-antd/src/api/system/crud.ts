import { baseRequestClient, requestClient } from '#/api/request';
import { readFileAsText } from '#/utils';

function cleanParams(params: object) {
  if (!params) return {};
  const newParams = {};
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        newParams[key] = value;
      }
    }
  }
  return newParams;
}

async function get(url: string, params = {}) {
  return requestClient.get<Array<any>>(url, {
    params: cleanParams(params),
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
    params: cleanParams(params),
  });
}

/**
 * 获取分页列表
 */
async function getPage(table: string, params = {}) {
  return requestClient.get<Array<any>>(`/data/${table}/page`, {
    params: cleanParams(params),
  });
}

/**
 * 获取列表
 */
async function getList(table: string, params = {}) {
  return requestClient.get<Array<any>>(`/data/${table}/list`, {
    params: cleanParams(params),
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
  let res = await requestClient.post(`/action/${table}/${actionName}`, cleanParams(params));
  return res;
}

/**
 * 导出数据
 * @param table 表名
 * @param params 查询参数
 */
async function exportData(table: string, params) {
  return (requestClient as any).download(`/data/${table}/export`, { params: cleanParams(params) });
}

/**
 * 导入数据
 * @param table 表名
 * @param file 文件
 */
async function importData(table: string, file: File, options: { mode?: 'insertTop' | 'insertBottom' } = { mode: 'insertTop' }) {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('上传文件不能大于50MB');
  }
  // TODO 选择文件进行上传，然后后台任务导入。
  const text = await readFileAsText(file);
  if (!text || text.trim().length === 0) {
    throw new Error('文件内容为空');
  }
  console.log('🚀 ~ importData ~ text:', text)
  return baseRequestClient.request(`/data/${table}/import?mode=${options.mode}`, {
    method: 'POST',
    data: text,
    headers: {
      'Content-Type': 'text/csv',
    },
  });
}

async function search(table: string, params) {
  return requestClient.get<Array<any>>(`/data/${table}/search`, {
    params: cleanParams(params),
  });
}

export {
  get,
  post,
  put,
  create,
  update,
  remove,
  getPage,
  getList,
  getKeywordList,
  getById,
  execute,
  exportData,
  importData,
  search,
};
