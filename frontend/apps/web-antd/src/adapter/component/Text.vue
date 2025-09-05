<template>
  <div class="text-sm">
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import { ColumnDataTypes } from '#/utils';
import dayjs from 'dayjs';
import { computed, defineModel, defineProps } from 'vue';

const modelValue = defineModel<any>({ default: '' });
const props = defineProps({
  row: {
    type: Object,
    default: () => ({}),
  },
  schema: {
    type: Object,
  },
});

const Textof = (val, dataType) => {
  switch (dataType) {
    case ColumnDataTypes.ID:
      const fieldName = props.schema?.fieldName;
      return props.row[`${fieldName}Name`]?.name;
    case ColumnDataTypes.DATENUMBER:
      return dayjs(val).format('YYYY-MM-DD');
    case ColumnDataTypes.DATE:
      return dayjs(val).format('YYYY-MM-DD HH:mm:ss');
    case ColumnDataTypes.BOOLEAN:
      return val ? '是' : '否';
    default:
      return val;
  }
};

const text = computed(() => {
  const dataType = props.schema?.dataType;
  return Textof(modelValue.value, dataType);
});
</script>

<style scoped></style>
