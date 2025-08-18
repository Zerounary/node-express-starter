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
          {{ record.name }}
        </template>
        <template v-else>
          <Checkbox
            :checked="isPermissionSelected(record.table, column.key as string)"
            @update:checked="(checked) => handleCheckboxChange(record.table, column.key as string, checked)"
          />
        </template>
      </template>
    </Table>
  </Modal>
</template>

<script setup lang="ts">
import { execute, getList } from '#/api/system/crud';
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
  { key: 'view', name: '查看' },
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

const setPermission = (name: string, perm: string, checked: boolean, permissionsSet: Set<string>) => {
  const allPermsForTable = perms.value.map((p) => p.key);
  const wildcard = `data:${name}:*`;
  const specific = `data:${name}:${perm}`;

  if (checked) {
    if (permissionsSet.has(wildcard)) {
      return; // Already has wildcard, no change needed
    }
    permissionsSet.add(specific);
    const allSelected = allPermsForTable.every((p) =>
      permissionsSet.has(`data:${name}:${p}`),
    );

    if (allSelected) {
      allPermsForTable.forEach((p) => permissionsSet.delete(`data:${name}:${p}`));
      permissionsSet.add(wildcard);
    }
  } else { // unchecking
    if (permissionsSet.has(wildcard)) {
      permissionsSet.delete(wildcard);
      allPermsForTable.forEach((p) => {
        if (p !== perm) {
          permissionsSet.add(`data:${name}:${p}`);
        }
      });
    } else {
      permissionsSet.delete(specific);
    }
  }
};

const handleCheckboxChange = (tableName: string, perm: string, checked: boolean) => {
  const currentPermissions = new Set(modelValue.value);

  // Apply to the clicked record itself
  setPermission(tableName, perm, checked, currentPermissions);

  // Recursive function to find a record in the tree
  const findRecord = (records: any[], name: string): any | null => {
    for (const record of records) {
      if (record.table === name) return record;
      if (record.children) {
        const found = findRecord(record.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  // Recursive function to apply permission change to children
  const applyToChildren = (children: any[]) => {
    if (!children) return;
    children.forEach(child => {
      setPermission(child.table, perm, checked, currentPermissions);
      applyToChildren(child.children);
    });
  };

  const clickedRecord = findRecord(tables.value, tableName);
  if (clickedRecord) {
    applyToChildren(clickedRecord.children);
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
  execute("tableCategories", "getMenus").then((res) => {
    tables.value = res;
  });
  isModalVisible.value = true;
};
</script>

<style scoped>

</style>
