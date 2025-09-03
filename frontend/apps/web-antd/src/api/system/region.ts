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
  getProvinces(): Promise<Region[]> {
    return requestClient.get('/regions/provinces');
  },

  // 获取城市列表
  getCities(provinceCode: string): Promise<Region[]> {
    return requestClient.get(`/regions/cities/${provinceCode}`);
  },

  // 获取区县列表
  getDistricts(cityCode: string): Promise<Region[]> {
    return requestClient.get(`/regions/districts/${cityCode}`);
  },

  // 获取完整的区域树
  getRegionTree(): Promise<RegionTreeNode[]> {
    return requestClient.get('/regions/tree');
  },

  // 搜索区域
  searchRegions(params: {
    keyword?: string;
    level?: number;
  }): Promise<Region[]> {
    return requestClient.get('/regions/search', { params });
  },

  // 创建区域
  createRegion(data: {
    code: string;
    name: string;
    level: number;
    parentCode?: string;
  }): Promise<Region> {
    return requestClient.post('/regions', data);
  },

  // 更新区域
  updateRegion(id: number, data: {
    name?: string;
    parentCode?: string;
  }): Promise<Region> {
    return requestClient.put(`/regions/${id}`, data);
  },

  // 删除区域
  deleteRegion(id: number): Promise<{ message: string }> {
    return requestClient.delete(`/regions/${id}`);
  },

  // 批量导入区域数据
  batchImportRegions(regions: Array<{
    code: string;
    name: string;
    level: number;
    parentCode?: string;
  }>): Promise<{ message: string; count: number }> {
    return requestClient.post('/regions/batch-import', { regions });
  },
};
