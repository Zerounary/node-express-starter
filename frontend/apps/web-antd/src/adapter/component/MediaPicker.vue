<template>
  <div class="media-picker">
    <slot name="trigger" :open="openModal" :value="valuePreview">
      <!-- 单选模式，且有值时，显示图片/视频预览作为触发器 -->
      <div v-if="!multiple && valuePreview?.length === 1" @click="openModal" class="mp-single-preview-trigger">
        <template v-if="valuePreview[0].type === 'image'">
            <AImage
              :src="valuePreview[0].thumbUrl || valuePreview[0].url"
              :alt="valuePreview[0].name"
              :width="128"
              :height="128"
              :preview="false"
              :fallback="FALLBACK_IMAGE_SRC"
            />
        </template>
        <template v-else>
          <div class="mp-video-thumb" style="width: 128px; height: 128px; border-radius: 4px;">
            <video :src="valuePreview[0].url" muted preload="metadata" style="width: 100%; height: 100%; object-fit: cover;" />
            <span class="mp-badge">Video</span>
          </div>
        </template>
      </div>
      <!-- 默认触发器：多选模式或单选无值 -->
      <AButton v-else :disabled="disabled" @click="openModal">选择媒体</AButton>
    </slot>

    <!-- 多选模式预览 -->
    <div v-if="multiple && valuePreview?.length" class="mp-selected-preview">
      <div class="mp-selected-title">已选择</div>
      <AImage.PreviewGroup>
        <div class="mp-selected-list">
          <div v-for="it in valuePreview" :key="it.id" class="mp-thumb">
            <template v-if="it.type === 'image'">
              <AImage
                :src="it.thumbUrl || it.url"
                :alt="it.name"
                :width="64"
                :height="64"
                :fallback="FALLBACK_IMAGE_SRC"
              />
            </template>
            <template v-else>
              <div class="mp-video-thumb">
                <video :src="it.url" muted preload="metadata" />
                <span class="mp-badge">Video</span>
              </div>
            </template>
          </div>
        </div>
      </AImage.PreviewGroup>
    </div>

    <AModal
      :open="visible"
      :title="title || '媒体库'"
      :width="width || 900"
      :maskClosable="false"
      @cancel="closeModal"
      :footer="null"
      wrapClassName="media-picker-modal"
    >
      <div class="mp-toolbar">
        <AInputSearch
          v-model:value="query"
          placeholder="搜索名称、关键字..."
          @search="triggerSearch"
          @input="triggerSearch"
          allowClear
          style="max-width: 320px"
        />
        <div class="mp-toolbar-right">
          <ASelect v-model:value="selectedTypes" mode="multiple" style="width: 220px" :maxTagCount="1">
            <ASelectOption value="image">图片</ASelectOption>
            <ASelectOption value="video">视频</ASelectOption>
          </ASelect>
          <ASelect v-model:value="sort" style="width: 180px">
            <ASelectOption value="createdAtDesc">最新上传</ASelectOption>
            <ASelectOption value="createdAtAsc">最早上传</ASelectOption>
            <ASelectOption value="sizeDesc">体积从大到小</ASelectOption>
            <ASelectOption value="sizeAsc">体积从小到大</ASelectOption>
            <ASelectOption value="nameAsc">名称 A→Z</ASelectOption>
            <ASelectOption value="nameDesc">名称 Z→A</ASelectOption>
          </ASelect>
          <ATooltip title="刷新">
            <AButton @click="loadList" :loading="loading">
              <template #icon><ReloadOutlined /></template>
            </AButton>
          </ATooltip>
        </div>
      </div>

      <div class="mp-body-layout">
        <div v-if="fetchCategories" class="mp-sidebar">
          <div class="mp-sidebar-header">
            <span>分类</span>
            <ATooltip title="新建根分类">
              <AButton type="text" size="small" @click="handleAddCategory()">
                <template #icon><PlusOutlined /></template>
              </AButton>
            </ATooltip>
          </div>
          <div class="mp-category-list">
            <div
              class="ant-menu-item category-item"
              :class="{ 'ant-menu-item-selected': selectedCategoryId === null }"
              @click="selectCategory(null)"
            >
              <div class="category-item-content">
                <span class="category-name">全部</span>
              </div>
            </div>
            <ATree
              v-if="categoryTree.length"
              :tree-data="categoryTree"
              :field-names="{ title: 'name', key: 'id', children: 'children' }"
              v-model:selectedKeys="selectedCategoryKeys"
              v-model:expandedKeys="expandedCategoryKeys"
              block-node
              class="category-tree"
            >
              <template #title="cat">
                <div class="category-item-content">
                  <span :title="cat.name" class="category-name">{{ cat.name }}</span>
                  <span class="category-extra">
                    <span class="category-actions">
                      <ATooltip title="新建子分类">
                        <PlusOutlined @click.stop="handleAddCategory(cat.id)" />
                      </ATooltip>
                      <ATooltip title="编辑">
                        <EditOutlined @click.stop="handleEditCategory(cat)" />
                      </ATooltip>
                      <ATooltip title="删除">
                        <DeleteOutlined @click.stop="handleDeleteCategory(cat)" />
                      </ATooltip>
                    </span>
                  </span>
                </div>
              </template>
            </ATree>
          </div>
        </div>

        <div class="mp-main-content">
          <ATabs>
            <ATabPane key="library" tab="素材库">
               <div class="pane-content">
                <div class="media-grid">

              <ASpin :spinning="loading" class="mp-scroll-wrapper">
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
                        <AImage
                          :src="it.thumbUrl || it.url"
                          :alt="it.name"
                          :preview="false"
                          class="mp-card-img"
                          :fallback="FALLBACK_IMAGE_SRC"
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
                        <a class="action" @click.stop="openPreview(it)">详情</a>
                      </div>
                    </slot>
                  </div>
                </div>
                <AEmpty v-else description="暂无媒体" />
              </ASpin>
                </div>
              <div class="mp-pagination">
                <APagination
                  :current="pager.page"
                  :pageSize="pager.pageSize"
                  :total="pager.total"
                  show-size-changer
                  show-quick-jumper
                  @change="onPageChange"
                  @update:pageSize="(ps:number) => onPageChange(1, ps)"
                />
              </div>
            </div>
            </ATabPane>

            <ATabPane key="upload" tab="上传" v-if="allowUpload" class="upload-tab-pane">
                <div class="pane-content">
                    <AUpload
                        :multiple="multiple"
                        list-type="picture-card"
                        :customRequest="handleCustomUpload"
                        :accept="selectedTypes.includes('image') && selectedTypes.includes('video') ? 'image/*,video/*' : (selectedTypes.includes('image') ? 'image/*' : 'video/*')"
                        :showUploadList="true"
                        :disabled="!uploader"
                        class="mp-uploader"
                    >
                        <div>
                        <span>点击或拖拽上传</span>
                        <div style="color:#999; font-size:12px; margin-top:6px">支持图片/视频</div>
                        </div>
                    </AUpload>
                    <div style="color:#999; font-size:12px; margin-top:8px">
                        上传成功后将自动加入已选与素材库
                    </div>
                </div>
            </ATabPane>
          </ATabs>
        </div>
      </div>

      <div class="mp-footer">
        <div class="left">
          <span>已选：{{ selectedCount }}</span>
          <AButton size="small" type="link" :disabled="selectedCount===0" @click="clearSelection">清空</AButton>
          <ADropdown v-if="batchDeleter && selectedCount > 0">
            <template #overlay>
              <AMenu @click="handleBatchAction">
                <AMenuItem key="delete" class="danger-action">删除选中项</AMenuItem>
              </AMenu>
            </template>
            <AButton size="small">
              批量操作
              <DownOutlined />
            </AButton>
          </ADropdown>
          <template v-if="max && multiple">
            <span class="tip">最多 {{ max }} 项</span>
          </template>
        </div>
        <div class="right">
          <AButton @click="closeModal">取消</AButton>
          <AButton type="primary" :disabled="selectedCount===0" @click="confirmSelection">确定</AButton>
        </div>
      </div>
    </AModal>

    <AModal :open="previewVisible" :title="isEditing ? '编辑媒体' : '媒体详情'" :footer="null" @cancel="previewVisible = false" width="900px">
      <div v-if="previewItem" class="mp-preview-body">
        <div class="media-display">
          <template v-if="previewItem.type === 'image'">
            <AImage :src="previewItem.url" :alt="previewItem.name" :fallback="FALLBACK_IMAGE_SRC" />
          </template>
          <template v-else>
            <video :src="previewItem.url" style="max-width: 100%;" controls />
          </template>
        </div>
        <div class="meta-panel">
          <template v-if="!isEditing">
            <div class="meta-view">
              <div class="meta-item"><strong>名称：</strong>{{ previewItem.name || '-' }}</div>
              <div class="meta-item"><strong>尺寸：</strong>{{ previewItem.width || '-' }} x {{ previewItem.height || '-' }}</div>
              <div v-if="previewItem.duration" class="meta-item"><strong>时长：</strong>{{ previewItem.duration }}s</div>
              <div class="meta-item"><strong>大小：</strong>{{ previewItem.size ? (previewItem.size / 1024 / 1024).toFixed(2) + ' MB' : '-' }}</div>
              <div class="meta-item"><strong>时间：</strong>{{ previewItem.createdAt || '-' }}</div>
              <div class="meta-item">
                <strong>标签：</strong>
                <template v-if="previewItem.tags?.length">
                  <ATag v-for="tag in previewItem.tags" :key="tag">{{ tag }}</ATag>
                </template>
                <span v-else>-</span>
              </div>
              <div v-if="previewItem.linkedEntity" class="meta-item">
                <strong>关联数据：</strong>
                <a :href="previewItem.linkedEntity.url" target="_blank">{{ previewItem.linkedEntity.name }}</a>
              </div>
            </div>
            <div class="actions">
              <AButton v-if="updater" @click="startEditing">编辑</AButton>
              <AButton v-if="deleter" danger @click="deleteItem">删除</AButton>
            </div>
          </template>
          <template v-else-if="editingItem">
            <AForm :model="editingItem" layout="vertical" class="meta-edit">
              <AFormItem label="名称">
                <AInput v-model:value="editingItem.name" />
              </AFormItem>
              <AFormItem label="标签">
                <ASelect v-model:value="editingItem.tags" mode="tags" placeholder="输入并按回车添加标签" />
              </AFormItem>
            </AForm>
            <div class="actions">
              <AButton @click="cancelEditing">取消</AButton>
              <AButton type="primary" @click="saveChanges">保存</AButton>
            </div>
          </template>
        </div>
      </div>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, reactive, ref, watch, withDefaults, h } from 'vue'
