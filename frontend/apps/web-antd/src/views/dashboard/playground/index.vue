<template>
  <PageContainer>
    <div class="playground-grid">
      <ACard title="MediaPicker Playground">
        <AForm :model="formState" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <AFormItem label="Single Image (Object)">
            <MediaPicker v-model="formState.cover" :fetcher="fetchMedia" :uploader="uploadMedia" allow-upload />
          </AFormItem>

          <AFormItem label="Multiple Images (URL)">
            <MediaPicker
              v-model="formState.gallery"
              multiple
              :max="9"
              value-key="url"
              :fetcher="fetchMedia"
              :uploader="uploadMedia"
              allow-upload
            />
          </AFormItem>

          <AFormItem label="Single Video (ID)">
            <MediaPicker
              v-model="formState.video"
              value-key="id"
              :types="['video']"
              :fetcher="fetchMedia"
              :uploader="uploadMedia"
              allow-upload
            />
          </AFormItem>

          <AFormItem label="Disabled Picker">
            <MediaPicker v-model="formState.disabledAsset" :fetcher="fetchMedia" disabled />
          </AFormItem>

          <AFormItem label="Custom Trigger">
            <MediaPicker v-model="formState.customTriggerAsset" :fetcher="fetchMedia">
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

    <ACard title="Form State" :style="{ marginTop: '24px' }">
      <pre>{{ JSON.stringify(formState, null, 2) }}</pre>
    </ACard>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import { Card as ACard, Form as AForm, FormItem as AFormItem, Button as AButton, Input as AInput } from 'ant-design-vue';
import MediaPicker, { type MediaItem, type FetchParams } from '#/adapter/component/MediaPicker.vue';
import QRCode from '#/adapter/component/QRCode.vue';
import RichText from '#/adapter/component/RichText.vue';
import { fetchMedia, uploadMedia } from '#/api/system/media'


const formState = reactive({
  cover: null,
  gallery: [],
  video: null,
  disabledAsset: null,
  customTriggerAsset: null,
  qrCodeValue: 'https://www.tencent.com',
  richTextContent: '<h1>Hello, Rich Text!</h1><p>This is a basic example of the RichText component.</p>',
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