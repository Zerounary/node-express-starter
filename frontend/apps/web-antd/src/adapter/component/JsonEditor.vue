<template>
  <div class="json-editor grid grid-cols-1 gap-2 md:grid-cols-2">
    <div class="flex flex-col">
      <div class="mb-2 flex items-center gap-2">
        <a-button size="small" @click="formatText">格式化</a-button>
        <span class="text-xs" :class="error ? 'text-red-500' : 'text-green-600'">
          {{ error ? '语法错误: ' + error : '语法正确' }}
        </span>
      </div>
      <div class="editor-wrapper border" :style="editorStyle" :class="{ 'border-red-500': error }">
        <Codemirror
          v-model="text"
          placeholder="输入 JSON 内容..."
          :style="{ height: '100%' }"
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
          @update:model-value="onInput"
          @blur="onBlur"
        />
      </div>
    </div>
    <div class="rounded-md border bg-gray-50 p-2">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-xs text-gray-600">结构视图（可折叠）</span>
        <div class="flex items-center gap-2">
          <a-switch size="small" v-model:checked="autoFormatOnBlur" />
          <span class="text-xs text-gray-600">失焦自动格式化</span>
        </div>
      </div>
      <div class="json-tree text-sm">
        <JsonTree :data="parsed" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, defineComponent, h, shallowRef } from 'vue';
import { Button as AButton, Switch as ASwitch } from 'ant-design-vue';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';

import JSON5 from 'json5';

const props = withDefaults(
  defineProps<{
    json?: Record<string, any> | null;
    rows?: number;
  }>(),
  {
    json: () => ({}),
    rows: 10,
  },
);

const emit = defineEmits<{
  (e: 'update:json', v: Record<string, any>): void;
}>();

// Codemirror extensions
const extensions = [json()];

const editorStyle = computed(() => ({
  minHeight: `${props.rows * 22}px`,
  height: '100%',
}));

// 内部文本状态
const text = ref<string>('');
const error = ref<string | null>(null);
const autoFormatOnBlur = ref<boolean>(true);

// 初始化和外部 json 变化时同步文本
function safeStringify(obj: any) {
  try {
    return obj ? JSON.stringify(obj, null, 2) : '';
  } catch {
    return '';
  }
}

watch(
  () => props.json,
  (val) => {
    try {
      const currentParsed = JSON5.parse(text.value || '{}');
      const same = deepEqual(currentParsed, val ?? {});
      if (!same) {
        text.value = safeStringify(val ?? {});
        error.value = null;
      }
    } catch {
      // If current text is invalid, just update it.
      text.value = safeStringify(val ?? {});
      error.value = null;
    }
  },
  { immediate: true, deep: true }
);

const parsed = computed(() => {
  try {
    if (!text.value.trim()) return {};
    const p = JSON5.parse(text.value);
    return p;
  } catch {
    return {};
  }
});

function tryParse(input: string): any {
  try {
    if (!input.trim()) return {};
    const parsed = JSON5.parse(input);
    error.value = null;
    return parsed;
  } catch (e: any) {
    error.value = e.message;
    return null;
  }
}

function onInput(val: string) {
  text.value = val;
  const parsedValue = tryParse(val);
  if (parsedValue !== null) {
    emit('update:json', parsedValue);
  }
}

function formatText() {
  const parsedValue = tryParse(text.value);
  if (parsedValue !== null) {
    text.value = JSON.stringify(parsedValue, null, 2);
    // emit is already done in onInput, but we need to ensure it's updated after format
    emit('update:json', parsedValue);
  }
}

function onBlur() {
  if (autoFormatOnBlur.value) {
    formatText();
  }
}

// 简易深比较，避免不必要覆盖
function deepEqual(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// 右侧折叠树视图（只读）
const JsonTree = defineComponent({
  name: 'JsonTree',
  props: {
    data: { type: [Object, Array], required: false, default: () => ({}) },
    path: { type: String, default: '' },
  },
  setup(props: { data?: any; path?: string }) {
    const collapsed = shallowRef<Record<string, boolean>>({});
    function toggle(p: string) {
      collapsed.value = { ...collapsed.value, [p]: !collapsed.value[p] };
    }
    function isCollapsible(v: any) {
      return v && (typeof v === 'object');
    }
    function entriesOf(v: any): [string, any][] {
      if (Array.isArray(v)) return v.map((item, idx) => [String(idx), item]);
      return Object.entries(v || {});
    }
    return () => {
      const v = props.data;
      if (!isCollapsible(v)) {
        return h('span', { class: 'text-gray-700' }, String(v));
      }
      const items = entriesOf(v);
      return h('ul', { class: 'json-tree-list' },
        items.map(([key, val]) => {
          const p = (props.path ? props.path + '.' : '') + key;
          const foldable = isCollapsible(val);
          const folded = !!collapsed.value[p];
          return h('li', { class: 'json-tree-item' }, [
            h('div', {
              class: 'flex items-center gap-2 cursor-pointer',
              onClick: () => foldable && toggle(p),
            }, [
              foldable
                ? h('span', { class: 'inline-block w-4 text-center text-xs text-gray-600' }, folded ? '+' : '-')
                : h('span', { class: 'inline-block w-4' }),
              h('span', { class: 'font-mono text-gray-800' }, key + ':'),
              !foldable && h('span', { class: 'text-gray-700' }, ' ' + String(val)),
            ]),
            foldable && !folded && h(JsonTree, { data: val, path: p }),
          ]);
        })
      );
    };
  },
});
</script>

<style scoped>
.json-editor {
  width: 100%;
}
.json-tree-list {
  list-style: none;
  padding-left: 0.5rem;
}
.json-tree-item {
  margin: 2px 0;
}
.editor-wrapper {
  position: relative;
  height: 100%;
}
.editor-wrapper :deep(.cm-editor) {
  height: 100%;
}
</style>