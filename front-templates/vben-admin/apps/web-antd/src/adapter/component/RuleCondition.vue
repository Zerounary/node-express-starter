<template>
  <div class="rule-condition">
    <Select
      v-model:value="condition.field"
      @change="onFieldChange"
      style="width: 150px"
      placeholder="选择字段"
    >
      <SelectOption v-for="col in tableConfig.columns" :key="col.fieldName" :value="col.fieldName">
        {{ col.label }}
      </SelectOption>
    </Select>
    <Select v-model:value="condition.operator" @change="onOperatorChange" style="width: 120px">
      <SelectOption v-for="op in operators" :key="op.value" :value="op.value">
        {{ op.label }}
      </SelectOption>
    </Select>
    <div v-if="condition.operator === 'exists'">
      <RuleGroup
        v-if="relatedTableConfig"
        :group="condition.value"
        :table-config="relatedTableConfig"
        :is-root="false"
      />
      <div v-else>加载关联表配置中...</div>
    </div>
    <Input v-else v-model:value="condition.value" style="width: 200px" placeholder="输入值" />
    <Button @click="remove" type="danger" size="small">移除</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue';
import { Button, Select, SelectOption, Input } from 'ant-design-vue';
import RuleGroup from './RuleGroup.vue';
import { getPageConfig } from '#/api';

const props = defineProps<{
  condition: any;
  tableConfig: any;
}>();

const emit = defineEmits(['remove']);

const operators = ref([
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '包含', value: 'in' },
  { label: '不包含', value: 'notIn' },
  { label: '模糊匹配', value: 'contains' },
  { label: '开头是', value: 'startsWith' },
  { label: '结尾是', value: 'endsWith' },
  { label: '存在', value: 'exists' },
]);

const relatedTableConfig = ref<any>(null);

const defaultExistsCondition = () => ({
 logic: 'AND',
 conditions: []
})

const onFieldChange = () => {
  if (props.condition.operator === 'exists') {
    props.condition.value = defaultExistsCondition();
  } else {
    props.condition.value = '';
  }
};

const onOperatorChange = (op) => {
  if (op === 'exists') {
    props.condition.value = defaultExistsCondition();
  } else {
    props.condition.value = '';
  }
};

const getFieldRelatedTable = (field: string) => {
  const column = props.tableConfig.columns.find((c) => c.fieldName === field);
  return column?.relatedToTableName
}

watch(
  () => [props.condition.field, props.condition.operator],
  async ([field, operator]) => {
    if (operator === 'exists' && field) {
      const relatedTableName = getFieldRelatedTable(field)
      if (relatedTableName) {
        try {
          relatedTableConfig.value = await getPageConfig(relatedTableName);
          props.condition.value = {
            ...props.condition.value,
            table: relatedTableName
          }
        } catch (error) {
          console.error('Failed to fetch related table config:', error);
          relatedTableConfig.value = null;
        }
      } else {
        relatedTableConfig.value = null;
      }
    } else {
      relatedTableConfig.value = null;
    }
  },
  { immediate: true },
);

const remove = () => {
  emit('remove');
};
</script>

<style scoped>
.rule-condition {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
