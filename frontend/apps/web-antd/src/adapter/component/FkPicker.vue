<template>
  <div>
    <div class="w-full flex">
      <Select
        class="flex-grow"
        v-model:value="modelValue"
        show-search
        label-in-value
        allow-clear
        :mode="mode"
        :options="
          selections.map((item) => ({ label: item.name, value: item.id }))
        "
        @search="search"
      >
        <template #suffixIcon>
          <FilterOutlined @click="openFilter" />
        </template>
      </Select>
    </div>
    <Modal
      title="选择数据"
      v-model:open="isModalVisible"
      @ok="handleOk"
      @cancel="handleCancel"
      width="80%"
    >
    {{ selections }}
      <Table
        :columns="columns"
        :data-source="tableData"
        :row-selection="rowSelection"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      ></Table>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineModel, ref, watch, computed } from 'vue';
import { getPage } from '#/api/system/crud';
import { Select, Modal, Table, Button } from 'ant-design-vue';
import { getPageConfig, keywordSearch } from '#/api';
import type { TableColumnType } from 'ant-design-vue';
import { FilterOutlined } from '@ant-design/icons-vue'
const props = defineProps({
  table: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    default: 'single',
  },
});

const refTable = ref<any>({});
const selections = ref<any[]>([]); // Changed to array to store multiple selections
const isModalVisible = ref(false); // Added for modal visibility

const modelValue = defineModel<any>({ default: undefined });

const tableData = ref<any[]>([]);
const loading = ref(false);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

const toFilterTableColumn = col => {
  return {
    title: col.label,
    dataIndex: col.fieldName,
    key: col.fieldName,
  }
}

const columns = computed(() => {
  return refTable.value.columns.map(toFilterTableColumn);
});

const selectedRowKeys = ref<any[]>([]); // To hold selected keys from the table
const selectedRows = ref<any[]>([]); // To hold selected rows from the table

const fetchData = async (params = {}) => {
  loading.value = true;
  try {
    const result: any = await getPage(props.table as string, {
      page: pagination.value.current,
      size: pagination.value.pageSize,
      ...params,
    });
    console.log('🚀 ~ fetchData ~ result:', result);
    tableData.value = result.items; // Assuming result has a data property
    pagination.value.total = result.total; // Assuming result has a total property
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    loading.value = false;
  }
};

const search = async (value: string) => {
  console.log('Search value:', value);
  let res = await keywordSearch(props.table, value)
  console.log('🚀 ~ search ~ res:', res)
  selections.value = res.items.map((item: any) => ({
    id: item.id,
    name: item.name, // Assuming the item has a name field
  }));
};

watch(isModalVisible, (newVal) => {
  if (newVal) {
    fetchData(); // Fetch data when modal opens
    selectedRowKeys.value = selections.value.map((item) => item.id); // Pre-select existing selections
    selectedRows.value = [...selections.value];
  }
});

const openFilter = async () => {
  console.log('Filter opened for table:', props.table, modelValue);
  refTable.value = await getPageConfig(props.table);
  isModalVisible.value = true;
};

const handleOk = () => {
  console.log('Selected Rows:', selectedRows.value);
  // Merge selectedRows with existing selections
  if (props.mode === 'multiple') {
    // Create a map to store unique items by ID, prioritizing newly selected items
    const mergedMap = new Map();
    selections.value.forEach((item) => mergedMap.set(item.id, item));
    selectedRows.value.forEach((item) => mergedMap.set(item.id, item));
    selections.value = Array.from(mergedMap.values())
  } else {
    selections.value =
      selectedRows.value.length > 0 ? [selectedRows.value[0]] : [];
  }

  modelValue.value = selections.value.map((item) => item.id); // Assuming modelValue stores IDs

  isModalVisible.value = false;
};

const handleCancel = () => {
  isModalVisible.value = false;
  selectedRowKeys.value = []; // Clear selections on cancel
  selectedRows.value = [];
};

const onSelectChange = (keys: any[], rows: any[]) => {
  selectedRowKeys.value = keys;
  selectedRows.value = rows;
};

// Row selection object for Ant Design Table
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  type: props.mode === 'single' ? 'radio' : 'checkbox',
  onChange: onSelectChange,
}));

const handleTableChange = (pag: any) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
};
</script>

<style scoped></style>
