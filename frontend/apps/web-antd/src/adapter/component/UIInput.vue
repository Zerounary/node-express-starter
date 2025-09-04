<template>
  <div class="ui-input bg-white dark:bg-gray-800 border rounded-md p-4">
    <a-tabs default-active-key="general">
      <!-- General Settings -->
      <a-tab-pane key="general" tab="通用设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2  lg:grid-cols-3">
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
            <a-form-item label="表单项样式">
              <a-input
                v-model:value="model.wrapperClass"
                placeholder="wrapperClass样式"
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
            <a-form-item label="UI组件">
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

            <!-- Generic componentProps for other components -->
            <a-form-item
              v-if="model.component !== 'Items'"
              label="组件属性 (JSON)"
            >
              <a-textarea
                v-model:value="componentPropsString"
                :rows="5"
                @blur="handlePropsChange"
              />
              <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
            </a-form-item>
            <!-- Specific UI for 'Items' component tabs -->
            <div v-if="model.component === 'Items'" class="md:col-span-2 lg:col-span-3">
              <h3 class="mb-2 font-semibold text-gray-800">子项列表配置</h3>
              <div
                v-for="(tab, index) in tabs"
                :key="index"
                class="mb-3 rounded-md border bg-gray-50 p-3"
              >
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-medium">Tab {{ index + 1 }}</h4>
                  <a-button type="link" danger @click="removeTab(index)"
                    >移除</a-button
                  >
                </div>
                <div class="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                  <a-form-item label="Key" required>
                    <a-input v-model:value="tab.key" />
                  </a-form-item>
                  <a-form-item label="表" required>
                    <FkPicker table="table" value-key="alias_name" v-model="tab.table" />
                  </a-form-item>
                  <a-form-item label="父表字段名" required>
                    <FkPicker table="column" value-key="name" :query-extra="{

                    }" v-model="tab.parentKey" />
                  </a-form-item>
                  <a-form-item label="标题">
                    <a-input v-model:value="tab.title" />
                  </a-form-item>
                  <a-form-item class="" label="过滤条件 (JSON)">
                    <a-textarea
                      :value="getQueryExtraString(tab)"
                      @blur="updateQueryExtra($event, index)"
                      :rows="3"
                      placeholder='{ "field": "value" }'
                    />
                  </a-form-item>
                </div>
              </div>
              <a-button type="dashed" class="w-full" @click="addTab">
                <PlusOutlined /> 添加 子表
              </a-button>
            </div>

            <a-form-item label="隐藏Label">
              <a-switch v-model:checked="model.hideLabel" />
            </a-form-item>
            <a-form-item label="禁用">
              <a-switch v-model:checked="model.disabled" />
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>

      <!-- Dependencies Settings -->
      <a-tab-pane key="dependencies" tab="联动设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                :rows="2"
                @update:value="(val) => (ensureDeps().if = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="显示">
              <a-textarea
                :value="ensureDeps().show"
                :rows="2"
                @update:value="(val) => (ensureDeps().show = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="禁用">
              <a-textarea
                :value="ensureDeps().disabled"
                :rows="2"
                @update:value="(val) => (ensureDeps().disabled = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="触发">
              <a-textarea
                :value="ensureDeps().trigger"
                :rows="2"
                @update:value="(val) => (ensureDeps().trigger = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="规则">
              <a-textarea
                :value="ensureDeps().rules"
                :rows="2"
                @update:value="(val) => (ensureDeps().rules = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="必填">
              <a-textarea
                :value="ensureDeps().required"
                :rows="2"
                @update:value="(val) => (ensureDeps().required = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
            <a-form-item label="组件Props">
              <a-textarea
                :value="ensureDeps().componentProps"
                :rows="2"
                @update:value="(val) => (ensureDeps().componentProps = val)"
                placeholder="js表达式, values是表单值对象"
              />
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, defineModel, onMounted } from 'vue';
import {
  Button as AButton,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  TabPane as ATabPane,
  Tabs as ATabs,
  Textarea as ATextarea,
} from 'ant-design-vue';
import FkPicker from './FkPicker.vue';
import { PlusOutlined } from '@ant-design/icons-vue';

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
    | 'Divider'
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
    tabs?: TabProp[];
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

interface TabProp {
  key: string;
  table: string;
  parentKey: string;
  title?: string;
  queryExtra?: Record<string, any>;
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
  { value: 'Divider', label: '分隔' },
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

// Computed property to manage tabs for the 'Items' component
const tabs = computed<TabProp[]>({
  get() {
    if (model.value.component === 'Items') {
      if (!model.value.componentProps) {
        model.value.componentProps = {};
      }
      if (!Array.isArray(model.value.componentProps.tabs)) {
        model.value.componentProps.tabs = [];
      }
      return model.value.componentProps.tabs as TabProp[];
    }
    return [];
  },
  set(newTabs) {
    if (model.value.component === 'Items') {
      if (!model.value.componentProps) {
        model.value.componentProps = {};
      }
      model.value.componentProps.tabs = newTabs;
    }
  },
});

function addTab() {
  const newTabs = [...tabs.value];
  newTabs.push({
    key: `tab${newTabs.length + 1}`,
    table: '',
    parentKey: '',
    title: '',
    queryExtra: {},
  });
  tabs.value = newTabs;
}

function removeTab(index: number) {
  const newTabs = [...tabs.value];
  newTabs.splice(index, 1);
  tabs.value = newTabs;
}

// Helper to get string representation for textarea
function getQueryExtraString(tab: TabProp): string {
  try {
    return tab.queryExtra && Object.keys(tab.queryExtra).length > 0
      ? JSON.stringify(tab.queryExtra, null, 2)
      : '';
  } catch {
    return '{}'; // Return empty object string on error
  }
}

// Helper to update queryExtra from textarea
function updateQueryExtra(event: Event, index: number) {
  const target = event.target as HTMLTextAreaElement;
  const newTabs = [...tabs.value];
  if (index >= newTabs.length) return; // safety check

  try {
    if (target.value.trim()) {
      newTabs[index].queryExtra = JSON.parse(target.value);
    } else {
      newTabs[index].queryExtra = {};
    }
    tabs.value = newTabs;
  } catch (e) {
    console.error('Invalid JSON for queryExtra', e);
    // To avoid data loss, we don't update if JSON is invalid.
  }
}

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
