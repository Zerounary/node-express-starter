<template>
  <div class="ui-input">
    <a-collapse>
      <!-- General Settings -->
      <a-collapse-panel key="general" header="通用设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="UI组件">
            <a-select v-model:value="model.component" style="width: 100%">
              <a-select-option v-for="comp in componentTypes" :key="comp.value" :value="comp.value">
                {{ comp.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="宽度">
            <a-input-number v-model:value="model.width" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="禁用">
            <a-switch v-model:checked="model.disabled" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Data Settings -->
      <a-collapse-panel key="data" header="数据设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item label="过滤操作">
            <a-select v-model:value="model.filterOp" style="width: 100%" allow-clear>
              <a-select-option v-for="op in filterOps" :key="op.value" :value="op.value">
                {{ op.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Layout Settings -->
      <a-collapse-panel key="layout" header="布局设置">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a-form-item
            label="可见性掩码"
            class="md:col-span-2"
            :rules="[{ pattern: /^[01]{10}$/, message: '请输入10位由0或1组成的字符串' }]"
          >
            <a-input v-model:value="model.mask" maxlength="10" placeholder="10位0或1的组合" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Advanced Settings -->
      <a-collapse-panel key="advanced" header="高级设置">
        <div class="grid grid-cols-1">
          <a-form-item label="组件属性 (JSON)">
            <a-textarea v-model:value="componentPropsString" :rows="5" @blur="handlePropsChange" />
            <div class="text-xs text-gray-500 mt-1">请输入合法的JSON格式</div>
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

// Define the interface based on the provided structure
interface ColumnUI {
  mask?: string;
  width?: number;
  component:
    | 'Input'
    | 'InputPassword'
    | 'DatePicker'
    | 'FkPicker'
    | 'RadioGroup'
    | 'UIInput'
    | 'PermissionPicker'
    | 'MetaInput';
  disabled?: boolean;
  filterOp?: 'like' | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  componentProps?: {
    table?: string;
    buttonStyle?: 'outline' | 'solid';
    options?: { label: string; value: any }[];
    optionType?: 'default' | 'button';
    [key: string]: any;
  };
}

// Use defineModel to create a two-way binding
const model = defineModel<ColumnUI>({
  default: () => ({ component: 'Input' })
});

const componentTypes = [
  { value: 'Input', label: '输入框' },
  { value: 'InputPassword', label: '密码框' },
  { value: 'DatePicker', label: '日期选择器' },
  { value: 'FkPicker', label: '外键选择器' },
  { value: 'RadioGroup', label: '单选按钮组' },
  { value: 'UIInput', label: 'UI配置输入' },
  { value: 'PermissionPicker', label: '权限选择器' },
  { value: 'MetaInput', label: '元数据输入' }
];

const filterOps = [
  { value: 'like', label: '包含' },
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
  { value: 'in', label: '在...中' }
];

// Computed property to handle JSON conversion for componentProps
const componentPropsString = computed({
  get() {
    try {
      return model.value.componentProps ? JSON.stringify(model.value.componentProps, null, 2) : '';
    } catch (e) {
      return '';
    }
  },
  set(val: string) {
    try {
      if (val.trim()) {
        model.value.componentProps = JSON.parse(val);
      } else {
        model.value.componentProps = {};
      }
    } catch (e) {
      console.error('Invalid JSON format for componentProps', e);
      // Optionally, handle the error in the UI
    }
  }
});

// Update the model on blur event from the textarea
const handlePropsChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  componentPropsString.value = target.value;
};
</script>

<style scoped>
.ui-input {
  width: 100%;
}
</style>