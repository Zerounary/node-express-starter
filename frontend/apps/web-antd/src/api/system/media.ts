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

async function fetchCategories() {
  try {
    const data = await requestClient.get('/media/categories');
    return data;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

async function createCategory(params: { name: string, parentId?: string | number }) {
  try {
    const data = await requestClient.post('/media/categories', params);
    return data;
  } catch (error) {
    console.error('Failed to create category:', error);
    throw error;
  }
}

async function updateCategory(id: string | number, params: { name?: string, parentId?: string | number }) {
  try {
    const data = await requestClient.put(`/media/categories/${id}`, params);
    return data;
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error;
  }
}

async function deleteCategory(id: string | number) {
  try {
    const data = await requestClient.delete(`/media/categories/${id}`);
    return data;
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
}

async function updateMedia(id: string | number, params: { name?: string, tags?: string[], categoryId?: string | number }) {
  try {
    const data = await requestClient.put(`/media/${id}`, params);
    return data;
  } catch (error) {
    console.error('Failed to update media:', error);
    throw error;
  }
}

async function deleteMedia(id: string | number) {
  try {
    const data = await requestClient.delete(`/media/${id}`);
    return data;
  } catch (error) {
    console.error('Failed to delete media:', error);
    throw error;
  }
}

async function batchDeleteMedia(ids: (string | number)[]) {
  try {
    const data = await requestClient.post('/media/batch-delete', { ids });
    return data;
  } catch (error) {
    console.error('Failed to batch delete media:', error);
    throw error;
  }
}

export {
  fetchMedia,
  uploadMedia,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateMedia,
  deleteMedia,
  batchDeleteMedia,
};
