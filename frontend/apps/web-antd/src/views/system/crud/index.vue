<script setup lang="ts">
import type { Recordable } from '@vben/types';
import { AccessControl, getTableAccessCodes, useAccess } from '@vben/access';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { Plus } from '@vben/icons';

import { DeleteOutlined } from '@ant-design/icons-vue';
import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { exportData, getPage, importData, remove } from '#/api/system/crud';
import { $t } from '#/locales';
import { useSystem } from '#/store/system';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import { onMounted, ref } from 'vue';
import ActionButtonGroup from '#/adapter/component/ActionButtonGroup.vue';
import { readFileAsText } from '#/utils';

const route = useRoute();
const system = useSystem();
const access = useAccess();
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
    submitOnEnter: true,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
    },
    columns: [
      { type: 'checkbox', width: 40 },
      { type: 'seq', width: 40 },
      ...useColumns(table, onActionClick),
    ],
    printConfig: {
      beforePrintMethod: ({ html, options }) => {
        console.log('html, options', html, options);
        return '<h1>good</h1>';
      },
    },
    columnConfig: {
      width: 'auto',
      minWidth: 'auto',
    },
    importConfig: {
      types: ['csv'],
      remote: true,
      importMethod: async ({ file, options }) => {
        console.log('🚀 ~ params:', options);
        await importData(table.table, file, {
          mode: options.mode || 'insertTop',
        });
      },
    },
    exportConfig: {
      type: 'csv',
      types: ['csv'],
      mode: 'all',
      modes: ['all'],
      remote: true,
      exportMethod: async ({ options }) => {
        console.log('🚀 ~ options:', options);
        let formValues = await gridApi.formApi.getValues();
        await exportData(table.table, {
          filename: options.filename,
          ...formValues,
        });
      },
    },
    height: 'auto',
    showHeader: true,
    border: true,
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
      print: true,
      import: access.hasAccessByTable(table.table, 'import'),
      export: access.hasAccessByTable(table.table, 'export'),
      refresh: { code: 'query' },
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemTableApi.SystemTable>,
  gridEvents: {
    checkboxAll({ checked }) {
      if (checked) {
        let rows = gridApi.grid.getFullData();
        selectionIds.value = rows.map((e) => e.id);
      } else {
        selectionIds.value = [];
      }
    },
    checkboxChange({ checked, row }) {
      if (checked) {
        selectionIds.value.push(row.id);
      } else {
        const index = selectionIds.value.findIndex((id) => id === row.id);
        if (index > -1) {
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

function onDeleteBySelect() {
  if (selectionIds.value?.length) {
    const hideLoading = message.loading({
      content: $t('ui.actionMessage.deleting', [
        `${selectionIds.value.length}项明细`,
      ]),
      duration: 0,
      key: 'action_process_msg',
    });
    remove(table.table, selectionIds.value.join(','))
      .then(() => {
        message.success({
          content: $t('ui.actionMessage.deleteSuccess'),
          key: 'action_process_msg',
        });
        onRefresh();
      })
      .catch(() => {
        hideLoading();
      });
  } else {
    message.warning({
      content: '请先选择明细',
      key: 'action_process_msg',
    });
  }
}

function onRefresh() {
  selectionIds.value = [];
  gridApi.query();
}

onMounted(() => {
  gridApi.query();
});

const onActionFinished = (state: string) => {
  if (state == 'success') {
    selectionIds.value = [];
  }
};

const onExport = async () => {};
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
          <AccessControl
            :codes="getTableAccessCodes(tableName, 'delete')"
            type="code"
          >
            <Button
              v-show="selectionIds.length"
              danger
              @click="onDeleteBySelect"
            >
              <DeleteOutlined />
              {{ $t('ui.actionTitle.delete', []) }}
            </Button>
          </AccessControl>

          <ActionButtonGroup
            type="list"
            :table="tableName"
            :actions="table.actions"
            :params="{
              ids: selectionIds,
            }"
            @on-finish="onActionFinished"
          />
        </space>
      </template>
      <template #toolbar-tools> </template>
    </Grid>
  </Page>
</template>
