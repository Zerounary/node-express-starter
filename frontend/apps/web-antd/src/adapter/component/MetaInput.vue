<template>
  <div class="meta-input">
    <a-tabs default-active-key="general">
      <!-- General Settings -->
      <a-tab-pane key="general" tab="通用设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a-form-item label="字段名">
              <a-input v-model:value="model.name" placeholder="字段名" />
            </a-form-item>
            <a-form-item label="标题">
              <a-input v-model:value="model.title" placeholder="显示标题" />
            </a-form-item>
            <a-form-item label="字段类型">
              <ColumnTypeInput v-model="model.type" />
            </a-form-item>
            <a-form-item label="默认值">
              <a-input v-model:value="model.defaultValue" placeholder="默认值" />
            </a-form-item>
            <a-form-item label="必填">
              <a-switch v-model:checked="model.required" />
            </a-form-item>
            <a-form-item label="唯一">
              <a-switch v-model:checked="model.unique" />
            </a-form-item>
            <a-form-item label="索引">
              <a-switch v-model:checked="model.index" />
            </a-form-item>
            <a-form-item label="可为空">
              <a-switch v-model:checked="model.allowNull" />
            </a-form-item>
            <a-form-item label="注释">
              <a-textarea
                v-model:value="model.comment"
                :rows="2"
                placeholder="字段注释"
              />
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>

      <!-- Validation Settings -->
      <a-tab-pane key="validation" tab="验证设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a-form-item label="最小长度">
              <a-input-number
                v-model:value="model.minLength"
                :min="0"
                style="width: 100%"
                placeholder="最小长度"
              />
            </a-form-item>
            <a-form-item label="最大长度">
              <a-input-number
                v-model:value="model.maxLength"
                :min="0"
                style="width: 100%"
                placeholder="最大长度"
              />
            </a-form-item>
            <a-form-item label="最小值">
              <a-input-number
                v-model:value="model.min"
                style="width: 100%"
                placeholder="最小值"
              />
            </a-form-item>
            <a-form-item label="最大值">
              <a-input-number
                v-model:value="model.max"
                style="width: 100%"
                placeholder="最大值"
              />
            </a-form-item>
            <a-form-item label="正则表达式">
              <a-input
                v-model:value="model.pattern"
                placeholder="验证正则表达式"
              />
            </a-form-item>
            <a-form-item label="自定义验证规则 (JSON)">
              <a-textarea
                v-model:value="validationRulesString"
                :rows="4"
                @blur="handleValidationRulesChange"
                placeholder='[{"required": true, "message": "必填项"}]'
              />
              <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>

      <!-- UI Settings -->
      <a-tab-pane key="ui" tab="UI设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a-form-item label="隐藏">
              <a-switch v-model:checked="model.hidden" />
            </a-form-item>
            <a-form-item label="只读">
              <a-switch v-model:checked="model.readonly" />
            </a-form-item>
            <a-form-item label="禁用">
              <a-switch v-model:checked="model.disabled" />
            </a-form-item>
            <a-form-item label="显示在列表">
              <a-switch v-model:checked="model.showInList" />
            </a-form-item>
            <a-form-item label="显示在表单">
              <a-switch v-model:checked="model.showInForm" />
            </a-form-item>
            <a-form-item label="显示在详情">
              <a-switch v-model:checked="model.showInDetail" />
            </a-form-item>
            <a-form-item label="可搜索">
              <a-switch v-model:checked="model.searchable" />
            </a-form-item>
            <a-form-item label="可排序">
              <a-switch v-model:checked="model.sortable" />
            </a-form-item>
            <a-form-item label="列表宽度">
              <a-input-number
                v-model:value="model.listWidth"
                :min="0"
                style="width: 100%"
                placeholder="列表显示宽度"
              />
            </a-form-item>
            <a-form-item label="表单宽度">
              <a-input-number
                v-model:value="model.formWidth"
                :min="0"
                style="width: 100%"
                placeholder="表单显示宽度"
              />
            </a-form-item>
            <a-form-item label="排序">
              <a-input-number
                v-model:value="model.order"
                :min="0"
                style="width: 100%"
                placeholder="显示顺序"
              />
            </a-form-item>
            <a-form-item label="分组">
              <a-input
                v-model:value="model.group"
                placeholder="字段分组"
              />
            </a-form-item>
            <a-form-item label="占位符">
              <a-input
                v-model:value="model.placeholder"
                placeholder="输入框占位符"
              />
            </a-form-item>
            <a-form-item label="帮助文本">
              <a-textarea
                v-model:value="model.helpText"
                :rows="2"
                placeholder="字段帮助说明"
              />
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>

      <!-- Advanced Settings -->
      <a-tab-pane key="advanced" tab="高级设置">
        <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a-form-item label="外键表">
              <FkPicker
                table="table"
                value-key="alias_name"
                v-model="model.foreignTable"
                placeholder="选择关联表"
              />
            </a-form-item>
            <a-form-item label="外键字段">
              <a-input
                v-model:value="model.foreignKey"
                placeholder="关联字段名"
              />
            </a-form-item>
            <a-form-item label="显示字段">
              <a-input
                v-model:value="model.displayField"
                placeholder="显示字段名"
              />
            </a-form-item>
            <a-form-item label="级联删除">
              <a-switch v-model:checked="model.cascadeDelete" />
            </a-form-item>
            <a-form-item label="枚举选项 (JSON)">
              <a-textarea
                v-model:value="enumOptionsString"
                :rows="4"
                @blur="handleEnumOptionsChange"
                placeholder='[{"label": "选项1", "value": "value1"}]'
              />
              <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
            </a-form-item>
            <a-form-item label="扩展属性 (JSON)">
              <a-textarea
                v-model:value="extendedPropsString"
                :rows="4"
                @blur="handleExtendedPropsChange"
                placeholder='{"customProp": "value"}'
              />
              <div class="mt-1 text-xs text-gray-500">请输入合法的JSON格式</div>
            </a-form-item>
          </div>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, defineModel } from 'vue';
