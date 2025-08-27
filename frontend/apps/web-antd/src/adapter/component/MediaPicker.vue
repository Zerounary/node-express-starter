<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'

type MediaType = 'image' | 'video'
export interface MediaItem {
  id: string | number
  type: MediaType
  url: string
  thumbUrl?: string
  name?: string
  size?: number
  width?: number
  height?: number
  duration?: number
  createdAt?: string | number | Date
  meta?: Record<string, any>
}

type SortKey = 'createdAtDesc' | 'createdAtAsc' | 'sizeDesc' | 'sizeAsc' | 'nameAsc' | 'nameDesc'

interface FetchParams {
  page: number
  pageSize: number
  query?: string
  types?: MediaType[]
  sort?: SortKey
  // 可扩展其他过滤条件，如 tags、dateRange 等
  [key: string]: any
}

interface FetchResult {
  items: MediaItem[]
  total: number
}

const props = defineProps<{
  modelValue?: any // 根据 valueKey 映射：object/array | url(s) | id(s)
  multiple?: boolean
  max?: number
  // 允许的媒体类型，默认 ['image', 'video']
  types?: MediaType[]
  // 对外输出值格式
  valueKey?: 'object' | 'url' | 'id'
  // 外部控制弹窗
  open?: boolean
  title?: string
  width?: number | string
  // 是否允许上传
  allowUpload?: boolean
  // 拉取媒体库数据
  fetcher: (params: FetchParams) => Promise<FetchResult>
  // 自定义上传器（需返回 MediaItem）
  uploader?: (file: File, extra?: Record<string, any>) => Promise<MediaItem>
  // 初始分页大小
  pageSize?: number
  // 禁用组件
  disabled?: boolean
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', v: any): void
  (e: 'change', v: any): void
  (e: 'open-change', open: boolean): void
}>()

// 内外受控：弹窗可由 props.open 控制，也可内部自管
const innerVisible = ref(false)
const visible = computed({
  get() {
    return props.open ?? innerVisible.value
  },
  set(v: boolean) {
    if (props.open === undefined) {
      innerVisible.value = v
    }
    emits('open-change', v)
  }
})

function openModal() {
  if (props.disabled) return
  visible.value = true
}
function closeModal() {
  visible.value = false
}

// 过滤、搜索、排序与分页状态
const query = ref('')
const selectedTypes = ref<MediaType[]>(props.types ?? ['image', 'video'])
const sort = ref<SortKey>('createdAtDesc')
const pager = reactive({ page: 1, pageSize: props.pageSize ?? 24, total: 0 })

// 列表与加载状态
const loading = ref(false)
const items = ref<MediaItem[]>([])

// 已选择缓存（在弹窗内操作，不直接污染对外值）
const selectedMap = reactive<Map<string | number, MediaItem>>(new Map())
const selectedCount = computed(() => selectedMap.size)
const canSelectMore = computed(() => {
  if (!props.multiple) return selectedCount.value < 1
  if (props.max != null) return selectedCount.value < props.max
  return true
})

