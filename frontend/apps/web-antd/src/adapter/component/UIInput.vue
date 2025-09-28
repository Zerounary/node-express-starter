<template>
  <div class="ui-input rounded-md border bg-white p-4 dark:bg-gray-800">
    <a-tabs default-active-key="general">
      <!-- General Settings -->
      <a-tab-pane key="general" tab="通用设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                :parser="(val) => (val ? Number(val) : 0)"
                :formatter="
                  (val) =>
                    val === undefined || val === null ? '' : String(val)
                "
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
              <a-select
                v-model:value="model.component"
                :options="componentTypes"
                style="width: 100%"
              >
              </a-select>
            </a-form-item>

            <!-- Generic componentProps for other components -->
            <a-form-item
              v-if="!['Items', 'Select'].includes(model.component)"
              label="组件属性 (JSON)"
            >
              <a-textarea
                v-model:value="componentPropsString"
                :rows="5"
                @blur="handlePropsChange"
              />
              <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
            </a-form-item>

            <!-- Specific UI for 'Select' component options -->
            <div
              v-if="model.component === 'Select'"
              class="md:col-span-2 lg:col-span-3"
            >
              <h3 class="mb-2 font-semibold text-gray-800">选项</h3>
              <div
                v-for="(opt, idx) in selectOptions"
                :key="idx"
                class="mb-3 rounded-md border bg-gray-50 p-3"
              >
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-medium">选项 {{ idx + 1 }}</h4>
                  <a-button type="link" danger @click="removeOption(idx)"
                    >移除</a-button
                  >
                </div>
                <div class="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                  <a-form-item label="标签(label)" required>
                    <a-input
                      :ref="(el) => (optionValueInputs[idx] = el)"
                      v-model:value="opt.label"
                    />
                  </a-form-item>
                  <a-form-item label="值(value)" required>
                    <a-input
                      v-model:value="opt.value"
                      @press-enter="addOption"
                    />
                  </a-form-item>
                </div>
              </div>
              <a-button type="dashed" class="w-full" @click="addOption">
                <PlusOutlined /> 添加选项
              </a-button>
            </div>

            <!-- Specific UI for 'Items' component tabs -->
            <div
              v-if="model.component === 'Items'"
              class="md:col-span-2 lg:col-span-3"
            >
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
                    <FkPicker
                      table="table"
                      value-key="alias_name"
                      v-model="tab.table"
                    />
                  </a-form-item>
                  <a-form-item label="父表字段名" required>
                    <FkPicker
                      table="column"
                      value-key="name"
                      :query-extra="{}"
                      v-model="tab.parentKey"
                    />
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
      <a-tab-pane key="rules" tab="字段规则">
        <div class="flex flex-col">
          <a-form-item label="默认值">
            <a-input
              v-model:value="model.defaultValue"
              placeholder="设置字段的默认值"
            />
          </a-form-item>
          <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
          </a-form>
          <!-- Rule Generator UI -->
          <div
            v-for="(rule, index) in model.rules"
            :key="index"
            class="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2 rounded-md border p-3"
          >
            <a-form-item label="类型">
              <a-select
                v-model:value="rule.type"
                @change="handleRuleTypeChange(rule)"
              >
                <a-select-opt-group
                  v-for="group in groupedValidationTypes"
                  :key="group.label"
                  :label="group.label"
                >
                  <a-select-option
                    v-for="t in group.options"
                    :key="t.value"
                    :value="t.value"
                  >
                    {{ t.label }}
                  </a-select-option>
                </a-select-opt-group>
              </a-select>
            </a-form-item>

            <a-form-item label="参数" v-if="getRuleParamType(rule.type)">
              <a-input-number
                v-if="getRuleParamType(rule.type) === 'number'"
                v-model:value="rule.value"
                class="w-full"
              />
              <a-input
                v-else-if="getRuleParamType(rule.type) === 'string'"
                v-model:value="rule.value"
              />
            </a-form-item>
            <div v-else></div>
            <!-- Placeholder for grid alignment -->

            <a-form-item label="错误信息">
              <a-input v-model:value="rule.message" placeholder="可选" />
            </a-form-item>

            <a-button type="link" danger @click="removeRule(index)">
              <DeleteOutlined />
            </a-button>
          </div>

          <a-button type="dashed" class="w-full" @click="addRule">
            <PlusOutlined /> 添加规则
          </a-button>

          <!-- Generated Zod Schema Preview -->
          <div class="mt-4">
            <h3 class="font-semibold">生成的 Zod Schema:</h3>
            <pre
              class="mt-2 rounded-md bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              >{{ generatedZodSchema }}</pre
            >
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineModel,
  onMounted,
  ref,
  nextTick,
  onBeforeUpdate,
} from 'vue';
import {
  Button as AButton,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOptGroup as ASelectOptGroup,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  TabPane as ATabPane,
  Tabs as ATabs,
  Textarea as ATextarea,
  type SelectProps,
} from 'ant-design-vue';
import FkPicker from './FkPicker.vue';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { z } from '@vben/common-ui';

// Define the rule interface
interface ZodRule {
  type: string;
  value?: any;
  message?: string;
}

