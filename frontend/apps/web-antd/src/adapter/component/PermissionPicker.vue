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
  <!-- TODO 渲染权限矩阵，每一行是tables，每一列是perms 交叉位置是权限，用Checkbox勾选。勾选后添加或删除到modelValue中 -->
   {{ tables }}
  </Modal>
</template>

<script setup lang="ts">
import { getList } from '#/api/system/crud';
import { Select, Modal, Table, Button, Input } from 'ant-design-vue';
import { ref, type Ref } from 'vue'

const isModalVisible = ref(false);
const tables: Ref<any[]> = ref([]);
const perms = ref([
  'list', 'page', 'read', 'create', 'update', 'delete', 'export', 'import'
])
const modelValue = ref([]);

const handleOk = () => {
  isModalVisible.value = false;
};

const handleCancel = () => {
  isModalVisible.value = false;
};

const openModal = () => {
  getList('table').then(res => {
    console.log("🚀 ~ openModal ~ res:", res)
    tables.value = res
  })
  isModalVisible.value = true;
};

</script>

<style scoped>

</style>
