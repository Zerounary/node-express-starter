<template>
  <div class="ui-input">
    <a-collapse>
      <!-- General Settings -->
      <a-collapse-panel key="general" header="通用设置">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <a-form-item class="md:col-span-1" label="UI组件">
            <a-select v-model:value="model.component" style="width: 100%">
              <a-select-option
                v-for="comp in componentTypes"
                :key="comp.value"
                :value="comp.value"
              >
                {{ comp.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item class="md:col-span-2" label="组件属性 (JSON)">
            <a-textarea
              v-model:value="componentPropsString"
              :rows="5"
              @blur="handlePropsChange"
            />
            <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
          </a-form-item>
          <a-form-item
            label="可见性掩码"
            :rules="[
              {
                pattern: /^[01]{10}$/,
                message: '请输入10位由0或1组成的字符串',
              },
            ]"
          >
            <a-input
              v-model:value="model.mask"
              maxlength="10"
              placeholder="10位0或1的组合"
            />
          </a-form-item>
          <a-form-item label="宽度">
            <a-input-number
              v-model:value="model.width"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="过滤操作">
            <a-select
              v-model:value="model.filterOp"
              style="width: 100%"
              allow-clear
            >
              <a-select-option
                v-for="op in filterOps"
                :key="op.value"
                :value="op.value"
              >
                {{ op.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item class="md:col-span-2" label="禁用">
            <a-switch v-model:checked="model.disabled" />
          </a-form-item>
        </div>
      </a-collapse-panel>

      <!-- Dependencies Settings -->
      <a-collapse-panel key="dependencies" header="联动设置">
        <div class="grid grid-cols-1 gap-4">
          <a-form-item label="触发字段">
            <a-select
              v-model:value="triggerFields"
              mode="tags"
              style="width: 100%"
              :token-separators="[' ', ',', '，', ';', '；']"
              allow-clear
              placeholder="输入字段名后按回车或用逗号分隔"
            />
            <div class="mt-1 text-xs text-gray-500">
              支持 tags 多选，自动去重、去空格
            </div>
          </a-form-item>
          <a-form-item label="销毁">
            <a-textarea
              :value="ensureDeps().if"
              @update:value="(val) => (ensureDeps().if = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="隐藏">
            <a-textarea
              :value="ensureDeps().show"
              @update:value="(val) => (ensureDeps().show = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="禁用">
            <a-textarea
              :value="ensureDeps().disabled"
              @update:value="(val) => (ensureDeps().disabled = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="触发">
            <a-textarea
              :value="ensureDeps().trigger"
              @update:value="(val) => (ensureDeps().trigger = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="规则">
            <a-textarea
              :value="ensureDeps().rules"
              @update:value="(val) => (ensureDeps().rules = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="必填">
            <a-textarea
              :value="ensureDeps().required"
              @update:value="(val) => (ensureDeps().required = val)"
              :rows="2"
            />
          </a-form-item>
          <a-form-item label="组件Props">
            <a-textarea
              :value="ensureDeps().componentProps"
              @update:value="(val) => (ensureDeps().componentProps = val)"
              :rows="2"
            />
          </a-form-item>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, defineModel, onMounted } from 'vue';
import {
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  Textarea as ATextarea,
} from 'ant-design-vue';

// Define the interface based on the provided structure
interface ColumnUI {
  mask?: string;
  width?: number;
  component:
    | 'Input'
    | 'InputNumber'
    | 'InputPassword'
    | 'DatePicker'
    | 'FkPicker'
    | 'RadioGroup'
    | 'UIInput'
    | 'ColumnTypeInput'
    | 'PermissionPicker'
    | 'IconPicker'
    | 'MediaPicker'
    | 'MetaInput'
    | 'Items';
  disabled?: boolean;
  filterOp?: 'like' | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  componentProps?: {
    table?: string;
    buttonStyle?: 'outline' | 'solid';
    options?: { label: string; value: any }[];
    optionType?: 'default' | 'button';
    [key: string]: any;
  };
  dependencies?: {
    triggerFields?: string[];
    if?: string;
    show?: string;
    disabled?: string;
    trigger?: string;
    rules?: string;
    required?: string;
    componentProps?: string;
  };
}

// Use defineModel to create a two-way binding
const model = defineModel<ColumnUI>({
  default: () => ({ component: 'Input', dependencies: {} }),
});
// 确保渲染前存在 dependencies，兼容历史数据（可能缺少该字段）
if (!model.value.dependencies || typeof model.value.dependencies !== 'object') {
  model.value.dependencies = {};
}

const componentTypes = [
  { value: 'Input', label: '输入框' },
  { value: 'InputNumber', label: '数字输入框' },
  { value: 'InputPassword', label: '密码框' },
  { value: 'DatePicker', label: '日期选择器' },
  { value: 'FkPicker', label: '外键选择器' },
  { value: 'RadioGroup', label: '单选按钮组' },
  { value: 'UIInput', label: 'UI配置输入' },
  { value: 'MediaPicker', label: '媒体选择器' },
  { value: 'IconPicker', label: '图标选择器' },
  { value: 'ColumnTypeInput', label: '字段类型选择器' },
  { value: 'PermissionPicker', label: '权限选择器' },
  { value: 'MetaInput', label: '元数据输入' },
  { value: 'Items', label: '子项列表' },
];

const filterOps = [
  { value: 'like', label: '包含' },
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
  { value: 'in', label: '在...中' },
];

// 归一化依赖配置（兼容字符串/逗号分隔/JSON字符串）
function ensureDependencies() {
  const dep: any = model.value.dependencies ?? {};
  const tf = dep.triggerFields;
  if (typeof tf === 'string') {
    let parsed: any = tf;
    try {
      if (tf.trim().startsWith('[')) {
        parsed = JSON.parse(tf);
      } else {
        parsed = tf.split(/[,，;；\s]+/);
      }
    } catch {
      parsed = tf.split(/[,，;；\s]+/);
    }
    dep.triggerFields = Array.from(
      new Set(
        (Array.isArray(parsed) ? parsed : [parsed])
          .map((s) => (s ?? '').toString().trim())
          .filter((s) => s.length > 0),
      ),
    );
  } else if (Array.isArray(tf)) {
    dep.triggerFields = Array.from(
      new Set(
        tf.map((s) => (s ?? '').toString().trim()).filter((s) => s.length > 0),
      ),
    );
  }
  // 若没有 triggerFields，保持不创建该字段；仅确保 dependencies 为对象
  model.value.dependencies = dep || {};
}

function ensureDeps() {
  if (
    !model.value.dependencies ||
    typeof model.value.dependencies !== 'object'
  ) {
    model.value.dependencies = {};
  }
  return model.value.dependencies as NonNullable<ColumnUI['dependencies']>;
}

onMounted(() => {
  ensureDependencies();
});

// 触发字段的响应式访问器：保证为 string[]，并在设置时清洗/去重
const triggerFields = computed<string[]>({
  get() {
    const arr = model.value.dependencies?.triggerFields ?? [];
    return Array.isArray(arr) ? arr : [];
  },
  set(val: string[]) {
    if (!model.value.dependencies) model.value.dependencies = {};
    const normalized = Array.from(
      new Set(
        (val || [])
          .map((s) => (s ?? '').toString().trim())
          .filter((s) => s.length > 0),
      ),
    );
    model.value.dependencies.triggerFields = normalized;
  },
});

// Computed property to handle JSON conversion for componentProps
const componentPropsString = computed({
  get() {
    try {
      return model.value.componentProps
        ? JSON.stringify(model.value.componentProps, null, 2)
        : '';
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
  },
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
