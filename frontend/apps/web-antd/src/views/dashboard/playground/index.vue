<template>
  <PageContainer>
    <div class="playground-grid">
      <ACard title="MediaPicker Playground">
        <AForm :model="formState" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <AFormItem label="Single Image (Object)">
            <MediaPicker v-model="formState.cover" />
          </AFormItem>

          <AFormItem label="Multiple Images (URL)">
            <MediaPicker
              v-model="formState.gallery"
              multiple
              :max="9"
              value-key="url"
            />
          </AFormItem>

          <AFormItem label="Single Video (ID)">
            <MediaPicker
              v-model="formState.video"
              value-key="id"
              :types="['video']"
            />
          </AFormItem>

          <AFormItem label="Disabled Picker">
            <MediaPicker v-model="formState.disabledAsset" disabled />
          </AFormItem>

          <AFormItem label="Custom Trigger">
            <MediaPicker v-model="formState.customTriggerAsset">
              <template #trigger="{ open }">
                <AButton type="dashed" @click="open">
                  <template #icon><UploadOutlined /></template>
                  Click to open library
                </AButton>
              </template>
            </MediaPicker>
          </AFormItem>
        </AForm>
      </ACard>

      <div class="right-column">
        <ACard title="QRCode Playground" class="component-card">
          <AFormItem label="QR Code Content">
            <AInput v-model:value="formState.qrCodeValue" placeholder="Enter text for QR code" />
          </AFormItem>
          <QRCode :model-value="formState.qrCodeValue" :size="150" />
        </ACard>

        <ACard title="RichText Playground" class="component-card">
          <RichText v-model="formState.richTextContent" />
        </ACard>
      </div>
    </div>

    <ACard title="Dependencies Playground" :style="{ marginTop: '24px' }">
      <DependencyForm />
    </ACard>

    <ACard title="Items Playground" :style="{ marginTop: '24px' }">
      <Items :tabs="itemsTabs" :query-extra="{ tableId: 1 }" />
    </ACard>

    <ACard title="Form State" :style="{ marginTop: '24px' }">
      <pre>{{ JSON.stringify(formState, null, 2) }}</pre>
    </ACard>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import { Card as ACard, Form as AForm, FormItem as AFormItem, Button as AButton, Input as AInput } from 'ant-design-vue';
import MediaPicker, { type MediaItem, type FetchParams } from '#/adapter/component/MediaPicker.vue';
import QRCode from '#/adapter/component/QRCode.vue';
import RichText from '#/adapter/component/RichText.vue';
import { useVbenForm } from '#/adapter/form';
import { applyDependencies } from '#/utils';
import Items from '#/adapter/component/Items.vue';


const itemsTabs = [
  { key: 'column', table: 'column', title: 'Column' },
  { key: 'roles', table: 'roles', title: 'Roles' },
];

const formState = reactive({
  cover: null,
  gallery: [],
  video: null,
  disabledAsset: {
    "id": 18,
    "tenantId": 1,
    "type": "image",
    "url": "https://jhtcdn-1252100135.cos.ap-chengdu.myqcloud.com/uploads/t_1/u_1/1756364691881-454053845.png",
    "thumbUrl": null,
    "name": "ç½åçè.png",
    "size": 89705,
    "width": null,
    "height": null,
    "duration": null,
    "tags": null,
    "meta": null,
    "categoryId": 1,
    "linkedEntityName": null,
    "linkedEntityUrl": null,
    "createdAt": "2025-08-28T07:04:52.000Z",
    "updatedAt": "2025-08-28T07:04:52.000Z",
    "createdBy": null,
    "updatedBy": null,
    "isActive": true
  },
  customTriggerAsset: null,
  qrCodeValue: 'https://www.tencent.com',
  richTextContent: '<h1>Hello, Rich Text!</h1><p>This is a basic example of the RichText component.</p>',
});


const rawDependencySchemas = [
  {
    fieldName: 'name',
    label: 'Name',
    component: 'Input',
    required: true,
  },
  {
    fieldName: 'description',
    label: 'Description',
    component: 'Input',
    dependencies: {
      triggerFields: ['name'],
      show: 'values.name && values.name.length > 0',
      disabled: 'values.name !== "enable"',
    },
  },
].map(col => (applyDependencies(col)));

console.log('rawDependencySchemas:', rawDependencySchemas)

const [DependencyForm, formApi] = useVbenForm({ 
  schema: [
    ...rawDependencySchemas
  ],
});

</script>

<style scoped>
.playground-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.component-card {
  flex: 1;
}

pre {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>