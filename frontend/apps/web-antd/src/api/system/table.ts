import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { alert } from '@vben/common-ui';

import { useSystem } from '#/store/system';
import { execute, getKeywordList, getPage, search } from './crud';
import { debounce } from '#/utils';
import type { TableConfig } from '#/adapter/component/types';

export namespace SystemTableApi {
  export interface SystemTable {
    [key: string]: any;
    id: string;
    name: string;
    table: string;
    subTitle?: string;
    createTime?: string;
    status: 0 | 1;
  }
}

function filterTable(
  e: SystemTableApi.SystemTable,
  params: Recordable<any>,
  gridFormSchema: VbenFormSchema[] = [],
) {
  for (const item of gridFormSchema) {
    if (item.component === 'Input') {
      if (
        params[item.fieldName] &&
        !e[item.fieldName].includes(params[item.fieldName])
      ) {
        return false;
      }
    } else if (item.component === 'RangePicker') {
      // 用 startTime 2025-05-01这样的格式 过滤时间e.createTime 是2025-05-01 00:00:00这样的格式
      if (params.startTime && e[item.fieldName] < params.startTime) {
        return false;
      }
      if (params.endTime && e[item.fieldName] > params.endTime) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 获取角色列表数据
 */
export async function getTableList(params: Recordable<any>) {
  return getPage('table', params);
}
/**
 * 创建表
 * @param data 表数据
 */
export async function createTable(
  data: Omit<SystemTableApi.SystemTable, 'id'>,
) {
  return new Promise((resolve, reject) => {
    const system = useSystem();
    // data.table 不能重复
    const isExist = system.tables.some((e) => e.table === data.table);
    if (isExist) {
      alert({
        content: '表名已存在, 请修改表名',
        icon: 'error',
      });
      reject(new Error('表名已存在'));
      return;
    }
    system.addTable(data);
    resolve({});
  });
}

/**
 * 更新表
 * @param id 表ID
 * @param data 表数据
 */
export async function updateTable(
  id: string,
  data: Omit<SystemTableApi.SystemTable, 'id'>,
) {
  return new Promise((resolve) => {
    const system = useSystem();
    system.updateTable(id, data);
    resolve(data);
  });
}

/**
 * 删除表
 * @param id 表 ID
 */
export async function deleteTable(id: string) {
  return new Promise((resolve) => {
    const system = useSystem();
    system.removeTable(id);
    resolve({});
  });
}

export async function getPageConfig(table: string) {
 let tableConfig = await execute("table", `getPageConfig`, { tableName: table});
 return new TableConfigBuilder(tableConfig);
}

const debouncedKeywordSearch = debounce(async (table: string, keyword: string, filters: any = {}) => {
  return search(table, { keyword, ...filters });
}, 300);

export async function keywordSearch(table: string, keyword: string, filters: any = {}) {
  return debouncedKeywordSearch(table, keyword, filters);
}


export class TableConfigBuilder {
  tableConfig: TableConfig;
  name?: string;
  table: string;
  hideMenu?: boolean;
  defaultSort?: string
  columns: any[] = [];
  actions: any[] = [];
  dk: any;
  ak: any;
  dkFieldName: any;
  akFieldName: any;

  constructor(tableConfig: TableConfig) {
    this.tableConfig = tableConfig;
    this.name = tableConfig.name
    this.table = tableConfig.table
    this.hideMenu = tableConfig.hideMenu
    this.defaultSort = tableConfig.defaultSort
    this.columns = tableConfig.columns || [];
    this.actions = tableConfig.actions || [];
    this.ak = this.columns.find(col => col.ak)
    this.dk = this.columns.find(col => col.dk)
    this.akFieldName = this.ak?.fieldName
    this.dkFieldName = this.dk?.fieldName
  }
}
