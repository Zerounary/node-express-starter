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
  row: { type: Object as PropType<Recordable>, default: () => ({}) },
  link: { type: Object as PropType<{ field: string; sourceField?: string }>, required: true },
  queryExtra: { type: Object as PropType<Recordable>, default: () => ({}) },
  tab: { type: Object as PropType<{ key: string; table: string; extraQuery?: Record<string, any> }>, required: true },
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
  onClosed: () => {
    gridApi.query();
  },
});

const gridFormSchema = computed(() => useGridFormSchema(toRaw(props.tableConfig)));
const columns = computed(() =>
  useColumns<SystemTableApi.SystemTable>(props.tableConfig, onActionClick),
);

const [Grid, gridApi] = useVbenVxeGrid({
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
        query: async ({ page }, formValues) => {
          const sourceField = props.link.sourceField || 'id';
          const linkPart = props.row && props.link.field ? { [props.link.field]: props.row?.[sourceField] } : {};
          return await getPage(props.tableConfig.table, {
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            ...props.queryExtra,
            ...(props.tab.extraQuery || {}),
            ...linkPart,
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
    sortChange: ({ field, order }) => {
      gridApi.query({ sorts: `${field}-${order}` });
    },
  },
});

function onCreate() {
  const sourceField = props.link.sourceField || 'id';
  const defaultLink = props.row && props.link.field ? { [props.link.field]: props.row?.[sourceField] } : {};
  formDrawerApi.setData({ ...defaultLink }).open({ table: props.tableConfig });
}

function onEdit(row: SystemTableApi.SystemTable) {
  formDrawerApi.setData(row).open({ table: props.tableConfig });
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
      :table="tableConfig"
    />
    <Grid :table-title="$t('system.table.list')">
      <template #toolbar-tools>
        <AccessControl
          :codes="getTableAccessCodes(tableConfig.table, 'create')"
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