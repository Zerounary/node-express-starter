# 地址选择器 (LocatePicker) 使用说明

## 概述

LocatePicker 是一个基于 Ant Design Vue 的省市区三级联动选择组件，支持动态加载数据，提供了完整的前后端解决方案。

## 功能特性

- ✅ 支持省市区三级联动选择
- ✅ 支持选择层级配置（省/省市/省市区）
- ✅ 动态加载数据，提升性能
- ✅ 支持搜索功能
- ✅ 支持 v-model 双向绑定
- ✅ 完整的后端 API 支持
- ✅ 基于民政部最新行政区划数据

## 安装和配置

### 1. 数据库配置

首先运行数据库迁移脚本：

```sql
-- 执行 db/migrations/create-regions-table.sql
```

### 2. 后端配置

确保在路由中注册 RegionController：

```typescript
// 在你的路由配置文件中添加
import RegionController from '@/api/RegionController';
```

### 3. 前端配置

在你的 Vue 项目中导入组件：

```typescript
import LocatePicker from '#/adapter/component/LocatePicker.vue';
```

## 基础用法

### 三级联动（省市区）

```vue
<template>
  <LocatePicker
    v-model="selectedRegion"
    placeholder="请选择省市区"
    @change="handleChange"
  />
</template>

<script setup>
import { ref } from 'vue';

const selectedRegion = ref([]);

const handleChange = (value, selectedOptions) => {
  console.log('选中的值:', value);
  console.log('选中的选项:', selectedOptions);
};
</script>
```

### 只选择到市级

```vue
<template>
  <LocatePicker
    v-model="selectedCity"
    :level="2"
    placeholder="请选择省市"
  />
</template>
```

### 只选择省份

```vue
<template>
  <LocatePicker
    v-model="selectedProvince"
    :level="1"
    placeholder="请选择省份"
  />
</template>
```

## API 参考

### Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| modelValue | 选中的值 | `string[]` | `[]` |
| placeholder | 占位符文本 | `string` | `'请选择省市区'` |
| disabled | 是否禁用 | `boolean` | `false` |
| size | 尺寸大小 | `'large' \| 'middle' \| 'small'` | `'middle'` |
| allowClear | 是否允许清除 | `boolean` | `true` |
| showSearch | 是否显示搜索 | `boolean` | `true` |
| level | 选择层级 | `1 \| 2 \| 3` | `3` |

### Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| update:modelValue | 值变化时触发 | `(value: string[])` |
| change | 选择变化时触发 | `(value: string[], selectedOptions: RegionOption[])` |

### Methods

通过 ref 可以调用以下方法：

| 方法名 | 说明 | 参数 | 返回值 |
|--------|------|------|--------|
| getSelectedRegions | 获取选中的区域信息 | - | `Region[]` |
| getFullAddress | 获取完整地址字符串 | - | `string` |
| loadProvinces | 重新加载省份数据 | - | `Promise<void>` |

## 后端 API

### 获取省份列表

```
GET /api/regions/provinces
```

### 获取城市列表

```
GET /api/regions/cities/:provinceCode
```

### 获取区县列表

```
GET /api/regions/districts/:cityCode
```

### 获取完整区域树

```
GET /api/regions/tree
```

### 搜索区域

```
GET /api/regions/search?keyword=北京&level=1
```

### 批量导入数据

```
POST /api/regions/batch-import
```

请求体：
```json
{
  "regions": [
    {
      "code": "110000",
      "name": "北京市",
      "level": 1,
      "parentCode": null
    }
  ]
}
```

## 数据导入

### 使用预定义数据

运行导入脚本：

```bash
node scripts/import-regions.js
```

### 从民政部网站获取最新数据

修改 `scripts/import-regions.js` 中的注释代码，启用网站数据获取功能。

## 在表单中使用

```vue
<template>
  <a-form :model="formData" @finish="handleSubmit">
    <a-form-item
      label="收货地址"
      name="address"
      :rules="[{ required: true, message: '请选择收货地址' }]"
    >
      <LocatePicker
        v-model="formData.address"
        placeholder="请选择收货地址"
      />
    </a-form-item>
    
    <a-form-item>
      <a-button type="primary" html-type="submit">
        提交
      </a-button>
    </a-form-item>
  </a-form>
</template>

<script setup>
const formData = ref({
  address: []
});

const handleSubmit = (values) => {
  console.log('表单数据:', values);
};
</script>
```

## 样式自定义

组件支持通过 CSS 变量或类名进行样式自定义：

```css
.locate-picker :deep(.ant-cascader) {
  width: 100%;
  /* 其他自定义样式 */
}
```

## 注意事项

1. 确保后端已正确配置数据库表和 API 接口
2. 组件依赖 Ant Design Vue，请确保已正确安装
3. 数据加载是异步的，首次使用时会有网络请求
4. 建议在生产环境中缓存区域数据以提升性能

## 故障排除

### 数据加载失败

1. 检查后端 API 是否正常运行
2. 检查数据库中是否有区域数据
3. 检查网络请求是否被拦截

### 组件不显示

1. 确认已正确导入组件
2. 检查 Ant Design Vue 是否正确安装
3. 查看浏览器控制台是否有错误信息

## 更新日志

### v1.0.0
- 初始版本发布
- 支持省市区三级联动
- 提供完整的前后端解决方案