// 输入值的回显（外部值 -> 展示）
// 为避免强耦合，如果 valueKey !== 'object' 且我们无法通过 id 拉取详情，则仅展示“已选择 X 项”
// 若你需要完整回显，建议传 object 或者在此处按 id 调用详情接口补全
const valueKey = computed(() => props.valueKey ?? 'object')
const valuePreview = computed<MediaItem[] | null>(() => {
  const mv = props.modelValue
  if (mv == null) return null
  if (valueKey.value === 'object') {
    return Array.isArray(mv) ? mv : [mv]
  }
  if (valueKey.value === 'url') {
    const urls = Array.isArray(mv) ? mv : [mv]
    return urls.map((u: string, idx: number) => ({
      id: idx,
      type: u.match(/\.(mp4|mov|webm|mkv)(\?|#|$)/i) ? 'video' : 'image',
      url: u,
      thumbUrl: u,
      name: u.split('/').pop()
    }))
  }
  // id 格式无法直接预览缩略图（除非你能拼接 URL 或再次拉取）
  return null
})

// 防抖搜索
let searchTimer: number | null = null
function triggerSearch() {
  pager.page = 1
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
  searchTimer = window.setTimeout(loadList, 300) as unknown as number
}

// 拉取素材库列表
async function loadList() {
  if (!props.fetcher) return
  loading.value = true
  try {
    const res = await props.fetcher({
      page: pager.page,
      pageSize: pager.pageSize,
      query: query.value || undefined,
      types: selectedTypes.value,
      sort: sort.value
    })
    items.value = res.items ?? []
    pager.total = res.total ?? 0
  } catch (e: any) {
    console.error(e)
    message.error(e?.message || '加载媒体库失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadList)
watch(() => [selectedTypes.value, sort.value], () => {
  pager.page = 1
  loadList()
})

// 选择逻辑
function toggleSelect(item: MediaItem) {
  const key = item.id
  if (selectedMap.has(key)) {
    selectedMap.delete(key)
    return
  }
  // 单选
  if (!props.multiple) {
    selectedMap.clear()
    selectedMap.set(key, item)
    return
  }
  // 多选
  if (!canSelectMore.value) {
    message.warning(`最多可选择 ${props.max} 个`)
    return
  }
  selectedMap.set(key, item)
}

function isSelected(id: string | number) {
  return selectedMap.has(id)
}

function clearSelection() {
  selectedMap.clear()
}

function onPageChange(page: number, pageSize?: number) {
  pager.page = page
  if (pageSize && pageSize !== pager.pageSize) {
    pager.pageSize = pageSize
    pager.page = 1
  }
  loadList()
}

// 上传
async function handleCustomUpload(options: any) {
  const { file, onSuccess, onError } = options
  if (!props.uploader) {
    onError?.(new Error('未配置 uploader'))
    return
  }
  try {
    const item = await props.uploader(file as File)
    // 上传成功：加入已选 & 也可插入到列表头部
    selectedMap.set(item.id, item)
    items.value = [item, ...items.value]
    pager.total += 1
    onSuccess?.(item)
  } catch (e) {
    console.error(e)
    onError?.(e)
  }
}

function toExternalValue(list: MediaItem[]) {
  const mapped = (() => {
    switch (valueKey.value) {
      case 'url':
        return list.map(i => i.url)
      case 'id':
        return list.map(i => i.id)
      default:
        return list
    }
  })()
  if (props.multiple) return mapped
  return mapped[0] ?? (valueKey.value === 'object' ? null : undefined)
}

function confirmSelection() {
  const selectedList = Array.from(selectedMap.values())
  const out = toExternalValue(selectedList)
  emits('update:modelValue', out)
  emits('change', out)
  closeModal()
}

// 预览
const previewVisible = ref(false)
const previewItem = ref<MediaItem | null>(null)
function openPreview(item: MediaItem) {
  previewItem.value = item
  previewVisible.value = true
}
</script>

<template>
  <div class="media-picker">
    <!-- 触发器，可自定义 -->
    <slot name="trigger" :open="openModal">
      <a-button :disabled="disabled" @click="openModal">选择媒体</a-button>
    </slot>

    <!-- 外部值回显：若是 object/url 格式，尝试预览缩略图 -->
    <div v-if="valuePreview?.length" class="mp-selected-preview">
      <div class="mp-selected-title">已选择</div>
      <div class="mp-selected-list">
        <div v-for="it in valuePreview" :key="it.id" class="mp-thumb">
          <template v-if="it.type === 'image'">
            <a-image :src="it.thumbUrl || it.url" :alt="it.name" :width="64" :height="64" :preview="false" />
          </template>
          <template v-else>
            <div class="mp-video-thumb">
              <video :src="it.url" muted preload="metadata" />
              <span class="mp-badge">Video</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 媒体库弹窗 -->
    <Modal
      :open="visible"
      :title="title || '选择媒体'"
      :width="width || 980"
      :maskClosable="false"
      @cancel="closeModal"
      :footer="null"
    >
      <div class="mp-toolbar">
        <a-input-search
          v-model:value="query"
          placeholder="搜索名称、关键字..."
          @search="triggerSearch"
          @input="triggerSearch"
          allowClear
          style="max-width: 320px"
        />
        <div class="mp-toolbar-right">
          <a-select v-model:value="selectedTypes" mode="multiple" style="width: 220px" :maxTagCount="1">
            <a-select-option value="image">图片</a-select-option>
            <a-select-option value="video">视频</a-select-option>
          </a-select>
          <a-select v-model:value="sort" style="width: 180px">
            <a-select-option value="createdAtDesc">最新上传</a-select-option>
            <a-select-option value="createdAtAsc">最早上传</a-select-option>
            <a-select-option value="sizeDesc">体积从大到小</a-select-option>
            <a-select-option value="sizeAsc">体积从小到大</a-select-option>
            <a-select-option value="nameAsc">名称 A→Z</a-select-option>
            <a-select-option value="nameDesc">名称 Z→A</a-select-option>
          </a-select>
        </div>
      </div>

      <a-tabs>
        <!-- 素材库 -->
        <a-tab-pane key="library" tab="素材库">
          <a-spin :spinning="loading">
            <div v-if="items.length > 0" class="mp-grid">
              <div
                v-for="it in items"
                :key="it.id"
                class="mp-card"
                :class="{ 'is-selected': isSelected(it.id) }"
                @click="toggleSelect(it)"
              >
                <slot name="item" :item="it">
                  <template v-if="it.type === 'image'">
                    <a-image
                      :src="it.thumbUrl || it.url"
                      :alt="it.name"
                      :preview="false"
                      :width="160"
                      :height="160"
                      style="object-fit: cover"
                    />
                  </template>
                  <template v-else>
                    <div class="mp-video-thumb large">
                      <video :src="it.url" muted preload="metadata" />
                      <span class="mp-badge">Video</span>
                    </div>
                  </template>
                  <div class="mp-card-meta">
                    <span class="name" :title="it.name">{{ it.name || '未命名' }}</span>
                    <a
                      class="action"
                      @click.stop="openPreview(it)"
                    >预览</a>
                  </div>
                </slot>
              </div>
            </div>
            <a-empty v-else description="暂无媒体" />
          </a-spin>

          <div class="mp-pagination">
            <a-pagination
              :current="pager.page"
              :pageSize="pager.pageSize"
              :total="pager.total"
              show-size-changer
              show-quick-jumper
              @change="onPageChange"
              @update:pageSize="(ps:number) => onPageChange(1, ps)"
            />
          </div>
        </a-tab-pane>

        <!-- 上传 -->
        <a-tab-pane key="upload" tab="上传" v-if="allowUpload">
          <a-upload
            :multiple="multiple"
            list-type="picture-card"
            :customRequest="handleCustomUpload"
            :accept="selectedTypes.includes('image') && selectedTypes.includes('video') ? 'image/*,video/*' : (selectedTypes.includes('image') ? 'image/*' : 'video/*')"
            :showUploadList="true"
            :disabled="!uploader"
          >
            <div>
              <span>点击或拖拽上传</span>
              <div style="color:#999; font-size:12px; margin-top:6px">支持图片/视频</div>
            </div>
          </a-upload>
          <div style="color:#999; font-size:12px; margin-top:8px">
            上传成功后将自动加入已选与素材库
          </div>
        </a-tab-pane>
      </a-tabs>

      <div class="mp-footer">
        <div class="left">
          <span>已选：{{ selectedCount }}</span>
          <a-button size="small" type="link" :disabled="selectedCount===0" @click="clearSelection">清空</a-button>
          <template v-if="max && multiple">
            <span class="tip">最多 {{ max }} 项</span>
          </template>
        </div>
        <div class="right">
          <a-button @click="closeModal">取消</a-button>
          <a-button type="primary" :disabled="selectedCount===0" @click="confirmSelection">确定</a-button>
        </div>
      </div>
    </Modal>

    <!-- 预览弹窗 -->
    <Modal :open="previewVisible" title="预览" :footer="null" @cancel="previewVisible=false" width="800px">
      <div v-if="previewItem" class="mp-preview-body">
        <template v-if="previewItem.type === 'image'">
          <a-image :src="previewItem.url" :alt="previewItem.name" />
        </template>
        <template v-else>
          <video :src="previewItem.url" style="max-width: 100%;" controls />
        </template>
        <div class="meta">
          <div>名称：{{ previewItem.name || '-' }}</div>
          <div>尺寸：{{ previewItem.width || '-' }} x {{ previewItem.height || '-' }}</div>
          <div v-if="previewItem.duration">时长：{{ previewItem.duration }}s</div>
          <div>大小：{{ previewItem.size ? (previewItem.size / 1024 / 1024).toFixed(2) + ' MB' : '-' }}</div>
          <div>时间：{{ previewItem.createdAt || '-' }}</div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.media-picker { display: flex; flex-direction: column; gap: 8px; }
.mp-selected-preview { background: #fafafa; border: 1px solid #f0f0f0; padding: 8px; border-radius: 6px; }
.mp-selected-title { font-size: 12px; color: #999; margin-bottom: 6px; }
.mp-selected-list { display: flex; gap: 8px; flex-wrap: wrap; }
.mp-thumb { width: 64px; height: 64px; overflow: hidden; border-radius: 4px; border: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: center; }
.mp-video-thumb { position: relative; width: 64px; height: 64px; background: #000; display: flex; align-items: center; justify-content: center; }
.mp-video-thumb video { width: 100%; height: 100%; object-fit: cover; }
.mp-video-thumb.large { width: 160px; height: 160px; }
.mp-badge { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.65); color: #fff; font-size: 10px; padding: 2px 4px; border-radius: 3px; }

.mp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.mp-toolbar-right { display: flex; gap: 8px; }

.mp-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.mp-card { border: 1px solid #f0f0f0; border-radius: 6px; padding: 8px; cursor: pointer; transition: all .15s ease; background: #fff; }
.mp-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.mp-card.is-selected { border-color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.15); }
.mp-card .mp-card-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.mp-card .name { max-width: 120px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #333; font-size: 12px; }
.mp-card .action { font-size: 12px; }

.mp-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }

.mp-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
.mp-footer .left { display: flex; align-items: center; gap: 8px; }
.mp-footer .left .tip { color: #999; font-size: 12px; }
.mp-preview-body { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
.mp-preview-body .meta { font-size: 12px; color: #666; display: grid; gap: 6px; }
@media (max-width: 1100px) {
  .mp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .mp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
