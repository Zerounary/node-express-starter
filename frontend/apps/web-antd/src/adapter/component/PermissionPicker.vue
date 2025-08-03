<template>
  <div>
    <Button @click="openModal">授权</Button>
  </div>
  <Modal
      title="设置权限"
      v-model:open="isModalVisible"
      @ok="handleOk"
      @cancel="handleCancel"
      width="80%"
  >
    <Table :data-source="tables" :columns="columns" :pagination="false" bordered>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          {{ record.description }} ({{ record.name }})
        </template>
        <template v-else>
          <Checkbox
            :checked="isPermissionSelected(record.name, column.key as string)"
            @update:checked="(checked) => handleCheckboxChange(record.name, column.key as string, checked)"
          />
        </template>
      </template>
    </Table>
  </Modal>
</template>

<script setup lang="ts">
import { getList } from '#/api/system/crud';
import { assignPermission } from '#/api/system/role';
import { Modal, Table, Button, Checkbox, message } from 'ant-design-vue';
import { ref, type Ref, computed } from 'vue';

const props = defineProps<{
  row: any;
  formApi: any;
}>();


const modelValue = defineModel<string[]>({ default: () => [] });

const isModalVisible = ref(false);
const tables: Ref<any[]> = ref([]);
const perms = ref([
  { key: 'list', name: '列表' },
  { key: 'page', name: '分页' },
  { key: 'read', name: '读取' },
  { key: 'create', name: '创建' },
  { key: 'update', name: '更新' },
  { key: 'delete', name: '删除' },
  { key: 'export', name: '导出' },
  { key: 'import', name: '导入' },
]);

const columns = computed(() => {
  const permColumns = perms.value.map((perm) => ({
    title: perm.name,
    key: perm.key,
    align: 'center',
  }));
  return [
    {
      title: '模块',
      key: 'name',
      align: 'center',
      width: 180,
    },
    ...permColumns,
  ];
});

const isPermissionSelected = (tableName: string, perm: string) => {
  const wildcard = `data:${tableName}:*`;
  const specific = `data:${tableName}:${perm}`;
  return modelValue.value.includes(wildcard) || modelValue.value.includes(specific);
};

const handleCheckboxChange = (tableName: string, perm: string, checked: boolean) => {
  const currentPermissions = new Set(modelValue.value);
  const allPermsForTable = perms.value.map((p) => p.key);
  const wildcard = `data:${tableName}:*`;
  const specific = `data:${tableName}:${perm}`;

  if (checked) {
    currentPermissions.add(specific);
    const allSelected = allPermsForTable.every((p) =>
      currentPermissions.has(`data:${tableName}:${p}`),
    );

    if (allSelected) {
      allPermsForTable.forEach((p) => currentPermissions.delete(`data:${tableName}:${p}`));
      currentPermissions.add(wildcard);
    }
  } else {
    if (currentPermissions.has(wildcard)) {
      currentPermissions.delete(wildcard);
      allPermsForTable.forEach((p) => {
        if (p !== perm) {
          currentPermissions.add(`data:${tableName}:${p}`);
        }
      });
    } else {
      currentPermissions.delete(specific);
    }
  }

  modelValue.value = Array.from(currentPermissions);
};

const handleOk = async () => {
  const roleId = props.row.id;
  if (!roleId) {
    message.error('未提供角色ID');
    return;
  }
  try {
    await assignPermission({
      roleId,
      permissions: modelValue.value,
    });
    message.success('权限更新成功');
    isModalVisible.value = false;
  } catch (error) {
    message.error('权限更新失败');
    console.error('Assign permission error:', error);
  }
};

const handleCancel = () => {
  isModalVisible.value = false;
};

const openModal = () => {
  getList('table').then((res) => {
    tables.value = res;
  });
  isModalVisible.value = true;
};
</script>

<style scoped>

</style>
