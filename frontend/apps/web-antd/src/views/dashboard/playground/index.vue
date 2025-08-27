<template>
  <PageContainer>
    <a-card title="MediaPicker Playground">
      <a-form :model="formState" :label-col="{ span: 4 }" :wrapper-col="{ span: 14 }">
        <a-form-item label="Single Image (Object)">
          <MediaPicker v-model="formState.cover" :fetcher="fetchMedia" :uploader="uploadMedia" allow-upload />
        </a-form-item>

        <a-form-item label="Multiple Images (URL)">
          <MediaPicker
            v-model="formState.gallery"
            multiple
            :max="9"
            value-key="url"
            :fetcher="fetchMedia"
            :uploader="uploadMedia"
            allow-upload
          />
        </a-form-item>

        <a-form-item label="Single Video (ID)">
          <MediaPicker
            v-model="formState.video"
            value-key="id"
            :types="['video']"
            :fetcher="fetchMedia"
            :uploader="uploadMedia"
            allow-upload
          />
        </a-form-item>

        <a-form-item label="Disabled Picker">
          <MediaPicker v-model="formState.disabledAsset" :fetcher="fetchMedia" disabled />
        </a-form-item>

        <a-form-item label="Custom Trigger">
          <MediaPicker v-model="formState.customTriggerAsset" :fetcher="fetchMedia">
            <template #trigger="{ open }">
              <a-button type="dashed" @click="open">
                <template #icon><UploadOutlined /></template>
                Click to open library
              </a-button>
            </template>
          </MediaPicker>
        </a-form-item>
      </a-form>

      <a-divider>Form State</a-divider>
      <pre>{{ JSON.stringify(formState, null, 2) }}</pre>
    </a-card>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import MediaPicker, { type MediaItem } from '#/adapter/component/MediaPicker.vue';

const formState = reactive({
  cover: null,
  gallery: [
    'https://images.unsplash.com/photo-1713168311015-4344a45a1348?q=80&w=2940&auto=format&fit=crop',
  ],
  video: 2,
  disabledAsset: null,
  customTriggerAsset: null,
});

// Mock data
const mockImages: MediaItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `img_${i + 1}`,
  type: 'image',
  url: `https://images.unsplash.com/photo-1712423273218-235d37f6484c?q=80&w=600&h=600&fit=crop&ixid=abc${i}`,
  thumbUrl: `https://images.unsplash.com/photo-1712423273218-235d37f6484c?q=80&w=200&h=200&fit=crop&ixid=abc${i}`,
  name: `Nature Image ${i + 1}.jpg`,
  size: 1024 * 1024 * (i * 0.2 + 1),
  width: 1920,
  height: 1080,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

const mockVideos: MediaItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `vid_${i + 1}`,
  type: 'video',
  url: `http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4`,
  thumbUrl: `https://images.unsplash.com/photo-1516222338279-27c03e25b4a0?w=200&h=200&fit=crop`,
  name: `Sample Video ${i + 1}.mp4`,
  size: 1024 * 1024 * (i * 5 + 10),
  width: 1280,
  height: 720,
  duration: 634,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

const allMockMedia = [...mockImages, ...mockVideos].sort(
  (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
);

// Mock fetcher function
const fetchMedia = async (params) => {
  console.log('Fetching with params:', params);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  let data = [...allMockMedia];

  // Filter by type
  if (params.types && params.types.length > 0) {
    data = data.filter(item => params.types.includes(item.type));
  }

  // Filter by query
  if (params.query) {
    data = data.filter(item => item.name?.toLowerCase().includes(params.query.toLowerCase()));
  }

  // Sort
  if (params.sort) {
    data.sort((a, b) => {
      switch (params.sort) {
        case 'createdAtAsc':
          return new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime();
        case 'createdAtDesc':
          return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
        case 'nameAsc':
          return (a.name || '').localeCompare(b.name || '');
        case 'nameDesc':
          return (b.name || '').localeCompare(a.name || '');
        // Add other sort cases if needed
      }
      return 0;
    });
  }

  const total = data.length;
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const items = data.slice(start, end);

  return { items, total };
};

// Mock uploader function
const uploadMedia = async (file: File): Promise<MediaItem> => {
  console.log('Uploading file:', file.name);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay

  // In a real app, you would upload the file and get back the URL and other details
  const isVideo = file.type.startsWith('video/');
  const newItem: MediaItem = {
    id: `upload_${Date.now()}`,
    type: isVideo ? 'video' : 'image',
    url: URL.createObjectURL(file), // Use local blob URL for preview
    thumbUrl: isVideo ? `https://images.unsplash.com/photo-1516222338279-27c03e25b4a0?w=200&h=200&fit=crop` : URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  allMockMedia.unshift(newItem); // Add to our mock DB
  return newItem;
};
</script>

<style scoped>
pre {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
}
</style>
