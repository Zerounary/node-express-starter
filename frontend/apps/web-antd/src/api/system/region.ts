import { requestClient } from '#/api/request';

export interface Region {
  id: number;
  code: string;
  name: string;
  level: number;
  parentCode?: string;
  parentId?: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  children?: Region[];
}

export interface RegionTreeNode extends Region {
  children: RegionTreeNode[];
}

export const regionApi = {
  // 获取省份列表
  getProvinces(): Promise<ApiResponse<Region[]>> {
    return requestClient.get('/api/regions/provinces');
  },

  // 获取城市列表
  getCities(provinceCode: string): Promise<ApiResponse<Region[]>> {
    return requestClient.get(`/api/regions/cities/${provinceCode}`);
  },

  // 获取区县列表
  getDistricts(cityCode: string): Promise<ApiResponse<Region[]>> {
    return requestClient.get(`/api/regions/districts/${cityCode}`);
  },

  // 获取完整的区域树
  getRegionTree(): Promise<ApiResponse<RegionTreeNode[]>> {
    return requestClient.get('/api/regions/tree');
  },

  // 搜索区域
  searchRegions(params: {
    keyword?: string;
    level?: number;
  }): Promise<ApiResponse<Region[]>> {
    return requestClient.get('/api/regions/search', { params });
  },

  // 创建区域
  createRegion(data: {
    code: string;
    name: string;
    level: number;
    parentCode?: string;
  }): Promise<ApiResponse<Region>> {
    return requestClient.post('/api/regions', data);
  },

  // 更新区域
  updateRegion(id: number, data: {
    name?: string;
    parentCode?: string;
  }): Promise<ApiResponse<Region>> {
    return requestClient.put(`/api/regions/${id}`, data);
  },

  // 删除区域
  deleteRegion(id: number): Promise<ApiResponse<{ message: string }>> {
    return requestClient.delete(`/api/regions/${id}`);
  },

  // 批量导入区域数据
  batchImportRegions(regions: Array<{
    code: string;
    name: string;
    level: number;
    parentCode?: string;
  }>): Promise<ApiResponse<{ message: string; count: number }>> {
    return requestClient.post('/api/regions/batch-import', { regions });
  },
};

// 全局类型定义
declare global {
  interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    code?: number;
  }
}