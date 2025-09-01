<script setup lang="ts">
import type { PropType } from 'vue';
import type { Recordable } from '@vben/types';
import type { OnActionClickParams, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';
import type { TableConfig } from './types';

import { computed, onMounted, defineProps, toRaw } from 'vue';
import { AccessControl, getTableAccessCodes } from '@vben/access';
import { Button, message, Modal } from 'ant-design-vue';
import { Plus } from '@vben/icons';

import { useVbenDrawer } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPage, remove } from '#/api/system/crud';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from '#/views/system/crud/data';
import Form from '#/views/system/crud/modules/form.vue';

const props = defineProps({
  tableConfig: { type: Object as PropType<TableConfig>, required: true },
  parentKey: { type: String, required: true },
  parentId: { type: [String, Number], required: true },
  row: { type: Object, default: () => ({}) },
  queryExtra: { type: Object, default: () => ({}) },
  tab: { type: Object as PropType<{ key: string; table: string; extraQuery?: Record<string, any> }>, required: true },
});

const filteredTableConfig = computed(() => {
  const queryExtraKeys = Object.keys(props.queryExtra);
  const newConfig = JSON.parse(JSON.stringify(toRaw(props.tableConfig)));

  if (newConfig.columns) {
    newConfig.columns = newConfig.columns.filter(
      (field: { fieldName: string }) => {
        return !queryExtraKeys.includes(field.fieldName) && field.fieldName != props.parentKey
      },
    );
  }
  return newConfig;
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
  onClosed: () => {
    gridApi.query();
  },
});

const gridFormSchema = computed(() => useGridFormSchema(toRaw(filteredTableConfig.value)));
const columns = computed(() =>
  useColumns<SystemTableApi.SystemTable>(filteredTableConfig.value, onActionClick),
);

const [Grid, gridApi] = useVbenVxeGrid({
  showSearchForm: false,
  formOptions: {
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: gridFormSchema.value,
    submitOnChange: false,
  },
  gridOptions: {
    columns: columns.value,
    formConfig: {
      collapsed: true,
    },
    height: 500,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: { page: { currentPage: number; pageSize: number } }, formValues: Recordable<any>) => {
          const queryExtra = {
            ...props.queryExtra,
            [props.parentKey]: props.parentId,
          }
          return await getPage(props.tableConfig.table, {
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            ...queryExtra,
            ...(props.tab.extraQuery || {}),
          });
        },
      },
    },
    rowConfig: { keyField: 'id' },
    sortConfig: { remote: true },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemTableApi.SystemTable>,
  gridEvents: {
    sortChange: ({ field, order }: { field: string; order: 'asc' | 'desc' | null }) => {
      gridApi.query({ sorts: `${field}-${order}` });
    },
  },
});

function onCreate() {
  formDrawerApi.setData({ _parentKey: props.parentKey, _parentId: props.parentId, ...props.queryExtra });
  // HACK: The type for `open` is incorrect, expecting 0 arguments.
  // Using `as any` to pass props to the connected component.
  (formDrawerApi.open as any)({ table: filteredTableConfig.value });
}

function onEdit(row: SystemTableApi.SystemTable) {
  formDrawerApi.setData({ ...row, _parentKey: props.parentKey, _parentId: props.parentId,  ...props.queryExtra });
  // HACK: The type for `open` is incorrect, expecting 0 arguments.
  // Using `as any` to pass props to the connected component.
  (formDrawerApi.open as any)({ table: filteredTableConfig.value });
}

async function onDelete(row: SystemTableApi.SystemTable) {
  await Modal.confirm({
    title: $t('ui.actionHint.delete'),
    content: $t('ui.actionMessage.deleteConfirm', [row.name || row.id]),
    onOk: async () => {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [row.name || row.id]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await remove(props.tableConfig.table, row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.name || row.id]),
          key: 'action_process_msg',
        });
        gridApi.query();
      } finally {
        hideLoading();
      }
    },
  });
}

function onActionClick(e: OnActionClickParams<SystemTableApi.SystemTable>) {
  switch (e.code) {
    case 'delete':
      onDelete(e.row);
      break;
    case 'update':
      onEdit(e.row);
      break;
  }
}

onMounted(() => {
  gridApi.query();
});
</script>

<template>
  <div>
    <FormDrawer
      class="w-full"
      :table="filteredTableConfig"
    />
    <Grid>
      <template #toolbar-tools>
        <AccessControl
          :codes="getTableAccessCodes(filteredTableConfig.table, 'create')"
          type="code"
        >
          <Button
            type="primary"
            @click="onCreate"
          >
            <Plus class="size-5" />{{ $t('ui.actionTitle.create', []) }}
          </Button>
        </AccessControl>
      </template>
    </Grid>
  </div>
</template>
