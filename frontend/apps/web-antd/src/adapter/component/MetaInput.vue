<template>
  <div class="meta-input">
    <a-collapse accordion>
      <!-- Basic Settings -->
      <a-collapse-panel key="basic" header="基本设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.title')" class="md:col-span-2">
            <a-input v-model:value="meta.title" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.order')">
            <a-input-number v-model:value="meta.order" :min="0" style="width: 100%" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Icon Settings -->
      <a-collapse-panel key="icon" header="图标设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.icon')">
            <IconPicker v-model="meta.icon" prefix="fluent" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.activeIcon')">
            <IconPicker v-model="meta.activeIcon" prefix="fluent" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Visibility Settings -->
      <a-collapse-panel key="visibility" header="可见性设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.hideInMenu')" class="flex items-center">
            <a-switch v-model:checked="meta.hideInMenu" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.hideChildrenInMenu')" class="flex items-center">
            <a-switch v-model:checked="meta.hideChildrenInMenu" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.hideInBreadcrumb')" class="flex items-center">
            <a-switch v-model:checked="meta.hideInBreadcrumb" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.hideInTab')" class="flex items-center">
            <a-switch v-model:checked="meta.hideInTab" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Tab Settings -->
      <a-collapse-panel key="tab" header="标签页设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.keepAlive')" class="flex items-center">
            <a-switch v-model:checked="meta.keepAlive" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.affixTab')">
            <a-switch v-model:checked="meta.affixTab" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.affixTabOrder')">
            <a-input-number v-model:value="meta.affixTabOrder" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.maxNumOfOpenTab')">
            <a-input-number v-model:value="meta.maxNumOfOpenTab" :min="1" style="width: 100%" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Navigation Settings -->
      <a-collapse-panel key="navigation" header="导航设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.activePath')">
            <a-input v-model:value="meta.activePath" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.link')">
            <a-input v-model:value="meta.link" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.openInNewWindow')" class="flex items-center">
            <a-switch v-model:checked="meta.openInNewWindow" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.iframeSrc')">
            <a-input v-model:value="meta.iframeSrc" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Badge Settings -->
      <a-collapse-panel key="badge" header="徽标设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.badgeType.title')">
            <a-select v-model:value="meta.badgeType" style="width: 100%" allow-clear>
              <a-select-option v-for="type in badgeTypes" :key="type" :value="type">
                {{ $t(`system.menu.badgeType.${type}`) }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="$t('system.menu.badge')" v-if="meta.badgeType === 'normal'">
            <a-input v-model:value="meta.badge" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.badgeVariants')">
            <a-select v-model:value="meta.badgeVariants" style="width: 100%" allow-clear>
              <a-select-option v-for="variant in badgeVariants" :key="variant" :value="variant">
                {{ variant }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Advanced Settings -->
      <a-collapse-panel key="advanced" header="高级设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item :label="$t('system.menu.noBasicLayout')" class="flex items-center">
            <a-switch v-model:checked="meta.noBasicLayout" />
          </a-form-item>
          <a-form-item :label="$t('system.menu.query')" class="md:col-span-2">
            <a-textarea v-model:value="queryString" :rows="4" @blur="handleQueryChange" />
            <div class="text-xs text-gray-500 mt-1">{{ $t('system.menu.queryHelp') }}</div>
          </a-form-item>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  Textarea as ATextarea
} from 'ant-design-vue';
import { IconPicker } from '@vben/common-ui';
import { $t } from '#/locales';

// 使用 defineModel 直接操作 meta 值
const meta = defineModel<Record<string, any>>({
  default: () => ({})
});

const badgeTypes = ['dot', 'normal'];
const badgeVariants = ['primary', 'success', 'warning', 'error', 'info'];

// 将query对象转换为字符串显示
const queryString = computed({
  get() {
    try {
      return meta.value.query ? JSON.stringify(meta.value.query, null, 2) : '';
    } catch (e) {
      return '';
    }
  },
  set(val: string) {
    try {
      if (val.trim()) {
        meta.value.query = JSON.parse(val);
      } else {
        meta.value.query = {};
      }
    } catch (e) {
      console.error('Invalid JSON format for query', e);
    }
  }
});

// 处理query字符串变更
const handleQueryChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  queryString.value = target.value;
};
</script>

<style scoped>
.meta-input {
  width: 100%;
}
</style>
