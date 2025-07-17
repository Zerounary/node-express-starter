<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { SystemTableApi } from '#/api/system/table';

import { computed, defineProps, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { create, update } from '#/api/system/crud';
import { $t } from '#/locales';

import { useFormCreateSchema, useFormUpdateSchema } from '../data';

const props = defineProps<{
  table: Object;
}>();
const tableName = computed(() => props.table.table);
const emits = defineEmits(['success']);
const formData = ref<SystemTableApi.SystemTable>();

const [Form, formApi] = useVbenForm({
  schema: useFormCreateSchema(props.table),
  showDefaultActions: false,
});

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    drawerApi.lock();
    (id.value ? update(tableName.value, id.value, values) : create(tableName.value, values))
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SystemTableApi.SystemTable>();
      formApi.resetForm();
      if (data) {
        formData.value = data;
        id.value = data.id;
        formApi.updateSchema(useFormUpdateSchema(props.table))
        formApi.setValues(data);
      } else {
        id.value = undefined;
        formApi.updateSchema(useFormCreateSchema(props.table))
      }
    }
  },
});

const getDrawerTitle = computed(() => {
  return formData.value?.id
    ? $t('common.edit', $t('system.role.name'))
    : $t('common.create', $t('system.role.name'));
});

function getNodeClass(node: Recordable<any>) {
  const classes: string[] = [];
  if (node.value?.type === 'button') {
    classes.push('inline-flex');
    if (node.index % 3 >= 1) {
      classes.push('!pl-0');
    }
  }

  return classes.join(' ');
}
</script>
<template>
  <Drawer :title="getDrawerTitle">
    <Form />
  </Drawer>
</template>
<style lang="css" scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