import {
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Switch as ASwitch,
  TabPane as ATabPane,
  Tabs as ATabs,
  Textarea as ATextarea,
} from 'ant-design-vue';
import FkPicker from './FkPicker.vue';
import ColumnTypeInput from './ColumnTypeInput.vue';

// Define the interface for meta field configuration
interface MetaField {
  name?: string;
  title?: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  unique?: boolean;
  index?: boolean;
  allowNull?: boolean;
  comment?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  validationRules?: any[];
  hidden?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  showInList?: boolean;
  showInForm?: boolean;
  showInDetail?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  listWidth?: number;
  formWidth?: number;
  order?: number;
  group?: string;
  placeholder?: string;
  helpText?: string;
  foreignTable?: string;
  foreignKey?: string;
  displayField?: string;
  cascadeDelete?: boolean;
  enumOptions?: { label: string; value: any }[];
  extendedProps?: Record<string, any>;
}

// Use defineModel to create a two-way binding
const model = defineModel<MetaField>({
  default: () => ({}),
});

// Computed property to handle JSON conversion for validation rules
const validationRulesString = computed({
  get() {
    try {
      return model.value.validationRules
        ? JSON.stringify(model.value.validationRules, null, 2)
        : '';
    } catch (e) {
      return '';
    }
  },
  set(val: string) {
    try {
      if (val.trim()) {
        model.value.validationRules = JSON.parse(val);
      } else {
        model.value.validationRules = [];
      }
    } catch (e) {
      console.error('Invalid JSON format for validation rules', e);
    }
  },
});

// Computed property to handle JSON conversion for enum options
const enumOptionsString = computed({
  get() {
    try {
      return model.value.enumOptions
        ? JSON.stringify(model.value.enumOptions, null, 2)
        : '';
    } catch (e) {
      return '';
    }
  },
  set(val: string) {
    try {
      if (val.trim()) {
        model.value.enumOptions = JSON.parse(val);
      } else {
        model.value.enumOptions = [];
      }
    } catch (e) {
      console.error('Invalid JSON format for enum options', e);
    }
  },
});

// Computed property to handle JSON conversion for extended properties
const extendedPropsString = computed({
  get() {
    try {
      return model.value.extendedProps
        ? JSON.stringify(model.value.extendedProps, null, 2)
        : '';
    } catch (e) {
      return '';
    }
  },
  set(val: string) {
    try {
      if (val.trim()) {
        model.value.extendedProps = JSON.parse(val);
      } else {
        model.value.extendedProps = {};
      }
    } catch (e) {
      console.error('Invalid JSON format for extended properties', e);
    }
  },
});

// Update handlers for blur events
const handleValidationRulesChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  validationRulesString.value = target.value;
};

const handleEnumOptionsChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  enumOptionsString.value = target.value;
};

const handleExtendedPropsChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  extendedPropsString.value = target.value;
};
</script>

<style scoped>
.meta-input {
  width: 100%;
}
</style>
