import { requestClient } from '#/api/request';
import { type FetchParams } from '#/adapter/component/MediaPicker.vue'

async function fetchMedia(params: FetchParams) {
      console.log('Fetching with params:', params);
  try {
    // The backend already returns data in the format { items, total }
    const data = await requestClient.get('/media/page', { params });
    return data;
  } catch (error) {
    console.error('Failed to fetch media:', error);
    return { items: [], total: 0 };
  }
}

async function uploadMedia(file: File, options?: { categoryId?: string | number }) {
    console.log('Uploading file:', file.name, 'with options:', options);
    const formData = new FormData();
    formData.append('file', file);
    if (options?.categoryId) {
        formData.append('categoryId', String(options.categoryId));
    }

    try {
        // The backend should return the newly created media item
        const data = await requestClient.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    } catch (error) {
        console.error('Failed to upload media:', error);
        throw error; // Re-throw to let the component handle the UI state
    }
}
export { fetchMedia, uploadMedia };
