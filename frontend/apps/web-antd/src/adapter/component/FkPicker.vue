<template>
  <div class="w-full">
    {{ mask }}
    <div v-if="!disabled" class="w-full flex">
      <Select
        class="flex-grow"
        v-model:value="modelValue"
        :default-active-first-option="false"
        show-search
        label-in-value
        :filter-option="false"
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
    <div v-else>{{ modelValue }}</div>
    <Modal
      title="选择数据"
      v-model:open="isModalVisible"
      @ok="handleOk"
      @cancel="handleCancel"
      width="80%"
    >
      <div class="mb-4">
        <!-- TODO 支持多条件过滤 -->
        <Input.Search
          v-model:value="modalSearchKeyword"
          placeholder="搜索..."
          @search="handleModalSearch"
          @change="handleModalSearchChange"
          allowClear
        />
      </div>
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
import { Select, Modal, Table, Button, Input } from 'ant-design-vue';
import { getPageConfig, keywordSearch } from '#/api';
import type { TableColumnType } from 'ant-design-vue';
import { FilterOutlined } from '@ant-design/icons-vue'
const props = defineProps({
  mask: {
    type: String,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
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
const selections = ref<any[]>([]);
const isModalVisible = ref(false);
const modalSearchKeyword = ref('');

const modelValue = defineModel<any>({ default: undefined });

const tableData = ref<any[]>([]);
const loading = ref(false);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

const toFilterTableColumn = (col: any) => {
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

const currentFilters = ref<any>({});

const fetchData = async (params = {}) => {
  loading.value = true;
  try {
    const result: any = await getPage(props.table as string, {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      ...currentFilters.value,
      ...params,
    });
    console.log('🚀 ~ fetchData ~ result:', result);
    tableData.value = result.items;
    pagination.value.total = result.total;
  } catch (error) {
    console.error('获取数据失败:', error);
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
};

const search = async (value: string) => {
  console.log('Search value:', value);
  if (!value || value.trim() === '') {
    return;
  }

  try {
    let res: any = await keywordSearch(props.table, value.trim());
    console.log('🚀 ~ search ~ res:', res);
    if (res && res.items) {
      selections.value = res.items.map((item: any) => ({
        id: item.id,
        name: item.name || item.id,
      }));
    } else {
      selections.value = [];
    }
  } catch (error) {
    console.error('搜索失败:', error);
    selections.value = [];
  }
};

watch(isModalVisible, (newVal) => {
  if (newVal) {
    modalSearchKeyword.value = '';
    currentFilters.value = {};
    pagination.value.current = 1;
    fetchData(); // 获取数据
    selectedRowKeys.value = selections.value.map((item) => item.id); // 预选已选择的项目
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

  if (props.mode === 'multiple') {
    // 多选模式：合并已选择的项目
    const mergedMap = new Map();
    selections.value.forEach((item) => mergedMap.set(item.id, item));
    selectedRows.value.forEach((item) => {
      mergedMap.set(item.id, {
        id: item.id,
        name: item.name || item[Object.keys(item).find(key => key !== 'id') || 'id'] || item.id
      });
    });
    selections.value = Array.from(mergedMap.values());
    modelValue.value = selections.value.map((item) => item.id);
  } else {
    // 单选模式
    if (selectedRows.value.length > 0) {
      const selectedItem = selectedRows.value[0];
      selections.value = [{
        id: selectedItem.id,
        name: selectedItem.name || selectedItem[Object.keys(selectedItem).find(key => key !== 'id') || 'id'] || selectedItem.id
      }];
      modelValue.value = selectedItem.id;
    } else {
      selections.value = [];
      modelValue.value = undefined;
    }
  }

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
  type: (props.mode === 'single' ? 'radio' : 'checkbox') as 'radio' | 'checkbox',
  onChange: onSelectChange,
}));

const handleModalSearch = (value: string) => {
  currentFilters.value = { ...currentFilters.value, keyword: value };
  pagination.value.current = 1; // 重置到第一页
  fetchData();
};

const handleModalSearchChange = (e: any) => {
  if (!e.target.value) {
    // 清空搜索时重新获取数据
    const { keyword, ...otherFilters } = currentFilters.value;
    currentFilters.value = otherFilters;
    pagination.value.current = 1;
    fetchData();
  }
};

const handleTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;

  // 处理过滤条件
  const newFilters: any = { ...currentFilters.value };
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key].length > 0) {
      newFilters[`${key}-in`] = filters[key].join(',');
    }
  });

  // 处理排序
  if (sorter && sorter.field) {
    newFilters.sortBy = sorter.field;
    newFilters.sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
  }

  currentFilters.value = newFilters;
  fetchData();
};
</script>

<style scoped></style>
