<template>
  <div class="locate-picker">
    <cascader
      v-model:value="selectedValues"
      :options="options"
      :placeholder="placeholder"
      :loading="loading"
      :disabled="disabled"
      :size="size"
      :allow-clear="allowClear"
      :show-search="showSearch"
      :load-data="loadData"
      :field-names="fieldNames"
      change-on-select
      @change="handleChange"
      @search="handleSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, withDefaults, defineProps, defineEmits, defineExpose } from 'vue';
import {Cascader, message } from 'ant-design-vue';
import { regionApi, type Region } from '#/api/system/region';

interface RegionOption {
  value: string;
  label: string;
  level: number;
  isLeaf?: boolean;
  loading?: boolean;
  children?: RegionOption[];
}

interface Props {
  modelValue?: string[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'large' | 'middle' | 'small';
  allowClear?: boolean;
  showSearch?: boolean;
  level?: 1 | 2 | 3; // 选择层级：1-省，2-市，3-区县
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择省市区',
  disabled: false,
  size: 'middle',
  allowClear: true,
  showSearch: true,
  level: 3,
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'change': [value: string[], selectedOptions: RegionOption[]];
}>();

const loading = ref(false);
const options = ref<RegionOption[]>([]);
const selectedValues = ref<string[]>([]);
const isInitializing = ref(false);

const fieldNames = {
  label: 'label',
  value: 'value',
  children: 'children',
};

// 加载省份数据
const loadProvinces = async () => {
  try {
    loading.value = true;
    const response = await regionApi.getProvinces();

    options.value = response.map((province: any) => ({
      value: province.code,
      label: province.name,
      level: province.level,
      isLeaf: props.level === 1,
      children: props.level > 1 ? [] : undefined,
    }));
  } catch (error) {
    console.error('Load provinces error:', error);
    message.error('加载省份数据失败');
  } finally {
    loading.value = false;
  }
};

// 根据初始值加载对应的数据层级
const loadInitialData = async (initialValues: string[]) => {
  if (!initialValues || initialValues.length === 0) return;

  try {
    loading.value = true;

    // 确保省份数据已加载
    if (options.value.length === 0) {
      await loadProvinces();
    }

    // 如果有城市代码，加载城市数据
    if (initialValues.length >= 2 && props.level >= 2) {
      const provinceCode = initialValues[0];
      const provinceOption = options.value.find(opt => opt.value === provinceCode);

      if (provinceOption && (!provinceOption.children || provinceOption.children.length === 0)) {
        try {
          const cities = await regionApi.getCities(provinceCode);
          provinceOption.children = cities.map((city: any) => ({
            value: city.code,
            label: city.name,
            level: city.level,
            isLeaf: props.level === 2,
            children: props.level > 2 ? [] : undefined,
          }));
        } catch (error) {
          console.error(`Load cities for province ${provinceCode} error:`, error);
        }
      }
    }

    // 如果有区县代码，加载区县数据
    if (initialValues.length >= 3 && props.level >= 3) {
      const provinceCode = initialValues[0];
      const cityCode = initialValues[1];
      const provinceOption = options.value.find(opt => opt.value === provinceCode);

      if (provinceOption && provinceOption.children) {
        const cityOption = provinceOption.children.find(opt => opt.value === cityCode);

        if (cityOption && (!cityOption.children || cityOption.children.length === 0)) {
          try {
            const districts = await regionApi.getDistricts(cityCode);
            cityOption.children = districts.map((district: any) => ({
              value: district.code,
              label: district.name,
              level: district.level,
              isLeaf: true,
            }));
          } catch (error) {
            console.error(`Load districts for city ${cityCode} error:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Load initial data error:', error);
    message.error('加载初始数据失败');
  } finally {
    loading.value = false;
  }
};

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue && newValue.length > 0) {
      if (!isInitializing.value) {
        await loadInitialData(newValue);
      }
      selectedValues.value = newValue;
      // 如果不是初始化阶段且有初始值，需要加载对应的数据层级
    } else {
      selectedValues.value = [];
    }
  },
  { immediate: true }
);


// 动态加载数据
const loadData = async (selectedOptions: RegionOption[]) => {
  const targetOption = selectedOptions[selectedOptions.length - 1];

  if (!targetOption?.value) {
    return;
  }

  // 如果已经有子数据，不重复加载
  if (targetOption.children && targetOption.children.length > 0) {
    return;
  }

  targetOption.loading = true;

  try {
    let response: Region[] = [];

    if (targetOption.level === 1 && props.level >= 2) {
      // 加载城市数据
      response = await regionApi.getCities(targetOption.value);
    } else if (targetOption.level === 2 && props.level >= 3) {
      // 加载区县数据
      response = await regionApi.getDistricts(targetOption.value);
    }

    if (response.length > 0) {
      targetOption.children = response.map((item: any) => ({
        value: item.code,
        label: item.name,
        level: item.level,
        isLeaf: item.level >= props.level,
        children: item.level < props.level ? [] : undefined,
      }));
    } else {
      // 如果没有子数据，标记为叶子节点
      targetOption.isLeaf = true;
      targetOption.children = undefined;
    }
  } catch (error) {
    console.error('Load data error:', error);
    message.error('加载数据失败');
  } finally {
    targetOption.loading = false;
  }
};

// 处理选择变化
const handleChange = (value: string[], selectedOptions: RegionOption[]) => {
  selectedValues.value = value;
  emit('update:modelValue', value);
  emit('change', value, selectedOptions);
};

// 处理搜索
const handleSearch = (value: string) => {
  // 可以实现搜索功能
  console.log('Search:', value);
};

// 获取选中的区域信息
const getSelectedRegions = computed(() => {
  if (!selectedValues.value.length) return [];

  const result: any[] = [];
  let currentOptions = options.value;

  for (let i = 0; i < selectedValues.value.length; i++) {
    const code = selectedValues.value[i];
    const option = currentOptions.find(opt => opt.value === code);

    if (option) {
      result.push({
        code: option.value,
        name: option.label,
        level: option.level,
      });
      currentOptions = option.children || [];
    }
  }

  return result;
});

// 获取完整地址字符串
const getFullAddress = computed(() => {
  return getSelectedRegions.value.map(region => region.name).join('');
});

// 暴露方法给父组件
defineExpose({
  getSelectedRegions,
  getFullAddress,
  loadProvinces,
});

onMounted(async () => {
  isInitializing.value = true;

  try {
    await loadProvinces();
    // 如果有初始值，加载对应的数据
    if (props.modelValue && props.modelValue.length > 0) {
      await loadInitialData(props.modelValue);
    }
  } finally {
    isInitializing.value = false;
  }
});
</script>

<style scoped>
.locate-picker {
  width: 100%;
}

.locate-picker :deep(.ant-cascader) {
  width: 100%;
}
</style>
