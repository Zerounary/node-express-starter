<template>
  <div class="w-full">
    <div v-if="!disabled" class="flex w-full">
      <AutoComplete
        class="flex-grow"
        v-model:value="displayValue"
        :open="searchOpen"
        :default-active-first-option="false"
        label-in-value
        show-search
        :filter-option="false"
        :mode="mode"
        :options="selections"
        @select="(value) => (searchOpen = false)"
        @change="handleSelectChange"
        @search="search"
        :loading="loading"
      >
        <InputSearch @search="openFilter">
          <template #enterButton>
            <FilterOutlined />
          </template>
        </InputSearch>
      </AutoComplete>
    </div>
    <div v-else>{{ displayValue }}</div>
    <Modal title="请选择" class="w-[800px]">
      <Grid></Grid>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineModel, ref, watch, computed, nextTick } from 'vue';
import { getPage, getList } from '#/api/system/crud';
import { AutoComplete, InputSearch } from 'ant-design-vue';
import { getPageConfig, keywordSearch } from '#/api';
import { FilterOutlined } from '@ant-design/icons-vue';
import { useVbenVxeGrid } from '../vxe-table';
import { useGridFormSchema, useColumns } from '#/views/system/crud/data';
import { useVbenModal } from '@vben/common-ui';

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

// Internal state
const selectValue = ref<any>();
const selections = ref<any[]>([]); // Cache for options: { label, value, _item }
const loading = ref(false);
const searchOpen = ref(false);

// Mode detection
const isUpdatingInternally = ref(false);
const valueIsObject = ref(false);
const modeDetermined = ref(false);

// Modal state
const isModalVisible = ref(false);
const modalSearchKeyword = ref('');
const refTable = ref<any>({});
const tableData = ref<any[]>([]);
const pagination = ref({ current: 1, pageSize: 10, total: 0 });
const selectedRowKeys = ref<any[]>([]);
const selectedRows = ref<any[]>([]);
const currentFilters = ref<any>({});

const columns = computed(() => {
  return (
    refTable.value.columns?.map((col: any) => ({
      title: col.label,
      dataIndex: col.fieldName,
      key: col.fieldName,
    })) || []
  );
});

const displayValue = computed(() => {
  if (selectValue.value?.label) {
    return selectValue.value.label;
  }
  const mv = modelValue.value;
  if (!mv) return '';
  if (typeof mv === 'object' && mv !== null) {
    return mv.name || mv[props.valueKey] || '';
  }
  return mv;
});

// Ensures an option for a given value exists in `selections`, fetching if necessary.
const ensureOption = async (value: any) => {
  if (value === undefined || value === null) return null;

  const primitiveValue =
    typeof value === 'object' && value !== null ? value[props.valueKey] : value;
  if (primitiveValue === undefined || primitiveValue === null) return null;

  const existing = selections.value.find((opt) => opt.value === primitiveValue);
  if (existing) return existing;

  loading.value = true;
  try {
    const filter = { [`${props.valueKey}-in`]: primitiveValue };
    const result: any[] = await getList(props.table, {
      ...filter,
      ...props.queryExtra,
    });
    const item = result.find((r) => r[props.valueKey] === primitiveValue);
    if (item) {
      const newOption = {
        label: item.name || item.id,
        value: item[props.valueKey],
        _item: item,
      };
      selections.value.unshift(newOption);
      return newOption;
    }
  } catch (e) {
    console.error('Failed to fetch option', e);
  } finally {
    loading.value = false;
  }
  return null;
};

watch(
  modelValue,
  async (newVal) => {
    if (isUpdatingInternally.value) return;

    if (!modeDetermined.value && newVal !== undefined && newVal !== null) {
      valueIsObject.value =
        typeof newVal === 'object' && !Array.isArray(newVal);
      modeDetermined.value = true;
    }

    if (
      newVal === undefined ||
      newVal === null ||
      (Array.isArray(newVal) && newVal.length === 0)
    ) {
      selectValue.value = undefined;
      return;
    }

    const option = await ensureOption(newVal);

    if (option) {
      selectValue.value = { value: option.value, label: option.label };
      if (valueIsObject.value && (typeof newVal !== 'object' || !newVal.name)) {
        // Upgrade to full object if needed
        isUpdatingInternally.value = true;
        modelValue.value = option._item;
        nextTick(() => {
          isUpdatingInternally.value = false;
        });
      }
    } else {
      selectValue.value = undefined;
    }
  },
  { immediate: true, deep: true },
);

const handleSelectChange = (val: any) => {
  isUpdatingInternally.value = true;
  if (!val) {
    modelValue.value = undefined;
  } else {
    const selectedOption = selections.value.find(
      (opt) => opt.value === val.value,
    );
    if (selectedOption) {
      modelValue.value = valueIsObject.value
        ? selectedOption._item
        : selectedOption.value;
    } else {
      modelValue.value = valueIsObject.value ? null : val.value;
    }
  }
  selectValue.value = val;
  nextTick(() => {
    isUpdatingInternally.value = false;
  });
};

