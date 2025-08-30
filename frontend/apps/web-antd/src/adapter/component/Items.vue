<script setup lang="ts">
import type { PropType } from 'vue';
import type { Recordable } from '@vben/types';
import type { OnActionClickParams, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { computed, defineComponent, h, onMounted, reactive, ref, watchEffect, defineProps, watch } from 'vue';
import { AccessControl, useAccess } from '@vben/access';
import { Button, Tabs, message, Modal } from 'ant-design-vue';
import { Plus } from '@vben/icons';

import { useVbenDrawer } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPage, remove } from '#/api/system/crud';
import { getPageConfig } from '#/api/system/table';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from '#/views/system/crud/data';
import Form from '#/views/system/crud/modules/form.vue';

const { getTableAccessCodes } = useAccess();

interface TabProp {
  key: string;
  table: string;      // 表名
  title?: string;     // 标签标题（未传则用 getPageConfig 返回的 name）
  extraQuery?: Record<string, any>; // 仅对该 tab 生效的额外查询参数
}

const props = defineProps({
  // 多个子表标签
  tabs: {
    type: Array as PropType<TabProp[]>,
    required: true,
  },
  // 当前主表单行，用于建立子表过滤（如 parentId）
  row: {
    type: Object as PropType<Recordable>,
    default: () => ({}),
  },
  // 关联映射：将 row[sourceField] 赋给查询中的 field
  link: {
    type: Object as PropType<{ field: string; sourceField?: string }>,
    default: () => ({ field: 'parentId', sourceField: 'id' }),
  },
  // 统一额外查询条件，所有 tabs 共享（每个 tab 也可有自己的 extraQuery 叠加）
  queryExtra: {
    type: Object as PropType<Recordable>,
    default: () => ({}),
  },
});

type TableConfig = {
  table: string;
  name?: string;
  columns?: any[];
};

const activeKey = ref<string>('');
const tabState = reactive<Record<string, { loading: boolean; error?: any; config?: TableConfig }>>({});

async function loadConfig(tab: TabProp) {
  if (!tabState[tab.key]) {
    tabState[tab.key] = { loading: false };
  }
  if (tabState[tab.key].config || tabState[tab.key].loading) return;
  tabState[tab.key].loading = true;
  try {
    const cfg = await getPageConfig(tab.table);
    tabState[tab.key].config = cfg as TableConfig;
  } catch (e) {
    tabState[tab.key].error = e;
  } finally {
    tabState[tab.key].loading = false;
  }
}

onMounted(async () => {
  if (props.tabs.length) {
    const firstTab = props.tabs[0];
    activeKey.value = firstTab.key;
    // Load config for the first tab on mount
    await loadConfig(firstTab);
  }
});

// Lazy load config for other tabs when they become active
watch(activeKey, (key) => {
  if (key) {
    const tab = props.tabs.find((t) => t.key === key);
    if (tab) {
      loadConfig(tab);
    }
  }
});

// 单个 Tab 内部网格组件：相互独立，切换标签时不串状态
const ItemsTabGrid = defineComponent({
  name: 'ItemsTabGrid',
  props: {
    tableConfig: { type: Object as PropType<TableConfig>, required: true },
    tab: { type: Object as PropType<TabProp>, required: true },
    row: { type: Object as PropType<Recordable>, default: () => ({}) },
    link: { type: Object as PropType<{ field: string; sourceField?: string }>, required: true },
    queryExtra: { type: Object as PropType<Recordable>, default: () => ({}) },
  },
  setup(p) {
    const [FormDrawer, formDrawerApi] = useVbenDrawer({
      connectedComponent: Form,
      destroyOnClose: true,
      onClosed: () => {
        gridApi.query();
      },
    });

    const gridFormSchema = computed(() => useGridFormSchema(p.tableConfig));
    const columns = computed(() =>
      useColumns<SystemTableApi.SystemTable>(p.tableConfig, onActionClick),
    );

    const [Grid, gridApi] = useVbenVxeGrid({
      showSearchForm: false,
      formOptions: {
        collapsed: true,
        fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
        schema: gridFormSchema.value,
        submitOnChange: false,
      },
      gridOptions: {
        columns: columns.value,
        height: 500,
        keepSource: true,
        proxyConfig: {
          ajax: {
            query: async ({ page }, formValues) => {
              const sourceField = p.link.sourceField || 'id';
              const linkPart = p.row && p.link.field ? { [p.link.field]: p.row?.[sourceField] } : {};
              return await getPage(p.tableConfig.table, {
                page: page.currentPage,
                pageSize: page.pageSize,
                ...formValues,
                ...p.queryExtra,
                ...(p.tab.extraQuery || {}),
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

    function confirm(content: string, title: string) {
      return new Promise((resolve, reject) => {
        Modal.confirm({
          content,
          onCancel() {
            reject(new Error('已取消'));
          },
          onOk() {
            resolve(true);
          },
          title,
        });
      });
    }

    function onCreate() {
      // 传递当前表配置、以及与父表单的关联默认值
      const sourceField = p.link.sourceField || 'id';
      const defaultLink = p.row && p.link.field ? { [p.link.field]: p.row?.[sourceField] } : {};
      formDrawerApi.setData({ ...defaultLink }).open({ table: p.tableConfig });
    }

    function onEdit(row: SystemTableApi.SystemTable) {
      formDrawerApi.setData(row).open({ table: p.tableConfig });
    }

    async function onDelete(row: SystemTableApi.SystemTable) {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [row.name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await remove(p.tableConfig.table, row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.name]),
          key: 'action_process_msg',
        });
        gridApi.query();
      } catch {
        hideLoading();
      }
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
      // 首次加载
      gridApi.query();
    });

    return () => [
      h(FormDrawer, {
        class: 'w-full',
        table: p.tableConfig,
      }),
      h(
        Grid,
        {
        },
        {
          'toolbar-tools': () =>
            h(
              AccessControl,
              {
                codes: getTableAccessCodes(p.tableConfig.table, 'create'),
                type: 'code',
              },
              {
                default: () =>
                  h(
                    Button,
                    {
                      type: 'primary',
                      onClick: onCreate,
                    },
                    {
                      default: () => [h(Plus, { class: 'size-5' }), $t('ui.actionTitle.create', [])],
                    },
                  ),
              },
            ),
        },
      ),
    ];
  },
});
</script>

<template>
  <div class="items-wrapper">
    <Tabs v-model:activeKey="activeKey">
      <Tabs.TabPane v-for="tab in tabs" :key="tab.key" :tab="tabState[tab.key]?.config?.name || tab.title || tab.table">
        <div v-if="tabState[tab.key]?.loading" class="p-4 text-gray-400">Loading...</div>
        <div v-else-if="tabState[tab.key]?.error" class="p-4 text-red-500">加载失败</div>
        <div v-else-if="tabState[tab.key]?.config?.columns">
          <ItemsTabGrid
            :key="tab.key"
            :tab="tab"
            :table-config="tabState[tab.key].config!"
            :row="row"
            :link="link"
            :query-extra="queryExtra"
          />
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.items-wrapper {
  width: 100%;
}
</style>