// Define the interface based on the provided structure
interface ColumnUI {
  mask?: string;
  width?: number;
  /** 额外样式类（模板已使用） */
  wrapperClass?: string;
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
  /** 是否隐藏 label（模板已使用） */
  hideLabel?: boolean;
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
  rules?: ZodRule[];
  defaultValue?: any;
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
  default: () => ({
    component: 'Input',
    dependencies: {},
    rules: [],
    defaultValue: undefined,
  }),
});

const optionValueInputs = ref<any[]>([]);
onBeforeUpdate(() => {
  optionValueInputs.value = [];
});
// 确保渲染前存在 dependencies，兼容历史数据（可能缺少该字段）
if (!model.value.dependencies || typeof model.value.dependencies !== 'object') {
  model.value.dependencies = {};
}
// Ensure rules array exists
if (!model.value.rules) {
  model.value.rules = [];
}

const componentTypes = ref<SelectProps['options']>([
  {
    label: '文本',
    options: [
      { value: 'Input', label: '单行文本框' },
      { value: 'InputPassword', label: '密码框' },
    ],
  },
  {
    label: '数字',
    options: [{ value: 'InputNumber', label: '数字输入框' }],
  },
  {
    label: '时间',
    options: [
      { value: 'DatePicker', label: '日期选择器' },
      { value: 'RangePicker', label: '日期范围选择器' },
    ],
  },
  {
    label: '地点',
    options: [
      { value: 'LocatePicker', label: '地点选择器' },
    ],
  },
  {
    label: '选择',
    options: [
      { value: 'Select', label: '下拉选择器' },
      { value: 'FkPicker', label: '外键选择器' },
      { value: 'Checkbox', label: '复选框' },
      { value: 'RadioGroup', label: '单选按钮组' },
    ],
  },
  {
    label: '媒体',
    options: [
      { value: 'MediaPicker', label: '媒体选择器' },
      { value: 'IconPicker', label: '图标选择器' },
    ],
  },
  {
    label: '子表',
    options: [{ value: 'Items', label: '子项列表' }],
  },
  {
    label: '其他',
    options: [{ value: 'Divider', label: '分隔' }],
  },
  //   { value: 'UIInput', label: 'UI配置输入' },
  //   { value: 'ColumnTypeInput', label: '字段类型选择器' },
  //   { value: 'PermissionPicker', label: '权限选择器' },
  //   { value: 'MetaInput', label: '元数据输入' },
]);

const filterOps = [
  { value: 'like', label: '包含' },
  { value: 'llike', label: '左包含' },
  { value: 'rlike', label: '右包含' },
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
  { value: 'in', label: '在...中' },
];

/** Select options 维护 - 结构保持 { options: [{label,value}] } */
type SelectOption = { label: string; value: any };
const selectOptions = computed<SelectOption[]>({
  get() {
    if (model.value.component === 'Select') {
      if (!model.value.componentProps) model.value.componentProps = {};
      const props = model.value.componentProps!;
      if (!Array.isArray(props.options)) {
        props.options = [];
      }
      return (props.options || []) as SelectOption[];
    }
    return [];
  },
  set(newOptions) {
    if (model.value.component === 'Select') {
      if (!model.value.componentProps) model.value.componentProps = {};
      const props = model.value.componentProps!;
      props.options = Array.isArray(newOptions) ? newOptions : [];
    }
  },
});

async function addOption() {
  const list = [...selectOptions.value];
  list.push({ label: '', value: '' });
  selectOptions.value = list;
  await nextTick();
  const lastInput = optionValueInputs.value.at(-1);
  if (lastInput) {
    lastInput.focus();
  }
}
function removeOption(index: number) {
  const list = [...selectOptions.value];
  list.splice(index, 1);
  selectOptions.value = list;
}

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

// Zod Rules Configuration
const validationTypes = [
  // Type definition
  { value: 'string', label: '字符串', param: null, group: '类型' },
  { value: 'number', label: '数字', param: null, group: '类型' },
  { value: 'boolean', label: '布尔值', param: null, group: '类型' },
  { value: 'date', label: '日期', param: null, group: '类型' },

  { value: 'required', label: '必填', param: null, group: '通用校验' },

  // String validations
  { value: 'min', label: '最小长度', param: 'number', group: '字符串校验' },
  { value: 'max', label: '最大长度', param: 'number', group: '字符串校验' },
  { value: 'length', label: '固定长度', param: 'number', group: '字符串校验' },
  { value: 'email', label: '邮箱地址', param: null, group: '字符串校验' },
  { value: 'url', label: 'URL', param: null, group: '字符串校验' },
  { value: 'uuid', label: 'UUID', param: null, group: '字符串校验' },
  { value: 'cuid', label: 'CUID', param: null, group: '字符串校验' },
  {
    value: 'datetime',
    label: 'ISO 日期时间',
    param: null,
    group: '字符串校验',
  },
  {
    value: 'startsWith',
    label: '以此开头',
    param: 'string',
    group: '字符串校验',
  },
  {
    value: 'endsWith',
    label: '以此结尾',
    param: 'string',
    group: '字符串校验',
  },
  { value: 'regex', label: '正则表达式', param: 'string', group: '字符串校验' },
  { value: 'identifier', label: '标识符', param: null, group: '字符串校验' },

  // Number validations
  { value: 'gt', label: '大于', param: 'number', group: '数字校验' },
  { value: 'gte', label: '大于等于 (min)', param: 'number', group: '数字校验' },
  { value: 'lt', label: '小于', param: 'number', group: '数字校验' },
  { value: 'lte', label: '小于等于 (max)', param: 'number', group: '数字校验' },
  { value: 'int', label: '整数', param: null, group: '数字校验' },
  { value: 'positive', label: '正数 (> 0)', param: null, group: '数字校验' },
  { value: 'negative', label: '负数 (< 0)', param: null, group: '数字校验' },
  {
    value: 'nonpositive',
    label: '非正数 (<= 0)',
    param: null,
    group: '数字校验',
  },
  {
    value: 'nonnegative',
    label: '非负数 (>= 0)',
    param: null,
    group: '数字校验',
  },
  {
    value: 'multipleOf',
    label: '...的倍数',
    param: 'number',
    group: '数字校验',
  },
];

