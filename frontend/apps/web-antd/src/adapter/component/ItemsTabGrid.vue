<script setup lang="ts">
import type { PropType } from 'vue';
import type { Recordable } from '@vben/types';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';
import type { TableConfig } from './types';

import { computed, onMounted, defineProps, toRaw, ref } from 'vue';
import { AccessControl, getTableAccessCodes } from '@vben/access';
import { Space, Button, message, Modal } from 'ant-design-vue';
import { Plus } from '@vben/icons';

import { useVbenDrawer } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPage, remove, update } from '#/api/system/crud';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from '#/views/system/crud/data';
import Form from '#/views/system/crud/modules/form.vue';
import ActionButtonGroup from '#/adapter/component/ActionButtonGroup.vue';

const props = defineProps({
  tableConfig: { type: Object as PropType<TableConfig>, required: true },
  parentKey: { type: String, required: true },
  parentId: { type: [String, Number], required: true },
  row: { type: Object, default: () => ({}) },
  queryExtra: { type: Object, default: () => ({}) },
  tab: {
    type: Object as PropType<{
      key: string;
      table: string;
      extraQuery?: Record<string, any>;
    }>,
    required: true,
  },
});

const dragable = computed(() => {
  let hasOrderno = props.tableConfig.columns?.find(e => e.fieldName == 'orderno')
  return !!hasOrderno
})

const selectionIds = ref<number[]>([]);

const filteredTableConfig = computed(() => {
  const queryExtraKeys = Object.keys(props.queryExtra);
  const newConfig = JSON.parse(JSON.stringify(toRaw(props.tableConfig)));

  if (newConfig.columns) {
    newConfig.columns = newConfig.columns.filter(
      (field: { fieldName: string }) => {
        return (
          !queryExtraKeys.includes(field.fieldName) &&
          field.fieldName != props.parentKey
        );
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

const gridFormSchema = computed(() =>
  useGridFormSchema(toRaw(filteredTableConfig.value)),
);
const columns = computed(() =>
  useColumns<SystemTableApi.SystemTable>(
    filteredTableConfig.value,
    onActionClick,
  ),
);

const [Grid, gridApi] = useVbenVxeGrid({
  showSearchForm: false,
  formOptions: {
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: gridFormSchema.value,
    submitOnChange: false,
  },
  gridOptions: {
    columns: [
      { type: 'checkbox', width: 40 },
      { type: 'seq', width: 40 },
      ...columns.value,
    ],
    formConfig: {
      collapsed: true,
    },
    height: 500,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Recordable<any>,
        ) => {
          const queryExtra = {
            ...props.queryExtra,
            [props.parentKey]: props.parentId,
          };
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
    rowConfig: { keyField: 'id', isHover: true, drag: dragable.value },
    rowDragConfig: {
      trigger: 'row'
    },
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
    async rowDragend(e) {
      if(!dragable.value) return
      const { _index } = e || {};
      // 未发生位置变化，直接返回
      if (!_index || _index.newIndex === _index.oldIndex) {
        return;
      }

      // 1) 获取当前页拖拽后的数据顺序
      let rows: any[] = JSON.parse(JSON.stringify(gridApi.grid.getFullData()));
      console.log("rows:", rows)

      if (!Array.isArray(rows) || rows.length === 0) {
        return;
      }

      // 2) 生成新的 orderno（按当前显示顺序，步长为 10）
      const newOrderMap = new Map<number | string, number>();
      for (let i = 0; i < rows.length; i++) {
        const id = rows[i]?.id;
        if (id == null) continue;
        newOrderMap.set(id, (i + 1) * 10);
      }

      // 3) 仅更新 orderno 发生变化的记录
      const tableName = props.tableConfig.table;
      const changed = rows.filter(
        (r) => r?.id != null && r.orderno !== newOrderMap.get(r.id),
      );

      if (changed.length > 0) {
        await Promise.all(
          changed.map((r) =>
            update(tableName, r.id, { orderno: newOrderMap.get(r.id)! }),
          ),
        );
      }

      gridApi.query();
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
    sortChange: ({
      field,
      order,
    }: {
      field: string;
      order: 'asc' | 'desc' | null;
    }) => {
      gridApi.query({ sorts: `${field}-${order}` });
    },
  },
});

function onCreate() {
  formDrawerApi.setData({
    _parentKey: props.parentKey,
    _parentId: props.parentId,
    ...props.queryExtra,
  });
  // HACK: The type for `open` is incorrect, expecting 0 arguments.
  // Using `as any` to pass props to the connected component.
  (formDrawerApi.open as any)({ table: filteredTableConfig.value });
}

function onEdit(row: SystemTableApi.SystemTable) {
  formDrawerApi.setData({
    ...row,
    _parentKey: props.parentKey,
    _parentId: props.parentId,
    ...props.queryExtra,
  });
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
    <FormDrawer class="w-full" :table="filteredTableConfig" />
    <Grid>
      <template #toolbar-actions>
        <space>
          <AccessControl
            :codes="getTableAccessCodes(filteredTableConfig.table, 'create')"
            type="code"
          >
            <Button type="primary" @click="onCreate">
              <Plus class="size-5" />{{ $t('ui.actionTitle.create', []) }}
            </Button>
          </AccessControl>
          <ActionButtonGroup
            type="item"
            :table="tableConfig.table"
            :actions="tableConfig.actions"
            :gridApi="gridApi"
            :params="{
              parentId,
              parentKey,
              ids: selectionIds,
            }"
          />
        </space>
      </template>
    </Grid>
  </div>
</template>
