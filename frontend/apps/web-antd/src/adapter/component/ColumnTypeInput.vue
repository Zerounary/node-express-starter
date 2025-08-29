<template>
  <div class="column-type-input">
    <a-select
      v-model:value="model"
      :showSearch="true"
      :allowClear="allowClear"
      :placeholder="placeholder"
      :filterOption="filterOption"
      style="width: 100%"
    >
      <a-select-option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </a-select-option>
    </a-select>
  </div>
</template>

<script setup lang="ts">
import { defineModel, withDefaults, defineProps } from 'vue';
import { Select as ASelect, SelectOption as ASelectOption } from 'ant-design-vue';
import { ColumnDataTypes } from '../../../../../../shared/ColumnDataTypes';

withDefaults(
  defineProps<{
    placeholder?: string;
    allowClear?: boolean;
  }>(),
  {
    placeholder: '选择数据类型...',
    allowClear: true
  }
);

// 下拉选项
const options = Object.values(ColumnDataTypes).map((v) => ({ label: v, value: v }));

// v-model 双向绑定（选中的类型值）
const model = defineModel<string | undefined>();

// 搜索过滤：按 label/value/key 全文匹配
const filterOption = (input: string, option?: any) => {
  const label = (option?.label ?? option?.children ?? '').toString();
  const value = (option?.value ?? '').toString();
  const key = (option?.key ?? '').toString();
  const haystack = `${label} ${value} ${key}`.toLowerCase();
  return haystack.includes(input.toLowerCase());
};
</script>

<style scoped>
.column-type-input {
  width: 100%;
}
</style>