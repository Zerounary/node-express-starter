import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { alert } from '@vben/common-ui';

import { useSystem } from '#/store/system';

export namespace SystemColumnApi {
  export interface SystemColumn {
    [key: string]: any;
    id: string;
    fieldName: string;
    label: string;
    component: string;
    table: string;
    subTitle?: string;
    createTime?: string;
    status: 0 | 1;
  }
}

function filterTable(
  e: SystemColumnApi.SystemColumn,
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
 * 获取字段列表数据
 */
export async function getColumnList(params: Recordable<any>) {
  return new Promise((resolve) => {
    const system = useSystem();
    const items = system.columns.filter((e) =>
      // BUG 不知道为什么引用了 views 中的data 的函数就会导致页面控件无法渲染
      filterTable(e, params, [
        {
          component: 'Input',
          fieldName: 'field',
        },
        {
          component: 'Input',
          fieldName: 'name',
        },
        {
          component: 'RangePicker',
          fieldName: 'createTime',
        },
      ]),
    );
    resolve({
      items,
      total: items.length,
    });
  });
}
/**
 * 创建表
 * @param data 表数据
 */
export async function createColumn(
  data: Omit<SystemColumnApi.SystemColumn, 'id'>,
) {
  return new Promise((resolve, reject) => {
    const system = useSystem();
    // data.table 不能重复
    const isExist = system.columns.some(
      (e) => e.table === data.table && e.fieldName === data.fieldName,
    );
    if (isExist) {
      alert({
        content: '字段已存在, 请修改字段',
        icon: 'error',
      });
      reject(new Error('字段已存在'));
      return;
    }
    system.addColumn(data);
    resolve({});
  });
}

/**
 * 更新字段
 * @param id 字段ID
 * @param data 字段数据
 */
export async function updateColumn(
  id: string,
  data: Omit<SystemColumnApi.SystemColumn, 'id'>,
) {
  return new Promise((resolve) => {
    const system = useSystem();
    system.updateColumn(id, data);
    resolve({});
  });
}

/**
 * 删除字段
 * @param id 字段 ID
 */
export async function deleteColumn(id: string) {
  return new Promise((resolve) => {
    const system = useSystem();
    system.removeColumn(id);
    resolve({});
  });
}
