<script setup lang="ts">
import type { Recordable } from '@vben/types';
import { AccessControl, useAccess } from '@vben/access';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPage, remove } from '#/api/system/crud';
import { $t } from '#/locales';
import { useSystem } from '#/store/system';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { onMounted } from 'vue';
const { getTableAccessCodes } = useAccess();

const route = useRoute();
const system = useSystem();

const { setTabTitle } = useTabs();
const tableName = route.params.table;
console.log('🚀 ~ route.params:', route.params)

// const table = system.table(tableName);
const table  = route.params

setTabTitle(table?.name);
document.title = table?.name

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
  onClosed: () => {
    onRefresh();
  },
});

const gridFormSchema = useGridFormSchema(table);

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: gridFormSchema,
    submitOnChange: false,
  },
  gridOptions: {
    columns: useColumns(table, onActionClick, onStatusChange),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          console.log('loadx')
          return await getPage(table.table, {
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    sortConfig: {
      remote: true,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemTableApi.SystemTable>,
  gridEvents: {
    sortChange: ({ field, order }) => {
      console.log('🚀 ~ sortChange ~ field, order:', field, order);
      gridApi.query({
        sorts: `${field}-${order}`,
      });
    },
  }
});

function onActionClick(e: OnActionClickParams<SystemTableApi.SystemTable>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'update': {
      onEdit(e.row);
      break;
    }
  }
}

/**
 * 将Antd的Modal.confirm封装为promise，方便在异步函数中调用。
 * @param content 提示内容
 * @param title 提示标题
 */
function confirm(content: string, title: string) {
  return new Promise((reslove, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('已取消'));
      },
      onOk() {
        reslove(true);
      },
      title,
    });
  });
}

/**
 * 状态开关即将改变
 * @param newStatus 期望改变的状态值
 * @param row 行数据
 * @returns 返回false则中止改变，返回其他值（undefined、true）则允许改变
 */
async function onStatusChange(newStatus: number, row) {
  const status: Recordable<string> = {
    0: '禁用',
    1: '启用',
  };
  try {
    await confirm(
      `你要将${row.name}的状态切换为 【${status[newStatus.toString()]}】 吗？`,
      `切换状态`,
    );
    await (row.id, { status: newStatus });
    return true;
  } catch {
    return false;
  }
}

function onCreate() {
  formDrawerApi.setData({}).open();
}

function onEdit(row: SystemTableApi.SystemTable) {
  // console.log('🚀 ~ onEdit ~ row:', row);
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemTableApi.SystemTable) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });
  remove(table.table, row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'action_process_msg',
      });
      onRefresh();
    })
    .catch(() => {
      hideLoading();
    });
}

function onRefresh() {
  gridApi.query();
}

onMounted(() => {
  gridApi.query();
});

</script>
<template>
  <Page auto-content-height>
    <FormDrawer class="w-full" :table="table" />
    <Grid :table-title="$t('system.table.list')">
      <template #toolbar-tools>
        <AccessControl :codes="getTableAccessCodes(tableName, 'create')" type="code">
          <Button type="primary" @click="onCreate">
            <Plus class="size-5" />
            {{ $t('ui.actionTitle.create', []) }}
          </Button>
        </AccessControl>
      </template>
    </Grid>
  </Page>
</template>
