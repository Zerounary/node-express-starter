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
      :cancel-text="'关闭'"
      :confirm-loading="submitLoading"
      @ok="onConfirmImport"
      @cancel="onModalClose"
      @afterClose="onModalAfterClose"
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

      <div v-if="importResult" class="result-wrap">
        <h4>导入结果</h4>
        <div class="result-grid">
          <div class="result-card">
            <div class="result-title">类别</div>
            <div class="result-line success">
              成功：{{ importResult.categories.success.length }} / {{ importTotals.categories }}
            </div>
            <div class="result-line failed" v-if="importResult.categories.failed.length">
              失败：{{ importResult.categories.failed.length }}
            </div>
            <ul v-if="importResult.categories.failed.length" class="failed-list">
              <li v-for="(it, idx) in importResult.categories.failed" :key="'c-'+idx">
                {{ it.name }} - {{ it.reason }}
              </li>
            </ul>
          </div>

          <div class="result-card">
            <div class="result-title">表</div>
            <div class="result-line success">
              成功：{{ importResult.tables.success.length }} / {{ importTotals.tables }}
            </div>
            <div class="result-line failed" v-if="importResult.tables.failed.length">
              失败：{{ importResult.tables.failed.length }}
            </div>
            <ul v-if="importResult.tables.failed.length" class="failed-list">
              <li v-for="(it, idx) in importResult.tables.failed" :key="'t-'+idx">
                {{ it.name }} - {{ it.reason }}
              </li>
            </ul>
          </div>

          <div class="result-card">
            <div class="result-title">字段</div>
            <div class="result-line success">
              成功：{{ importResult.columns.success.length }} / {{ importTotals.columns }}
            </div>
            <div class="result-line failed" v-if="importResult.columns.failed.length">
              失败：{{ importResult.columns.failed.length }}
            </div>
            <ul v-if="importResult.columns.failed.length" class="failed-list">
              <li v-for="(it, idx) in importResult.columns.failed" :key="'col-'+idx">
                {{ it.tableName }}.{{ it.columnName }} - {{ it.reason }}
              </li>
            </ul>
          </div>

          <div class="result-card">
            <div class="result-title">动作</div>
            <div class="result-line success">
              成功：{{ importResult.actions.success.length }} / {{ importTotals.actions }}
            </div>
            <div class="result-line failed" v-if="importResult.actions.failed.length">
              失败：{{ importResult.actions.failed.length }}
            </div>
            <ul v-if="importResult.actions.failed.length" class="failed-list">
              <li v-for="(it, idx) in importResult.actions.failed" :key="'a-'+idx">
                {{ it.tableName }}.{{ it.actionName }} - {{ it.reason }}
              </li>
            </ul>
          </div>

          <div class="result-card">
            <div class="result-title">同步</div>
            <div class="result-line success">
              成功：{{ importResult.sync.success.length }} / {{ importTotals.sync }}
            </div>
            <div class="result-line failed" v-if="importResult.sync.failed.length">
              失败：{{ importResult.sync.failed.length }}
            </div>
            <ul v-if="importResult.sync.failed.length" class="failed-list">
              <li v-for="(it, idx) in importResult.sync.failed" :key="'s-'+idx">
                {{ it.name }} - {{ it.reason }}
              </li>
            </ul>
          </div>
        </div>
        <div class="tip">提示：导入完成后可检查失败原因，确认无误后手动关闭弹窗。</div>
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
const importResult = ref<any | null>(null);
const didRefresh = ref(false);

const importTotals = ref({
  categories: 0,
  tables: 0,
  columns: 0,
  actions: 0,
  sync: 0,
});

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
  importResult.value = null;
  importTotals.value = {
    categories: 0,
    tables: 0,
    columns: 0,
    actions: 0,
    sync: 0,
  };
  didRefresh.value = false;
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
  importResult.value = null;
  didRefresh.value = false;

  try {
    const text = await readFileAsText(file);
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空');
    }
    const res = await importSystemConfig(text);
    const result = res?.data ?? res ?? null;
    if (!result) {
      throw new Error('未获取到导入结果');
    }

    importResult.value = result;
    importTotals.value = {
      categories: (result.categories?.success?.length || 0) + (result.categories?.failed?.length || 0),
      tables: (result.tables?.success?.length || 0) + (result.tables?.failed?.length || 0),
      columns: (result.columns?.success?.length || 0) + (result.columns?.failed?.length || 0),
      actions: (result.actions?.success?.length || 0) + (result.actions?.failed?.length || 0),
      sync: (result.sync?.success?.length || 0) + (result.sync?.failed?.length || 0),
    };

    success.value = `已导入：${file.name}`;
    message.success('导入完成，请查看结果');
    // 不自动关闭弹窗
  } catch (err: any) {
    error.value = err?.message || '导入失败';
    message.error(error.value);
  } finally {
    submitLoading.value = false;
  }
}

function onModalClose() {
  // 关闭时刷新页面
  if (!didRefresh.value) {
    didRefresh.value = true;
    window.location.reload();
  }
}
function onModalAfterClose() {
  // 双保险：部分情况下只触发 afterClose
  if (!didRefresh.value) {
    didRefresh.value = true;
    window.location.reload();
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

.result-wrap {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 768px) {
  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.result-card {
  border: 1px solid #f5f5f5;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafafa;
}
.result-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.result-line {
  font-size: 13px;
  margin: 4px 0;
}
.result-line.success {
  color: #389e0d;
}
.result-line.failed {
  color: #cf1322;
}
.failed-list {
  margin: 6px 0 0 16px;
  padding: 0;
  list-style: disc;
  color: #cf1322;
  font-size: 12px;
}
.tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
</style>
