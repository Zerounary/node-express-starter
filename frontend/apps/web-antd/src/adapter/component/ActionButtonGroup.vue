<template>
  <space>
    <Button
      type="primary"
      v-for="btn of actionsFiltered.slice(0, MAX_BUTTONS)"
      :key="btn.resource"
      @click="executeAction(btn)"
      >{{ btn.name }}</Button
    >
    <Dropdown v-if="actionsFiltered.length > MAX_BUTTONS">
      <template #overlay>
        <space direction="vertical">
          <Button
            v-for="btn of actionsFiltered.slice(MAX_BUTTONS)"
            :key="btn.resource"
            class="w-full text-left"
            @click="executeAction(btn)"
          >
            {{ btn.name }}
          </Button>
        </space>
      </template>
      <Button>更多操作</Button>
    </Dropdown>
  </space>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue';
import { Space, Button, message, Dropdown } from 'ant-design-vue';
import { execute } from '#/api/system/crud';

const MAX_BUTTONS = 3;

interface TableActionItem {
  id: number;
  type: string;
  name: string;
  resource: string;
  orderno: number;
}

const props = defineProps<{
  table: string;
  type: 'table' | 'form' | 'row' | 'custom';
  params: object;
  actions: TableActionItem[];
}>();

const actionsFiltered = computed(() => {
  return props.actions.filter(e => e.type === props.type);
});

const executeAction = async (action: TableActionItem) => {
  try {
    const res = await execute(props.table, action.resource, props.params);
    if(res?.msg || res?.message) {
      message.success(res?.msg || res?.message || res?.error);
    }
    console.log('Action executed:', res);
  } catch (error) {
    console.error('Error executing action:', error);
  }
};
</script>

<style scoped></style>
