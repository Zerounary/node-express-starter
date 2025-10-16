<script setup lang="ts">
import type { PropType } from 'vue';
import type { Recordable } from '@vben/types';
import type { TableConfig } from './types';

import { onMounted, reactive, ref, watch } from 'vue';
import { Tabs } from 'ant-design-vue';
import { getPageConfig } from '#/api/system/table';
import ItemsTabGrid from './ItemsTabGrid.vue';

interface TabProp {
  key: string;
  table: string;
  parentKey: string;
  title?: string;
  queryExtra?: Record<string, any>;
}

const props = defineProps({
  tabs: {
    type: Array as PropType<TabProp[]>,
    required: true,
  },
  row: {
    type: Object as PropType<Recordable>,
    default: () => ({}),
  },
});

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
    await loadConfig(firstTab);
  }
});

watch(activeKey, (key) => {
  if (key) {
    const tab = props.tabs.find((t) => t.key === key);
    if (tab) {
      loadConfig(tab);
    }
  }
});
</script>

<template>
  <div class="items-wrapper mt-6">
    <Tabs v-model:activeKey="activeKey" :tabBarStyle="{ marginBottom: '0' }">
      <Tabs.TabPane v-for="tab in tabs" :key="tab.key" :tab="tabState[tab.key]?.config?.name || tab.title || tab.table">
        <div v-if="tabState[tab.key]?.loading" class="p-4 text-gray-400">Loading...</div>
        <div v-else-if="tabState[tab.key]?.error" class="p-4 text-red-500">加载失败</div>
        <div v-else-if="tabState[tab.key]?.config?.columns">
          <ItemsTabGrid
            :key="tab.key"
            :tab="tab"
            :parent-id="row.id"
            :parent-key="tab.parentKey"
            :table-config="tabState[tab.key].config!"
            :row="row"
            :query-extra="tab.queryExtra"
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