const search = async (keyword: string) => {
  if (!keyword || keyword.trim() === '') {
    selections.value = selections.value.slice(0, 1); // Keep current selection
    return;
  }
  loading.value = true;
  searchOpen.value = true;
  try {
    const result: any = await keywordSearch(props.table, keyword.trim(), {
      ...props.queryExtra,
    });
    if (result && result.items) {
      const newOptions = result.items.map((item: any) => ({
        label: item.name || item.id,
        value: item[props.valueKey],
        _item: item,
      }));
      const currentVal = selectValue.value;
      if (
        currentVal &&
        !newOptions.some((opt) => opt.value === currentVal.value)
      ) {
        const currentOption = selections.value.find(
          (opt) => opt.value === currentVal.value,
        );
        if (currentOption) newOptions.unshift(currentOption);
      }
      selections.value = newOptions;
    }
  } catch (error) {
    console.error('搜索失败:', error);
  } finally {
    loading.value = false;
  }
};

watch(isModalVisible, (newVal) => {
  if (newVal) {
    modalSearchKeyword.value = '';
    currentFilters.value = {};
    pagination.value.current = 1;
    fetchData();
    const currentVal = valueIsObject.value
      ? modelValue.value?.[props.valueKey]
      : modelValue.value;
    selectedRowKeys.value = currentVal
      ? Array.isArray(currentVal)
        ? currentVal
        : [currentVal]
      : [];
    selectedRows.value = [];
  }
});

const fetchData = async (params = {}) => {
  loading.value = true;
  try {
    const result: any = await getPage(props.table, {
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
  } finally {
    loading.value = false;
  }
};

const handleOk = () => {
  isUpdatingInternally.value = true;
  console.log('Selected Rows:', selectedRows.value);
  if (props.mode === 'multiple') {
    const newItems = selectedRows.value;
    modelValue.value = valueIsObject.value
      ? newItems
      : newItems.map((item) => item[props.valueKey]);
  } else {
    if (selectedRows.value.length > 0) {
      const selectedItem = selectedRows.value[0];
      const newOption = {
        label: selectedItem.name || selectedItem.id,
        value: selectedItem[props.valueKey],
        _item: selectedItem,
      };
      if (!selections.value.some((opt) => opt.value === newOption.value)) {
        selections.value.unshift(newOption);
      }
      selectValue.value = { value: newOption.value, label: newOption.label };
      modelValue.value = valueIsObject.value ? selectedItem : newOption.value;
    } else {
      selectValue.value = undefined;
      modelValue.value = undefined;
    }
  }
  modalApi.close();
  nextTick(() => {
    isUpdatingInternally.value = false;
  });
};

const handleCancel = () => {
  modalApi.close();
};
const onSelectChange = (keys: any[], rows: any[]) => {
  selectedRowKeys.value = keys;
  selectedRows.value = rows;
};
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  type: (props.mode === 'single' ? 'radio' : 'checkbox') as
    | 'radio'
    | 'checkbox',
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
  const newFilters: any = { ...currentFilters.value };
  Object.keys(filters).forEach((key) => {
    if (filters[key]?.length) newFilters[`${key}-in`] = filters[key].join(',');
  });
  if (sorter?.field) {
    newFilters.sortBy = sorter.field;
    newFilters.sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
  }
  currentFilters.value = newFilters;
  fetchData();
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: [],
    submitOnChange: false,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
    },
    columns: [],
    height: '400px',
    keepSource: true,
    stripe: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getPage(refTable.value.table, {
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
  },
  gridEvents: {
    radioChange({ row }) {
      selectedRows.value = [row];
      selectedRowKeys.value = [row.id]
    },
    checkboxChange({checked, row}) {
      console.log('🚀 ~ checkboxChange ~ checked, row:', checked, row);
      if(checked) {
        selectedRowKeys.value.push(row.id);
        selectedRows.value.push(row);
      } else {
        const index = selectedRowKeys.value.findIndex(id => id === row.id);
        if(index > -1) {
          selectedRowKeys.value.splice(index, 1);
          selectedRows.value.splice(index, 1);
        }
      }
    },
  },
});

const [Modal, modalApi] = useVbenModal({
  draggable: true,
  onConfirm() {
    console.log('Modal onConfirm');
    handleOk();
  },
  onOpened() {
    gridApi.formApi.setState({
      schema: useGridFormSchema(refTable.value),
    });
    gridApi.setState({
      gridOptions: {
        columns: [
          ...[
            props.mode === 'multiple'
              ? { type: 'checkbox', width: 40 }
              : { type: 'radio', width: 40 },
          ],
          { type: 'seq', width: 40 },
          ...useColumns(refTable.value, null),
        ],
      },
    });
    gridApi.query();
  },
});
// --- Modal Logic ---
const openFilter = async () => {
  refTable.value = await getPageConfig(props.table);
  modalApi.open();
};
</script>

<style scoped></style>