import {
  message,
  Modal as AModal,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputSearch as AInputSearch,
  Select as ASelect,
  SelectOption as ASelectOption,
  Tag as ATag,
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Button as AButton,
  Image as AImage,
  Tabs as ATabs,
  TabPane as ATabPane,
  Spin as ASpin,
  Empty as AEmpty,
  Pagination as APagination,
  Upload as AUpload,
  Tooltip as ATooltip,
  Tree as ATree,
} from 'ant-design-vue'
import { DownOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  batchDeleteMedia,
  createCategory,
  deleteCategory,
  deleteMedia,
  fetchCategories,
  fetchMedia,
  updateCategory,
  updateMedia,
  uploadMedia
} from '#/api/system/media'

const FALLBACK_IMAGE_SRC = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMGYyZjUiLz48L3N2Zz4=`

type MediaType = 'image' | 'video'

/**
 * 媒体对象接口
 */
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
  // --- 扩展字段 ---
  tags?: string[]
  categoryId?: string | number
  // 关联的业务数据
  linkedEntity?: {
    name: string // e.g., '商品 "炫彩T恤"'
    url: string // e.g., '/admin/products/123'
  }
}

/**
 * 分类对象接口
 */
export interface Category {
  id: string | number
  name: string
  count?: number
  children?: Category[]
  parentId?: string | number
}

type SortKey = 'createdAtDesc' | 'createdAtAsc' | 'sizeDesc' | 'sizeAsc' | 'nameAsc' | 'nameDesc'

export interface FetchParams {
  page: number
  pageSize: number
  query?: string
  types?: MediaType[]
  sort?: SortKey
  categoryId?: string | number | null
  [key: string]: any
}

interface FetchResult {
  items: MediaItem[]
  total: number
}

const props = withDefaults(defineProps<{
  modelValue?: any
  multiple?: boolean
  max?: number
  types?: MediaType[]
  valueKey?: 'object' | 'url' | 'id'
  title?: string
  width?: number | string
  allowUpload?: boolean
  fetcher?: (params: FetchParams) => Promise<FetchResult>
  uploader?: (file: File, extra?: Record<string, any>) => Promise<MediaItem>
  // --- 新增 CRUD props ---
  updater?: (id: string | number, data: Partial<Omit<MediaItem, 'id'>>) => Promise<MediaItem>
  deleter?: (id: string | number) => Promise<void>
  batchDeleter?: (ids: (string | number)[]) => Promise<void>
  fetchCategories?: () => Promise<Category[]>
  createCategory?: (data: { name: string, parentId?: string | number }) => Promise<Category>,
  updateCategory?: (id: string | number, data: { name?: string, parentId?: string | number }) => Promise<Category>,
  deleteCategory?: (id: string | number) => Promise<void>,
  // --------------------
  pageSize?: number
  disabled?: boolean
}>(), {
  fetcher: fetchMedia,
  uploader: uploadMedia,
  updater: updateMedia,
  deleter: deleteMedia,
  batchDeleter: batchDeleteMedia,
  fetchCategories: fetchCategories,
  createCategory: createCategory,
  updateCategory: updateCategory,
  deleteCategory: deleteCategory,
  allowUpload: true,
})

const emits = defineEmits<{
  (e: 'update:modelValue', v: any): void
  (e: 'change', v: any): void
}>()

// #region 弹窗状态管理
const visible = ref(false)

function openModal() {
  if (props.disabled) return
  visible.value = true
}
function closeModal() {
  visible.value = false
}
// #endregion

// #region 过滤、排序、分页
const query = ref('')
const selectedTypes = ref<MediaType[]>(props.types ?? ['image', 'video'])
const sort = ref<SortKey>('createdAtDesc')
const pager = reactive({ page: 1, pageSize: props.pageSize ?? 24, total: 0 })

let searchTimer: number | null = null
function triggerSearch() {
  pager.page = 1
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(loadList, 300) as unknown as number
}
// #endregion

// #region 分类管理
const categories = ref<Category[]>([])
const expandedCategoryKeys = ref<(string|number)[]>([])
const categoryTree = computed(() => {
  const list: Category[] = JSON.parse(JSON.stringify(categories.value))
  const map: Record<string, number> = {}
  const roots: Category[] = []

  list.forEach((node, i) => {
    map[node.id] = i
    node.children = []
  })

  list.forEach(node => {
    if (node.parentId) {
      const parentIndex = map[node.parentId]
      if (parentIndex !== undefined && list[parentIndex]) {
        list[parentIndex].children?.push(node)
      } else {
        roots.push(node) // orphan, treat as root
      }
    } else {
      roots.push(node)
    }
  })
  return roots
})

const selectedCategoryId = ref<string | number | null>(null)
const selectedCategoryKeys = computed({
  get: () => selectedCategoryId.value !== null ? [selectedCategoryId.value] : [],
  set: (keys) => {
    selectedCategoryId.value = keys[0] ?? null
  }
})

function selectCategory(id: string | number | null) {
  selectedCategoryId.value = id
}

async function loadCategories() {
  if (!props.fetchCategories) return
  try {
    const flatCategories = await props.fetchCategories()
    categories.value = flatCategories
    // Expand root categories by default
    expandedCategoryKeys.value = flatCategories.filter(c => !c.parentId).map(c => c.id)
  } catch (e: any) {
    console.error(e)
    message.error(e?.message || '加载分类失败')
  }
}

async function handleAddCategory(parentId: string | number | null = null) {
  if (!props.createCategory) return;
  let newName = '';
  AModal.confirm({
    title: parentId ? '新建子分类' : '新建根分类',
    content: h('div', [
      h(AInput, {
        placeholder: '请输入分类名称',
        onChange: (e) => { newName = e.target.value; }
      })
    ]),
    async onOk() {
      if (!newName.trim()) {
        message.warn('分类名称不能为空');
        return Promise.reject('分类名称不能为空');
      }
      try {
        await props.createCategory!({ name: newName.trim(), parentId: parentId || undefined });
        message.success('创建成功');
        await loadCategories();
        if (parentId) {
          // expand parent to show the new category
          if (!expandedCategoryKeys.value.includes(parentId)) {
            expandedCategoryKeys.value.push(parentId)
          }
        }
      } catch (e: any) {
        console.error(e);
        message.error(e?.message || '创建失败');
        return Promise.reject(e);
      }
    }
  });
}

async function handleEditCategory(category: Category) {
  if (!props.updateCategory) return;
  let newName = category.name;
  AModal.confirm({
    title: '编辑分类',
    content: h('div', [
      h(AInput, {
        defaultValue: category.name,
        onChange: (e) => { newName = e.target.value; }
      })
    ]),
    async onOk() {
      if (!newName.trim()) {
        message.warn('分类名称不能为空');
        return Promise.reject('分类名称不能为空');
      }
      if (newName.trim() === category.name) {
        return; // No changes
      }
      try {
        await props.updateCategory!(category.id, { name: newName.trim() });
        message.success('更新成功');
        await loadCategories();
      } catch (e: any) {
        console.error(e);
        message.error(e?.message || '更新失败');
        return Promise.reject(e);
      }
    }
  });
}

async function handleDeleteCategory(category: Category) {
  if (!props.deleteCategory) return;
  const hasChildren = categories.value.some(c => c.parentId === category.id);
  if (hasChildren) {
    message.error('请先删除该分类下的所有子分类。');
    return;
  }
  AModal.confirm({
    title: '确认删除',
    content: `确定要删除分类 “${category.name}” 吗？分类下的媒体不会被删除。`,
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await props.deleteCategory!(category.id);
        message.success('删除成功');
        if (selectedCategoryId.value === category.id) {
          selectedCategoryId.value = null; // Reset if the active category is deleted
        }
        await loadCategories();
      } catch (e: any) {
        console.error(e);
        message.error(e?.message || '删除失败');
      }
    }
  });
}
// #endregion

// #region 列表数据
const loading = ref(false)
const items = ref<MediaItem[]>([])

async function loadList() {
  if (!props.fetcher) return
  loading.value = true
  try {
    const res = await props.fetcher({
      page: pager.page,
      pageSize: pager.pageSize,
      query: query.value || undefined,
      types: selectedTypes.value,
      sort: sort.value,
      categoryId: selectedCategoryId.value
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

onMounted(() => {
  loadList()
  loadCategories()
})
watch([selectedTypes, sort, selectedCategoryId], () => {
  pager.page = 1
  loadList()
})

function onPageChange(page: number, pageSize?: number) {
  pager.page = page
  if (pageSize && pageSize !== pager.pageSize) {
    pager.pageSize = pageSize
    pager.page = 1
  }
  loadList()
}
// #endregion

// #region 选择逻辑
const selectedMap = reactive<Map<string | number, MediaItem>>(new Map())
const selectedCount = computed(() => selectedMap.size)
const canSelectMore = computed(() => {
  if (!props.multiple) return selectedCount.value < 1
  if (props.max != null) return selectedCount.value < props.max
  return true
})

function toggleSelect(item: MediaItem) {
  const key = item.id
  if (selectedMap.has(key)) {
    selectedMap.delete(key)
    return
  }
  if (!props.multiple) {
    selectedMap.clear()
    selectedMap.set(key, item)
    return
  }
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
// #endregion

// #region 外部值处理与回显
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
  return null
})

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
// #endregion

// #region 上传
async function handleCustomUpload(options: any) {
  const { file, onSuccess, onError } = options
  if (!props.uploader) {
    onError?.(new Error('未配置 uploader'))
    return
  }
  try {
    const item = await props.uploader(file as File, {
      categoryId: selectedCategoryId.value || undefined
    })
    selectedMap.set(item.id, item)
    items.value = [item, ...items.value]
    pager.total += 1
    onSuccess?.(item)
  } catch (e) {
    console.error(e)
    onError?.(e)
  }
}
// #endregion

// #region 预览、编辑、删除
const previewVisible = ref(false)
const previewItem = ref<MediaItem | null>(null)
const isEditing = ref(false)
const editingItem = ref<Partial<MediaItem> | null>(null)

function openPreview(item: MediaItem) {
  previewItem.value = { ...item }
  isEditing.value = false
  editingItem.value = null
  previewVisible.value = true
}

function startEditing() {
  if (!previewItem.value) return
  editingItem.value = {
    name: previewItem.value.name,
    tags: previewItem.value.tags ? [...previewItem.value.tags] : []
  }
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editingItem.value = null
}

async function saveChanges() {
  if (!props.updater || !previewItem.value || !editingItem.value) return
  const id = previewItem.value.id
  const updates = editingItem.value
  try {
    const updatedItem = await props.updater(id, updates)
    const index = items.value.findIndex(i => i.id === id)
    if (index !== -1) {
      items.value[index] = updatedItem
    }
    previewItem.value = { ...updatedItem }
    isEditing.value = false
    message.success('更新成功')
  } catch (e: any) {
    console.error(e)
    message.error(e?.message || '更新失败')
  }
}

async function deleteItem() {
  if (!props.deleter || !previewItem.value) return
  AModal.confirm({
    title: '确认删除',
    content: `确定要删除媒体“${previewItem.value.name || '未命名'}”吗？此操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        const id = previewItem.value!.id
        await props.deleter!(id)
        items.value = items.value.filter(i => i.id !== id)
        selectedMap.delete(id)
        pager.total -= 1
        previewVisible.value = false
        message.success('删除成功')
      } catch (e: any) {
        console.error(e)
        message.error(e?.message || '删除失败')
      }
    }
  })
}
// #endregion

