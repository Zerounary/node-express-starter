<script setup lang="ts">
import type { Recordable } from '@vben/types';
import { AccessControl, getTableAccessCodes } from '@vben/access';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPage, remove } from '#/api/system/crud';
import { $t } from '#/locales';
import { useSystem } from '#/store/system';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { onMounted, ref } from 'vue';
import ActionButtonGroup from '#/adapter/component/ActionButtonGroup.vue';

const route = useRoute();
const system = useSystem();
const selectionIds = ref<number[]>([]);
const { setTabTitle } = useTabs();
const tableName = route.params.table;
console.log('🚀 ~ route.params:', route.params);

// const table = system.table(tableName);
const table = route.params;

setTabTitle(table?.name);
document.title = table?.name;

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
    checkboxConfig: {
      highlight: true,
    },
    columns: [
      {type: 'checkbox', width: 40},
      {type: 'seq', width: 40},
      ...useColumns(table, onActionClick)
    ],
    height: 'auto',
    keepSource: true,
    stripe: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          console.log('loadx');
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
      isHover: true,
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
    checkboxAll({checked}) {
      if(checked) {
        let rows = gridApi.grid.getFullData();
        selectionIds.value = rows.map(e => e.id)
      }
    },
    checkboxChange({checked, row}) {
      if(checked) {
        selectionIds.value.push(row.id);
      } else {
        const index = selectionIds.value.findIndex(id => id === row.id);
        if(index > -1) {
          selectionIds.value.splice(index, 1);
        }
      }
    },
    sortChange: ({ field, order }) => {
      console.log('🚀 ~ sortChange ~ field, order:', field, order);
      gridApi.query({
        sorts: `${field}-${order}`,
      });
    },
  },
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
    <Grid>
      <template #toolbar-actions>
        <space>
          <AccessControl
            :codes="getTableAccessCodes(tableName, 'create')"
            type="code"
          >
            <Button type="primary" @click="onCreate">
              <Plus class="size-5" />
              {{ $t('ui.actionTitle.create', []) }}
            </Button>
          </AccessControl>
          <ActionButtonGroup
            type="list"
            :table="tableName"
            :actions="table.actions"
            :params="{
              ids: selectionIds,
            }"
          />
        </space>
      </template>
    </Grid>
  </Page>
</template>
