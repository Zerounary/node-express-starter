<template>
  <space>
    <Button
      v-for="(btn, idx) of actionsFiltered.slice(0, MAX_BUTTONS)"
      :key="btn.resource"
      :loading="isLoading[btn?.resource]"
      @click="executeAction(btn)"
      >{{ btn.name }}</Button
    >
    <Dropdown v-if="actionsFiltered.length > MAX_BUTTONS">
      <template #overlay>
        <space direction="vertical">
          <Button
            v-for="btn of actionsFiltered.slice(MAX_BUTTONS)"
            :key="btn.resource"
            :loading="isLoading[btn?.resource]"
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
import { defineProps, computed, ref, defineEmits } from 'vue';
import { Space, Button, message, Dropdown } from 'ant-design-vue';
import { execute } from '#/api/system/crud';
import { downloadJson } from '#/utils';

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
  gridApi: any;
}>();

const isLoading = ref({})
const emit = defineEmits(['onFinish'])

const actionsFiltered = computed(() => {
  return props.actions.filter(e => e.type === props.type);
});

const executeAction = async (action: TableActionItem) => {
  if (isLoading.value[action.resource]) {
    return;
  }
  try {
    isLoading.value[action.resource] = true;
    const res = await execute(props.table, action.resource, props.params);
    if(res.action) {
      switch(res.action) {
        case 'download':
        let data = res.data;
        downloadJson(data)
        break;
        case 'refresh':
          props.gridApi?.query();
        break;
      }
    }

    if (res?.msg || res?.message) {
      message.success(res?.msg || res?.message || res?.error);
    }

    console.log('Action executed:', res);
    emit('onFinish', 'success')
  } catch (error) {
    console.error('Error executing action:', error);
    emit('onFinish', 'error')
  } finally {
    isLoading.value[action.resource] = false;
  }
};
</script>

<style scoped></style>
