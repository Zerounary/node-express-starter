<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { SystemTableApi } from '#/api/system/table';

import { computed, defineProps, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { create, update } from '#/api/system/crud';
import { $t } from '#/locales';

import { isCreateEditable, isUpdateEditable, useFormCreateSchema, useFormUpdateSchema } from '../data';

const props = defineProps<{
  table: Object;
}>();
const tableName = computed(() => props.table.table);
const emits = defineEmits(['success']);
const formData = ref<SystemTableApi.SystemTable>();

const [Form, formApi] = useVbenForm({
  schema: [],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
});

const id = ref();
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    let data = { ...values };
    // 移除表单中不可以编辑的字段
    props.table.columns.forEach(col => {
      if (!((id.value ? isUpdateEditable : isCreateEditable)(col))) {
        delete data[col.fieldName];
      }
    })
    drawerApi.lock();
    (id.value ? update(tableName.value, id.value, data) : create(tableName.value, data))
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
      console.log('🚀 ~ onOpenChange ~ data:', data)
      formApi.resetForm();
      if(data._parentKey) {
        formApi.setFieldValue(data._parentKey, data._parentId);
      }
      if (data?.id) {
        formData.value = data;
        id.value = data.id;
        formApi.setState({
          schema: useFormUpdateSchema(props.table, {formApi, data}),
        })
        formApi.setValues(data);
      } else {
        id.value = undefined;
        formApi.setState({
          schema: useFormCreateSchema(props.table, {formApi, data}),
        })
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
