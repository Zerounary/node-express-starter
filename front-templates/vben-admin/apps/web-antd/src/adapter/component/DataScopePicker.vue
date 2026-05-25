<template>
  <div>
    <Tooltip :title="description">
      <a @click="openModal">{{ truncatedDescription }}</a>
    </Tooltip>
    <Modal
      title="设置数据权限"
      v-model:open="isModalVisible"
      @ok="handleOk"
      @cancel="handleCancel"
      width="60%"
    >
      <div v-if="tableConfig">
        <RuleGroup :group="ruleBuilder" :table-config="tableConfig" :is-root="true" />
        <Form layout="vertical" style="margin-top: 20px">
          <FormItem label="权限描述">
            <Input.TextArea :value="ruleDescription" :rows="4" read-only />
          </FormItem>
        </Form>
      </div>
      <div v-else>
        加载中...
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, watch } from 'vue';
import { Modal, Form, FormItem, Input, message, Tooltip } from 'ant-design-vue';
import { execute, post, put } from '#/api/system/crud';
import RuleGroup from './RuleGroup.vue';
import { generateRuleDescription, convertToSequelize } from './rule-builder-utils';
import { getPageConfig } from '#/api';

const props = defineProps<{
  table: any; // The table definition
  role: any; // The role being edited
}>();

const isModalVisible = ref(false);
const tableConfig = ref<any>(null);
const ruleBuilder = ref<any>({ logic: 'AND', conditions: [] });
let dataScopeId: number | null = null;
const description = ref('加载中...');

const truncatedDescription = computed(() => {
  const maxLength = 20;
  if (description.value && description.value.length > maxLength) {
    return `${description.value.substring(0, maxLength)}...`;
  }
  return description.value;
});

const ruleDescription = computed(() => {
  if (!tableConfig.value) return '';
  return generateRuleDescription(ruleBuilder.value, tableConfig.value);
});

const fetchData = async () => {
  if (!props.role?.id || !props.table?.table) {
    description.value = '未配置';
    return;
  }
  description.value = '加载中...';
  try {
    // Fetch table config first
    const config = await getPageConfig(props.table.table);
    tableConfig.value = config;

    // Then fetch existing data scope
    const data = await post('data_scopes/findOne', {
      where: {
        roleId: props.role.id,
        resource: props.table.table,
      },
    });

    if (data && data.ruleBuilder && data.ruleBuilder.conditions.length > 0) {
      ruleBuilder.value = data.ruleBuilder;
      dataScopeId = data.id;
      description.value =
        generateRuleDescription(ruleBuilder.value, tableConfig.value) || '自定义数据权限';
    } else {
      ruleBuilder.value = { logic: 'AND', conditions: [] };
      dataScopeId = data ? data.id : null;
      description.value = '所有数据权限';
    }
  } catch (error) {
    description.value = '加载失败';
    console.error(error);
    message.error('加载数据权限失败');
  }
};

watch(
  () => [props.role, props.table],
  () => {
    fetchData();
  },
  { immediate: true, deep: true },
);

const openModal = async () => {
  if (!tableConfig.value) {
    await fetchData(); // try to fetch data again if it failed initially
  }
  if (tableConfig.value) {
    isModalVisible.value = true;
  } else {
    message.error('无法加载表配置，请稍后重试');
  }
};

const handleOk = async () => {
  try {
    const sequelizeRule = convertToSequelize(ruleBuilder.value);
    const currentDescription = ruleDescription.value;
    const payload = {
      roleId: props.role.id,
      resource: props.table.table,
      rule: sequelizeRule,
      ruleBuilder: ruleBuilder.value,
      description: currentDescription,
    };

    if (dataScopeId) {
      await put(`/data_scopes/${dataScopeId}`, payload);
    } else {
      const result = await post(`/data_scopes/create`, payload);
      dataScopeId = result.id;
    }
    message.success('数据权限更新成功');
    isModalVisible.value = false;

    if (currentDescription) {
      description.value = currentDescription;
    } else {
      description.value = '所有数据权限';
    }
  } catch (error) {
    message.error(`更新失败: ${error.message}`);
  }
};

const handleCancel = () => {
  isModalVisible.value = false;
};
</script>

<style scoped>

</style>
