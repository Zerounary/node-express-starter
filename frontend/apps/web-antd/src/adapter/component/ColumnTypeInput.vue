<template>
  <div class="column-type-input">
    <a-select
      v-model:value="selectedKey"
      :showSearch="true"
      :allowClear="allowClear"
      :placeholder="placeholder"
      :filterOption="filterOption"
      @change="handleChange"
      style="width: 100%"
    >
      <a-select-option
        v-for="opt in options"
        :key="opt.label"
        :value="opt.value"
      >
        {{ opt.label }}
      </a-select-option>
    </a-select>
  </div>
</template>

<script setup lang="ts">
import { defineModel, withDefaults, defineProps, ref, watch } from 'vue';
import {
  Select as ASelect,
  SelectOption as ASelectOption,
} from 'ant-design-vue';
import { ColumnDataTypes } from '../../../../../../shared/ColumnDataTypes';

withDefaults(
  defineProps<{
    placeholder?: string;
    allowClear?: boolean;
  }>(),
  {
    placeholder: '选择数据类型...',
    allowClear: true,
  },
);

// 下拉选项
const options = Object.entries(ColumnDataTypes).map(([k, v]) => ({
  label: k,
  originalValue: v,
  value: `${k}-${v}`,
}));
const selectedKey = ref('');
// v-model 双向绑定（选中的类型值）
const model = defineModel<string | undefined>();

watch(
  () => model.value,
  (newVal) => {
    const matched = options.find((option) => option.originalValue === newVal);
    selectedKey.value = matched ? matched.value : '';
  },
  { immediate: true },
);

// 搜索过滤：按 label/value/key 全文匹配
const filterOption = (input: string, option?: any) => {
  const label = (option?.label || '').toString();
  const value = (option?.value || '').toString();
  const key = (option?.key || '').toString();
  const haystack = `${label} ${value} ${key}`.toLowerCase();
  return haystack.includes(input.toLowerCase());
};

// 处理选择变化
const handleChange = (uniqueKey) => {
  selectedKey.value = uniqueKey;
  const selected = options.find((option) => option.value === uniqueKey);
  if (selected) {
    // 直接更新modelValue
    model.value = selected.originalValue;
  }
};
</script>

<style scoped>
.column-type-input {
  width: 100%;
}
</style>
