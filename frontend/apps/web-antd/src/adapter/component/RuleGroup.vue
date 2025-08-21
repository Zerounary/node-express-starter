<template>
  <div class="rule-group">
    <div class="group-header">
      <Select v-model:value="group.logic" style="width: 80px">
        <SelectOption value="AND">AND</SelectOption>
        <SelectOption value="OR">OR</SelectOption>
      </Select>
      <Button @click="addCondition" size="small">添加条件</Button>
      <Button @click="addGroup" size="small">添加分组</Button>
      <Button @click="remove" type="danger" size="small" v-if="!isRoot">移除分组</Button>
    </div>
    <div class="group-body">
      <div v-for="(item, index) in group.conditions" :key="index" class="group-item">
        <RuleGroup
          v-if="item.logic"
          :group="item"
          :table-config="tableConfig"
          :is-root="false"
          @remove="removeCondition(index)"
        />
        <RuleCondition
          v-else
          :condition="item"
          :table-config="tableConfig"
          @remove="removeCondition(index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { Button, Select, SelectOption } from 'ant-design-vue';
import RuleCondition from './RuleCondition.vue';

const props = defineProps<{
  group: any;
  tableConfig: any;
  isRoot?: boolean;
}>();

const emit = defineEmits(['remove']);

const addCondition = () => {
  props.group.conditions.push({
    field: null,
    operator: 'equals',
    value: '',
  });
};

const addGroup = () => {
  props.group.conditions.push({
    logic: 'AND',
    conditions: [],
  });
};

const removeCondition = (index: number) => {
  props.group.conditions.splice(index, 1);
};

const remove = () => {
  emit('remove');
};
</script>

<style scoped>
.rule-group {
  border: 1px solid #d9d9d9;
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
}
.group-header {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.group-body {
  padding-left: 20px;
}
.group-item {
  margin-bottom: 10px;
}
</style>