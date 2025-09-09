<template>
  <div class="w-full">
    <div v-if="!disabled" class="flex w-full">
      <Select
        class="flex-grow"
        v-model:value="selectValue"
        :open="searchOpen"
        label-in-value
        show-search
        :filter-option="false"
        :mode="props.mode === 'multiple' ? 'multiple' : undefined"
        :options="selections"
        @select="() => (searchOpen = false)"
        @change="handleSelectChange"
        @search="search"
        :loading="loading"
        :allow-clear="true"
        :max-tag-count="props.mode === 'multiple' ? 2 : undefined"
        :placeholder="placeholder"
      />
      <Button @click="openFilter" class="ml-1"><FilterOutlined /></Button>
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
import { Select, Button } from 'ant-design-vue';
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

const modelValue = defineModel<any>();


// --- Internal State ---
const loading = ref(false);
const isUpdatingInternally = ref(false); // Flag to prevent watch loops
const valueIsObject = ref(false); // Determines if v-model is an object or primitive
const modeDetermined = ref(false); // Flag to check if v-model type has been determined

// --- AutoComplete State ---
const selectValue = ref<any>(props.mode === 'multiple' ? [] : undefined); // The value shown in the AutoComplete input
const selections = ref<any[]>([]); // Options for AutoComplete: { label, value, _item }
const searchOpen = ref(false);

// --- Modal & Grid State ---
const refTable = ref<any>({}); // Configuration for the grid table
const selectedRowKeys = ref<any[]>([]);
const selectedRows = ref<any[]>([]);

// --- Computed Properties ---
const placeholder = computed(() => {
  if (props.mode === 'multiple') {
    if (Array.isArray(selectValue.value) && selectValue.value.length > 0) {
      return selectValue.value.map((v) => v.label).join(', ');
    }
    return '请选择';
  }
  return '请选择';
});

const displayValue = computed(() => {
  if (props.mode === 'multiple') {
    if (!selectValue.value || selectValue.value.length === 0) return '';
    return selectValue.value.map((v) => v.label).join(', ');
  }

  if (selectValue.value?.label) {
    return selectValue.value.label;
  }
  // Fallback for initial value before selectValue is populated
  const mv = modelValue.value;
  if (!mv) return '';
  if (typeof mv === 'object' && mv !== null) {
    return mv.name || mv[props.valueKey] || '';
  }
  return mv;
});

// --- Core Logic: v-model synchronization ---
/**
 * Ensures options for given values exist in `selections` cache.
 * If not present, it fetches items from the server.
 * This is crucial for initializing the component with values that haven't been searched for yet.
 */
const ensureOptionsInCache = async (values: any | any[]) => {
  const valueArr = Array.isArray(values) ? values : [values];
  if (
    valueArr.length === 0 ||
    valueArr.every((v) => v === undefined || v === null)
  ) {
    return [];
  }

  const primitiveValues = valueArr
    .map((v) => (typeof v === 'object' && v !== null ? v[props.valueKey] : v))
    .filter((v) => v !== undefined && v !== null);

  if (primitiveValues.length === 0) return [];

  const existingOptions = selections.value.filter((opt) =>
    primitiveValues.includes(opt.value),
  );
  const missingValues = primitiveValues.filter(
    (pv) => !existingOptions.some((opt) => opt.value === pv),
  );

  if (missingValues.length === 0) {
    return existingOptions;
  }

  loading.value = true;
  try {
    const filter = { [`${props.valueKey}-in`]: Array.isArray(missingValues) ? missingValues.join(',') : missingValues };
    const result: any[] = await getList(props.table, {
      ...filter,
      ...props.queryExtra,
    });

    const newOptions = result.map((item) => ({
      label: item.name || item.id,
      value: item[props.valueKey],
      _item: item,
    }));

    // Add to cache, avoiding duplicates
    const existingValues = new Set(selections.value.map((s) => s.value));
    const uniqueNewOptions = newOptions.filter(
      (opt) => !existingValues.has(opt.value),
    );
    selections.value.unshift(...uniqueNewOptions);

    // Find all requested options from the updated cache
    return selections.value.filter((opt) => primitiveValues.includes(opt.value));
  } catch (e) {
    console.error('Failed to fetch options', e);
  } finally {
    loading.value = false;
  }
  return existingOptions; // Return what we found if fetch fails
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

    const isMultiEmpty =
      props.mode === 'multiple' && Array.isArray(newVal) && newVal.length === 0;
    if (newVal === undefined || newVal === null || isMultiEmpty) {
      selectValue.value = props.mode === 'multiple' ? [] : undefined;
      return;
    }

    const options = await ensureOptionsInCache(newVal);

    if (props.mode === 'multiple') {
      selectValue.value = options.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }));
    } else {
      const option = options[0];
      if (option) {
        selectValue.value = { value: option.value, label: option.label };
        if (
          valueIsObject.value &&
          (typeof newVal !== 'object' || !newVal.name)
        ) {
          isUpdatingInternally.value = true;
          modelValue.value = option._item;
          nextTick(() => {
            isUpdatingInternally.value = false;
          });
        }
      } else {
        selectValue.value = undefined;
      }
    }
  },
  { immediate: true, deep: true },
);

// --- AutoComplete Event Handlers ---
const handleSelectChange = (val: any) => {
  isUpdatingInternally.value = true;
  selectValue.value = val; // val is the source of truth from Select component

  if (!val || (Array.isArray(val) && val.length === 0)) {
    modelValue.value = props.mode === 'multiple' ? [] : undefined;
  } else {
    if (props.mode === 'multiple') {
      const values = val.map((v) => v.value);
      const selectedFullOptions = selections.value.filter((opt) =>
        values.includes(opt.value),
      );

      if (valueIsObject.value) {
        modelValue.value = selectedFullOptions.map((opt) => opt._item);
      } else {
        modelValue.value = values;
      }
    } else {
      // single mode
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
  }

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
