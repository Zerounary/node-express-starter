<template>
  <div class="w-full">
    {{ modelValue }}
    <div v-if="!disabled" class="w-full flex">
      <Select
        class="flex-grow"
        v-model:value="selectValue"
        :default-active-first-option="false"
        show-search
        label-in-value
        :filter-option="false"
        allow-clear
        :mode="mode"
        :options="selections"
        @change="handleSelectChange"
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
import { defineProps, defineModel, ref, watch, computed, nextTick, type PropType } from 'vue';
import { getPage, getList } from '#/api/system/crud';
import { Select, Modal, Table, Input } from 'ant-design-vue';
import { getPageConfig } from '#/api';
import { FilterOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  table: {
    type: String,
    required: true,
  },
  valueKey: {
    type: String,
    default: 'id',
  },
  queryExtra: { type: Object, default: () => ({}) },
  mode: {
    type: String,
    default: 'single', // 'single' or 'multiple'
  },
});

const modelValue = defineModel<any>({ default: undefined });

// Internal state for the Select component
const selectValue = ref<any>();
const selections = ref<any[]>([]); // holds { label, value, _item }

// Modal state
const isModalVisible = ref(false);
const modalSearchKeyword = ref('');
const refTable = ref<any>({});
const tableData = ref<any[]>([]);
const loading = ref(false);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});
const selectedRowKeys = ref<any[]>([]);
const selectedRows = ref<any[]>([]);
const currentFilters = ref<any>({});

const columns = computed(() => {
  return refTable.value.columns?.map((col: any) => ({
    title: col.label,
    dataIndex: col.fieldName,
    key: col.fieldName,
  })) || [];
});

// Flag to prevent watch loops
const isUpdatingInternally = ref(false);

// Search function for the Select dropdown
const search = async (keyword: string) => {
  if (!keyword || keyword.trim() === '') {
    selections.value = [];
    return;
  }
  loading.value = true;
  try {
    const result: any = await getPage(props.table, {
      page: 1,
      pageSize: 20,
      keyword: keyword.trim(),
      ...props.queryExtra,
    });
    if (result && result.items) {
      selections.value = result.items.map((item: any) => ({
        label: item.name || item.id,
        value: item[props.valueKey],
        _item: item,
      }));
    } else {
      selections.value = [];
    }
  } catch (error) {
    console.error('搜索失败:', error);
    selections.value = [];
  } finally {
    loading.value = false;
  }
};

// Watch for external changes to modelValue to initialize/update the component
watch(modelValue, async (newVal) => {
  if (isUpdatingInternally.value) return;

  if (!newVal || (Array.isArray(newVal) && newVal.length === 0)) {
    selectValue.value = undefined;
    selections.value = [];
    return;
  }

  const alreadyLoaded = selections.value.some(opt => opt.value === newVal);
  if (alreadyLoaded) {
    const currentSelection = selections.value.find(opt => opt.value === newVal);
    if (currentSelection) {
        selectValue.value = {
            value: currentSelection.value,
            label: currentSelection.label,
        };
    }
    return;
  }

  loading.value = true;
  try {
    const filter = { [`${props.valueKey}-in`]: Array.isArray(newVal) ? newVal.join(',') : newVal };
    const result: any[] = await getList(props.table, { ...filter, ...props.queryExtra });

    if (result && result.length > 0) {
      // For now, focusing on single mode initialization
      const item = result.find(r => r[props.valueKey] === newVal);
      if (item) {
        const newOption = {
          label: item.name || item.id,
          value: item[props.valueKey],
          _item: item,
        };
        selections.value = [newOption, ...selections.value.filter(opt => opt.value !== newOption.value)];
        selectValue.value = {
          value: newOption.value,
          label: newOption.label,
        };
      }
    }
  } catch (error) {
    console.error('恢复值失败:', error);
  } finally {
    loading.value = false;
  }
}, { immediate: true });

// Handle user selection from the dropdown
const handleSelectChange = (val: any) => {
  isUpdatingInternally.value = true;
  modelValue.value = val?.value;

  if (val) {
    const existing = selections.value.find(opt => opt.value === val.value);
    if (!existing) {
      selections.value.push({
        label: val.label,
        value: val.value,
      });
    }
  }

  nextTick(() => {
    isUpdatingInternally.value = false;
  });
};

// --- Modal Logic ---

const openFilter = async () => {
  console.log('Filter opened for table:', props.table, modelValue);
  refTable.value = await getPageConfig(props.table);
  isModalVisible.value = true;
};

watch(isModalVisible, (newVal) => {
  if (newVal) {
    modalSearchKeyword.value = '';
    currentFilters.value = {};
    pagination.value.current = 1;
    fetchData();
    // Pre-select rows based on current modelValue
    const currentVal = modelValue.value;
    if (currentVal) {
        selectedRowKeys.value = Array.isArray(currentVal) ? currentVal : [currentVal];
        // selectedRows might need to be fetched if not already present
    } else {
        selectedRowKeys.value = [];
    }
    selectedRows.value = []; // Reset selected rows, will be populated by table logic
  }
});

const fetchData = async (params = {}) => {
  loading.value = true;
  try {
    const result: any = await getPage(props.table as string, {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      ...props.queryExtra,
      ...currentFilters.value,
      ...params,
    });
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

const handleOk = () => {
  isUpdatingInternally.value = true;

  if (props.mode === 'multiple') {
    // Not implemented in detail as per focus on single mode refactor
    modelValue.value = selectedRows.value.map(item => item[props.valueKey]);
  } else {
    // Single mode
    if (selectedRows.value.length > 0) {
      const selectedItem = selectedRows.value[0];
      const newOption = {
        label: selectedItem.name || selectedItem.id,
        value: selectedItem[props.valueKey],
        _item: selectedItem,
      };
      selections.value = [newOption];
      selectValue.value = { value: newOption.value, label: newOption.label };
      modelValue.value = newOption.value;
    } else {
      selections.value = [];
      selectValue.value = undefined;
      modelValue.value = undefined;
    }
  }

  isModalVisible.value = false;
  nextTick(() => {
    isUpdatingInternally.value = false;
  });
};

const handleCancel = () => {
  isModalVisible.value = false;
};

const onSelectChange = (keys: any[], rows: any[]) => {
  selectedRowKeys.value = keys;
  selectedRows.value = rows;
};

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  type: (props.mode === 'single' ? 'radio' : 'checkbox') as 'radio' | 'checkbox',
  onChange: onSelectChange,
  preserveSelectedRowKeys: true,
}));

const handleModalSearch = (value: string) => {
  currentFilters.value = { ...currentFilters.value, keyword: value };
  pagination.value.current = 1;
  fetchData();
};

const handleModalSearchChange = (e: any) => {
  if (!e.target.value) {
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