const groupedValidationTypes = computed(() => {
  const groups: Record<
    string,
    { label: string; options: typeof validationTypes }
  > = {};
  validationTypes.forEach((vt) => {
    if (!groups[vt.group]) {
      groups[vt.group] = { label: vt.group, options: [] };
    }
    groups[vt.group].options.push(vt);
  });
  return Object.values(groups);
});

function getRuleParamType(type: string): 'string' | 'number' | null {
  const ruleDef = validationTypes.find((t) => t.value === type);
  return ruleDef ? (ruleDef.param as 'string' | 'number' | null) : null;
}

function handleRuleTypeChange(rule: ZodRule) {
  // Reset value when type changes to avoid type mismatch
  rule.value = undefined;
}

function addRule() {
  if (!model.value.rules) {
    model.value.rules = [];
  }
  // Add a string type by default for new rules if it's the first one
  const type = model.value.rules.length === 0 ? 'string' : 'required';
  model.value.rules.push({ type });
}

function removeRule(index: number) {
  model.value.rules?.splice(index, 1);
}

const generatedZodSchema = computed(() => {
  const rules = model.value.rules;
  if (!rules || rules.length === 0) {
    return 'z.any()';
  }

  let schema = 'z';
  let baseType = '';

  // Find base type, default to 'string'
  const typeRule = rules.find((r) =>
    ['string', 'number', 'boolean', 'date'].includes(r.type),
  );
  if (typeRule) {
    baseType = typeRule.type;
  } else {
    baseType = 'string';
  }
  schema += `.${baseType}()`;

  // Filter out the type rule and process others
  const validationRules = rules.filter((r) => r.type !== baseType);

  validationRules.forEach((rule) => {
    let methodName = rule.type;
    const args = [];

    // --- Method Name Translations ---
    if (methodName === 'required' && baseType === 'string') {
      methodName = 'nonempty';
    } else if (methodName === 'required') {
      return; // Is default for other types
    }

    if (baseType === 'number') {
      if (methodName === 'gte') methodName = 'min';
      if (methodName === 'lte') methodName = 'max';
    }

    if (methodName === 'identifier') {
      methodName = 'regex';
      args.push('/^[a-zA-Z_][a-zA-Z0-9_]*$/');
      if (rule.message) {
        args.push(`"${rule.message.replace(/"/g, '\\"')}"`);
      }
      schema += `.${methodName}(${args.join(', ')})`;
      return;
    }

    // --- Argument Formatting ---
    if (rule.value !== undefined && rule.value !== null && rule.value !== '') {
      if (methodName === 'regex') {
        args.push(rule.value); // Assume user enters a valid regex literal string
      } else if (typeof rule.value === 'string') {
        args.push(`"${rule.value.replace(/"/g, '\\"')}"`);
      } else {
        args.push(String(rule.value));
      }
    }

    if (rule.message) {
      args.push(`"${rule.message.replace(/"/g, '\\"')}"`);
    }

    schema += `.${methodName}(${args.join(', ')})`;
  });

  // --- Default Value ---
  const defaultValue = model.value.defaultValue;
  if (
    defaultValue !== undefined &&
    defaultValue !== null &&
    defaultValue !== ''
  ) {
    let formattedDefault;
    if (baseType === 'string') {
      formattedDefault = `"${String(defaultValue).replace(/"/g, '\\"')}"`;
    } else if (baseType === 'number') {
      const num = parseFloat(defaultValue);
      if (!isNaN(num)) {
        formattedDefault = String(num);
      }
    } else if (baseType === 'boolean') {
      formattedDefault = ['true', '1', 'yes'].includes(
        String(defaultValue).toLowerCase(),
      );
    } else {
      // For date and other types, just treat as string for now.
      formattedDefault = `"${String(defaultValue).replace(/"/g, '\\"')}"`;
    }

    if (formattedDefault !== undefined) {
      schema += `.default(${formattedDefault})`;
    }
  }

  return schema;
});
</script>

<style scoped>
.ui-input {
  width: 100%;
}
</style>