// #region 批量操作
async function handleBatchAction({ key }: { key: string }) {
  if (key === 'delete') {
    await batchDelete()
  }
}

async function batchDelete() {
  if (!props.batchDeleter || selectedMap.size === 0) return
  const ids = Array.from(selectedMap.keys())
  AModal.confirm({
    title: '批量删除',
    content: `确定要删除选中的 ${ids.length} 个媒体项吗？此操作不可撤销。`,
    okText: '全部删除',
    okType: 'danger',
    async onOk() {
      try {
        await props.batchDeleter!(ids)
        message.success(`成功删除 ${ids.length} 项`)
        selectedMap.clear()
        loadList() // 重新加载当前页
      } catch (e: any) {
        console.error(e)
        message.error(e?.message || '批量删除失败')
      }
    }
  })
}
// #endregion
</script>


<style scoped>
.media-picker { display: flex; flex-direction: column; gap: 8px; }
.mp-selected-preview { background: #fafafa; border: 1px solid #f0f0f0; padding: 8px; border-radius: 6px; }
.mp-selected-title { font-size: 12px; color: #999; margin-bottom: 6px; }
.mp-selected-list { display: flex; gap: 8px; flex-wrap: wrap; }
.mp-thumb { width: 64px; height: 64px; overflow: hidden; border-radius: 4px; border: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: center; }
.mp-video-thumb { position: relative; width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; }
.mp-video-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp-video-thumb.large { width: 100%; height: 160px; }
.mp-badge { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.65); color: #fff; font-size: 10px; padding: 2px 4px; border-radius: 3px; }

:deep(.media-picker-modal .ant-modal) {
  top: 20px;
  height: calc(100vh - 40px);
}

:deep(.media-picker-modal .ant-modal-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.media-picker-modal .ant-modal-body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
}

.mp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.mp-toolbar-right { display: flex; gap: 8px; }

.mp-body-layout {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  flex-grow: 1;
  min-height: 0;
}
.mp-sidebar { width: 200px; flex-shrink: 0; border-right: 1px solid #f0f0f0; overflow-y: auto; }
.mp-sidebar .ant-menu { border-right: none; }
.mp-sidebar .cat-count { color: #999; font-size: 12px; flex-shrink: 0; margin-left: 8px; }
.mp-main-content { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; }
.mp-main-content .ant-tabs { flex-grow: 1; display: flex; flex-direction: column; }
:deep(.mp-main-content .ant-tabs-content-holder) { flex-grow: 1; overflow: hidden; }
:deep(.mp-main-content .ant-tabs-tabpane) { height: 100%; display: flex; flex-direction: column; }

.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding-right: 8px; }
.mp-card { border: 1px solid #f0f0f0; border-radius: 6px; cursor: pointer; transition: all .15s ease; background: #fff; overflow: hidden; display: flex; flex-direction: column; }
.mp-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.mp-card.is-selected { border-color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.15); }
.mp-card-img { position: relative; width: 100%; height: 160px; display: block; overflow: hidden; line-height: 0; z-index: 0; }
:deep(.mp-card-img .ant-image-img) { position: static; width: 100%; height: 100%; object-fit: cover; display: block; }
:deep(.mp-card .ant-image) { width: 100%; height: 160px; display: block; line-height: 0; }
.mp-card .mp-card-meta { background-color: white; display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; position: relative; z-index: 1; }
.mp-card .name { max-width: 120px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #333; font-size: 12px; }
.mp-card .action { font-size: 12px; }

.mp-pagination { display: flex; justify-content: flex-end; margin-top: 12px; flex-shrink: 0; }
.pane-content {
    width: 100%;
    height: 300px;
}
.media-grid {
    height: 300px;
    overflow-y: auto;
}
.mp-scroll-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.upload-tab-pane {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 24px;
}
:deep(.mp-uploader.ant-upload-wrapper) {
  width: 100%;
}
:deep(.mp-uploader .ant-upload.ant-upload-select) {
  width: 100%;
  height: 200px;
}

.mp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.mp-footer .left { display: flex; align-items: center; gap: 8px; }
.mp-footer .left .tip { color: #999; font-size: 12px; }
.danger-action { color: #ff4d4f; }

.mp-preview-body { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; max-height: 70vh; }
.mp-preview-body .media-display { background: #f0f2f5; display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: auto; min-height: 400px; }
.mp-preview-body .media-display .ant-image,
.mp-preview-body .media-display video { max-height: 65vh; object-fit: contain; }
.mp-preview-body .meta-panel { display: flex; flex-direction: column; height: 100%; max-height: 70vh; }
.meta-view { flex-grow: 1; overflow-y: auto; padding-bottom: 16px; }
.meta-item { margin-bottom: 12px; }
.meta-item strong { margin-right: 8px; color: #666; }
.meta-edit { flex-grow: 1; overflow-y: auto; padding-bottom: 16px; }
.actions { flex-shrink: 0; display: flex; gap: 8px; border-top: 1px solid #f0f0f0; padding-top: 16px; margin-top: 16px; }

.mp-single-preview-trigger {
  border: 1px solid #f0f0f0;
  padding: 8px;
  border-radius: 6px;
  background: #fafafa;
  display: inline-block;
  line-height: 0;
  cursor: pointer;
  transition: border-color .2s;
}
.mp-single-preview-trigger:hover {
  border-color: #1677ff;
}
.mp-single-preview-trigger .ant-image {
  border-radius: 4px;
}

.category-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.mp-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 16px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}
.mp-sidebar .ant-menu-item {
  padding-right: 12px;
}
.category-item .category-name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.category-item .category-extra {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}
.category-actions {
  display: none;
  gap: 12px;
  color: #666;
}
.category-actions > .anticon:hover {
  color: #1677ff;
}
.category-item:hover .cat-count {
  display: none;
}

.mp-category-list {
  padding-right: 8px;
}
.category-tree.ant-tree {
  background: transparent;
}
:deep(.category-tree .ant-tree-treenode) {
  padding: 0;
  display: flex;
  align-items: center;
  width: 100%;
}
:deep(.category-tree .ant-tree-node-content-wrapper) {
  flex: 1;
  min-width: 0;
  padding: 5px 16px;
  border-radius: 6px;
  transition: background-color .2s, color .2s;
}
:deep(.category-tree .ant-tree-node-content-wrapper:hover) {
  background-color: #f0f0f0;
}
:deep(.category-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper) {
  background-color: #e6f4ff;
  color: #1677ff;
}
:deep(.category-tree .ant-tree-switcher) {
  width: 24px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.category-tree .ant-tree-treenode .category-item-content) {
  padding: 0;
}
.mp-category-list .category-item {
  padding: 5px 16px;
  cursor: pointer;
  border-radius: 6px;
}
.mp-category-list .category-item.ant-menu-item-selected {
  background-color: #e6f4ff;
  color: #1677ff;
}
.mp-category-list .category-item:hover {
  background-color: #f0f0f0;
}
:deep(.category-tree .ant-tree-treenode:hover .category-actions) {
  display: flex;
}
</style>
