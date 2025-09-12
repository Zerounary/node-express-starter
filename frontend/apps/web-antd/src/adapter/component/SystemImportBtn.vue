<template>
  <div class="import-icon-btn">
    <a-tooltip placement="bottom" :title="'导入系统配置'">
      <a-button type="text" shape="circle" @click="openModal" :loading="submitLoading">
        <template #icon>
          <UploadOutlined />
        </template>
      </a-button>
    </a-tooltip>

    <a-modal
      v-model:open="modalOpen"
      title="导入系统配置"
      :mask-closable="false"
      :ok-text="'开始导入'"
      :cancel-text="'取消'"
      :confirm-loading="submitLoading"
      @ok="onConfirmImport"
    >
      <div
        class="drop-area"
        :class="{ 'is-dragover': isDragover }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="drop-inner">
          <p class="title">拖拽文件到此处</p>
          <p class="desc">或点击下方按钮选择文件</p>
          <a-button @click="onPickFile" :disabled="submitLoading">选择文件</a-button>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden-input"
            @change="onFileChange"
          />
          <p v-if="fileName" class="file-name">已选择：{{ fileName }}</p>
          <p v-if="error" class="error">{{ error }}</p>
          <p v-if="success" class="success">{{ success }}</p>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { importSystemConfig } from '#/api/system/table';

// 手动按需导入 Ant Design Vue 组件与图标
import { Button as AButton, Modal as AModal, Tooltip as ATooltip, message } from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';

// 局部注册（适用于 <script setup>）
const components = {
  'a-button': AButton,
  'a-modal': AModal,
  'a-tooltip': ATooltip,
  UploadOutlined,
};

const modalOpen = ref(false);
const isDragover = ref(false);
const submitLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const fileRef = ref<File | null>(null);
const fileName = ref('');
const error = ref('');
const success = ref('');

function openModal() {
  resetState();
  modalOpen.value = true;
}

function resetState() {
  isDragover.value = false;
  submitLoading.value = false;
  fileRef.value = null;
  fileName.value = '';
  error.value = '';
  success.value = '';
}

function onPickFile() {
  error.value = '';
  success.value = '';
  fileInput.value?.click();
}

function onDragOver() {
  isDragover.value = true;
}
function onDragLeave() {
  isDragover.value = false;
}
async function onDrop(e: DragEvent) {
  isDragover.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) {
    error.value = '未获取到文件';
    return;
  }
  setFile(files[0]);
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  setFile(input.files[0]);
  // 清空选中，确保可重复选择同一文件
  input.value = '';
}

function setFile(file: File) {
  error.value = '';
  success.value = '';
  fileRef.value = file || null;
  fileName.value = file?.name || '';
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file, 'utf-8');
  });
}

async function onConfirmImport() {
  if (!fileRef.value) {
    error.value = '请先选择文件';
    return;
  }
  await handleImport(fileRef.value);
}

async function handleImport(file: File) {
  if (submitLoading.value) return;
  submitLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    const text = await readFileAsText(file);
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空');
    }
    let result = await importSystemConfig(text);
    console.log('result', result)
    success.value = `已导入：${file.name}`;
    message.success('导入成功');
    modalOpen.value = false;
  } catch (err: any) {
    error.value = err?.message || '导入失败';
    message.error(error.value);
  } finally {
    submitLoading.value = false;
  }
}
</script>

<style scoped>
.import-icon-btn :deep(.ant-btn) {
  padding: 0;
}

.drop-area {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;
  background: #fafafa;
}
.drop-area.is-dragover {
  border-color: #1677ff;
  background: #f0f7ff;
}
.drop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.hidden-input {
  display: none;
}
.title {
  font-weight: 600;
}
.desc {
  color: #666;
  font-size: 12px;
}
.file-name {
  color: #1677ff;
  font-size: 12px;
}
.error {
  color: #cf1322;
  font-size: 12px;
}
.success {
  color: #389e0d;
  font-size: 12px;
}
</style>
