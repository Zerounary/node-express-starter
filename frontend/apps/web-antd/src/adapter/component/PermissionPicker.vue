<template>
  <div>
    <Button @click="openModal">授权</Button>
    <Modal
      title="设置权限"
      v-model:open="isModalVisible"
      @ok="handleOk"
      @cancel="handleCancel"
      width="80%"
    >
      <Tabs>
        <TabPane key="1" tab="数据权限">
          <Table
            rowKey="id"
            :data-source="tables"
            :columns="columns"
            :pagination="false"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                {{ record.name }}
              </template>
              <template v-else>
                <Checkbox
                  :checked="
                    isPermissionSelected(record.table, column.key as string)
                  "
                  @update:checked="
                    (checked) =>
                      handleCheckboxChange(
                        record.table,
                        column.key as string,
                        checked,
                      )
                  "
                />
                <DataScopePicker
                  v-if="
                    !record.children &&
                    column.key == 'view' &&
                    record.type == 'menu'
                  "
                  :table="record"
                  :role="row"
                />
              </template>
            </template>
          </Table>
        </TabPane>
        <TabPane key="2" tab="操作权限">
          <Table
            rowKey="key"
            :data-source="actions"
            :columns="opColumns"
            :pagination="false"
            bordered
            size="small"
          >
            <template #headerCell="{ column }">
                {{ column.title }}
            </template>

            <template #bodyCell="{ column, record }">
              <template v-if="column.key == 'category'">
              {{ record.table?.category?.name }}
              </template>
              <template v-if="column.key == 'table'">
              {{ record.table?.description }}
              </template>
              <template v-if="column.key == 'type'">
              {{ actionTypeMap[record.type] }}
              </template>
              <template v-if="column.key == 'action'">
              {{ record.name }}
              </template>
              <template v-if="column.key == 'description'">
              {{ record.description }}
              </template>
              <template v-if="column.key == 'status'">
                <Checkbox
                  :checked="isActionPermissionChecked(record)"
                  @update:checked="(checked) => handleActionCheckboxChange(record, checked)"
                />
              </template>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { execute, getList } from '#/api/system/crud';
import { assignPermission, getRolePerms } from '#/api/system/role';
import {
  Modal,
  Table,
  Button,
  Checkbox,
  message,
  Tabs,
  TabPane,
} from 'ant-design-vue';
import { ref, defineProps, defineModel, type Ref, computed } from 'vue';
import DataScopePicker from './DataScopePicker.vue';

const props = defineProps<{
  row: any;
  formApi: any;
}>();

const actionTypeMap = {
  'form': '表单按钮',
  'list': '列表按钮',
  'item': '子表按钮',
}

const modelValue = defineModel<string[]>({ default: () => [] });
const actions = ref([])
const permKeys = computed(() => perms.value.map(p => p.key));
/**
 * 将动作记录映射为权限字符串，例如：
 * action:table:getPageConfig
 * 其中 table = record.table.alias_name（若无则回退 record.table）
 * resource = record.resource
 */
const buildActionPermission = (record: any) => {
  const tableAlias = record?.table?.alias_name || record?.table;
  const resource = record?.resource || record?.action || record?.name;
  return `action:${tableAlias}:${resource}`;
};

/**
 * 初始化/渲染时判断是否已授权该 action
 */
const isActionPermissionChecked = (record: any) => {
  const perm = buildActionPermission(record);
  return modelValue.value.includes(perm);
};

/**
 * 勾选单个 action
 * - 若勾选：加入对应的 action:table:resource
 * - 若取消：移除对应的 action:table:resource
 * 注意：动作权限与数据权限（data:...）分组不同，这里直接操作 modelValue 集合
 */
const handleActionCheckboxChange = (record: any, checked: boolean) => {
  const perm = buildActionPermission(record);
  const set = new Set(modelValue.value);
  if (checked) {
    set.add(perm);
  } else {
    set.delete(perm);
  }
  modelValue.value = Array.from(set);
};

/**
 * 操作权限 Tab 的列定义
 */
const opColumns = computed(() => {
  return [
    { title: '表类别', key: 'category', width: 180 },
    { title: '表', key: 'table', width: 220 },
    { title: '类型', key: 'type', width: 220 },
    { title: '操作名称', key: 'action', width: 220 },
    { title: '说明', key: 'description', width: 220 },
    { title: '授权状态', key: 'status', width: 220 },
  ];
});

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
  return (
    modelValue.value.includes(wildcard) || modelValue.value.includes(specific)
  );
};

const setPermission = (
  name: string,
  perm: string,
  checked: boolean,
  permissionsSet: Set<string>,
) => {
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
      allPermsForTable.forEach((p) =>
        permissionsSet.delete(`data:${name}:${p}`),
      );
      permissionsSet.add(wildcard);
    }
  } else {
    // unchecking
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

const handleCheckboxChange = (
  tableName: string,
  perm: string,
  checked: boolean,
) => {
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
    children.forEach((child) => {
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
      permissions: ['action:table:getPageConfig', ...modelValue.value],
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
  Promise.all([
    getRolePerms({
      roleId: props.row.id,
    }),
    execute('table_categories', 'getMenus'),
    execute('table_actions', 'getAllTableActions'),
  ]).then(([currentValue, res, tableActions]) => {
    modelValue.value = currentValue || [];
    tables.value = res;
    actions.value = tableActions
  });
  isModalVisible.value = true;
};
</script>

<style scoped></style>
