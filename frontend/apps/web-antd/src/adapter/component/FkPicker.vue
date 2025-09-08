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

// --- Component Props and Model ---
const props = defineProps({
  disabled: { type: Boolean, default: false },
  table: { type: String, required: true },
  valueKey: { type: String, default: 'id' },
  queryExtra: { type: Object, default: () => ({}) },
  mode: {
    type: String,
    default: 'single', // 'single' or 'multiple'
  },
});

const modelValue = defineModel<any>({ default: undefined });

// --- Internal State ---
const loading = ref(false);
const isUpdatingInternally = ref(false); // Flag to prevent watch loops
const valueIsObject = ref(false); // Determines if v-model is an object or primitive
const modeDetermined = ref(false); // Flag to check if v-model type has been determined

// --- AutoComplete State ---
const selectValue = ref<any>(); // The value shown in the AutoComplete input
const selections = ref<any[]>([]); // Options for AutoComplete: { label, value, _item }
const searchOpen = ref(false);

// --- Modal & Grid State ---
const refTable = ref<any>({}); // Configuration for the grid table
const selectedRowKeys = ref<any[]>([]);
const selectedRows = ref<any[]>([]);

// --- Computed Properties ---
const displayValue = computed(() => {
  if (selectValue.value?.label) {
    return selectValue.value.label;
  }
  const mv = modelValue.value;
  if (!mv) return '';
  if (typeof mv === 'object' && mv !== null) {
    // For object value, display 'name' or the value of 'valueKey' prop
    return mv.name || mv[props.valueKey] || '';
  }
  return mv;
});

// --- Core Logic: v-model synchronization ---
/**
 * Ensures an option for a given value exists in `selections` cache.
 * If not present, it fetches the item from the server.
 * This is crucial for initializing the component with a value that hasn't been searched for yet.
 */
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

    // Determine if the v-model is an object based on its initial value.
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
      // If v-model is expected to be an object but a primitive was passed,
      // upgrade it to the full object.
      if (valueIsObject.value && (typeof newVal !== 'object' || !newVal.name)) {
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

// --- AutoComplete Event Handlers ---
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
      // This case should ideally not happen if ensureOption works correctly
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
      // Keep the currently selected item in the list if it's not in the search results
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
    console.error('Search failed:', error);
  } finally {
    loading.value = false;
  }
};

// --- Modal and Grid Composables ---
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    collapsed: true,
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: [],
    submitOnChange: false,
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    radioConfig: { trigger: 'row' },
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
            ...props.queryExtra,
          });
        },
      },
    },
    rowConfig: { keyField: props.valueKey, isHover: true },
    sortConfig: { remote: true },
  },
  gridEvents: {
    radioChange({ row }) {
      selectedRows.value = [row];
      selectedRowKeys.value = [row[props.valueKey]];
    },
    checkboxChange({ checked, row }) {
      const key = row[props.valueKey];
      const isSelected = selectedRowKeys.value.includes(key);

      if (checked && !isSelected) {
        selectedRowKeys.value.push(key);
        selectedRows.value.push(row);
      } else if (!checked && isSelected) {
        selectedRowKeys.value = selectedRowKeys.value.filter(id => id !== key);
        selectedRows.value = selectedRows.value.filter(item => item[props.valueKey] !== key);
      }
    },
  },
});

const [Modal, modalApi] = useVbenModal({
  draggable: true,
  onConfirm: () => handleOk(),
  onOpened: () => {
    // Initialize grid with current selection
    const currentVal = valueIsObject.value
      ? modelValue.value?.[props.valueKey]
      : modelValue.value;
    selectedRowKeys.value = currentVal
      ? Array.isArray(currentVal)
        ? currentVal
        : [currentVal]
      : [];
    selectedRows.value = []; // Will be populated by grid logic if needed

    // Configure and load grid data
    gridApi.formApi.setState({
      schema: useGridFormSchema(refTable.value),
    });
    gridApi.setState({
      gridOptions: {
        columns: [
          props.mode === 'multiple'
            ? { type: 'checkbox', width: 40 }
            : { type: 'radio', width: 40 },
          { type: 'seq', width: 40 },
          ...useColumns(refTable.value, null),
        ],
      },
    });
    gridApi.query();
  },
});

// --- Modal and Grid Event Handlers ---
const openFilter = async () => {
  refTable.value = await getPageConfig(props.table);
  modalApi.open();
};

const handleOk = () => {
  isUpdatingInternally.value = true;

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
      // Add to cache if not present
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
</script>

<style scoped></style>
