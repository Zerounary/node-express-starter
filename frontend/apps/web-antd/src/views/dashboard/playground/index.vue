<template>

  <PageContainer>
    <div class="playground-grid">
      <ACard title="MediaPicker Playground">
        <AForm
          :model="formState"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
        >
          <AFormItem label="Single Image (Object)">
            <MediaPicker v-model="formState.cover" />
          </AFormItem>

          <AFormItem label="Multiple Images (URL)">
            <MediaPicker
              v-model="formState.gallery"
              multiple
              :max="9"
              value-key="url"
            />
          </AFormItem>

          <AFormItem label="Single Video (ID)">
            <MediaPicker
              v-model="formState.video"
              value-key="id"
              :types="['video']"
            />
          </AFormItem>

          <AFormItem label="Disabled Picker">
            <MediaPicker v-model="formState.disabledAsset" disabled />
          </AFormItem>

          <AFormItem label="Custom Trigger">
            <MediaPicker v-model="formState.customTriggerAsset">
              <template #trigger="{ open }">
                <AButton type="dashed" @click="open">
                  <template #icon><UploadOutlined /></template>
                  Click to open library
                </AButton>
              </template>
            </MediaPicker>
          </AFormItem>
        </AForm>
      </ACard>

      <ACard title="FkPicker外键选择">
        <FkPicker v-model="formState.tableId" table="table" />
        <FkPicker class="mt-3" mode="multiple" v-model="formState.tableIds" table="table" />
      </ACard>

      <div class="right-column">
        <ACard title="QRCode Playground" class="component-card">
          <AFormItem label="QR Code Content">
            <AInput
              v-model:value="formState.qrCodeValue"
              placeholder="Enter text for QR code"
            />
          </AFormItem>
          <QRCode :model-value="formState.qrCodeValue" :size="150" />
        </ACard>

        <ACard title="RichText Playground" class="component-card">
          <RichText v-model="formState.richTextContent" />
        </ACard>
      </div>
    </div>

    <ACard
      title="地址选择器 (LocatePicker) Playground"
      :style="{ marginTop: '24px' }"
    >
      <ASpace direction="vertical" size="large" style="width: 100%">
        <!-- 基础用法 -->
        <div>
          <h3>基础用法（三级联动）</h3>
          <LocatePicker
            v-model="formState.basicValue"
            placeholder="请选择省市区"
            @change="handleBasicChange"
          />
          <p>选中值: {{ formState.basicValue }}</p>
          <p>完整地址: {{ formState.basicFullAddress }}</p>
        </div>

        <!-- 只选择到市级 -->
        <div>
          <h3>只选择到市级</h3>
          <LocatePicker
            v-model="formState.cityValue"
            :level="2"
            placeholder="请选择省市"
            @change="handleCityChange"
          />
          <p>选中值: {{ formState.cityValue }}</p>
        </div>

        <!-- 只选择省份 -->
        <div>
          <h3>只选择省份</h3>
          <LocatePicker
            v-model="formState.provinceValue"
            :level="1"
            placeholder="请选择省份"
            @change="handleProvinceChange"
          />
          <p>选中值: {{ formState.provinceValue }}</p>
        </div>

        <!-- 禁用状态 -->
        <div>
          <h3>禁用状态</h3>
          <LocatePicker
            v-model="formState.disabledValue"
            disabled
            placeholder="禁用状态"
          />
        </div>

        <!-- 不同尺寸 -->
        <div>
          <h3>不同尺寸</h3>
          <ASpace direction="vertical" size="middle">
            <LocatePicker
              v-model="formState.sizeValue"
              size="large"
              placeholder="大尺寸"
            />
            <LocatePicker
              v-model="formState.sizeValue"
              size="middle"
              placeholder="中等尺寸"
            />
            <LocatePicker
              v-model="formState.sizeValue"
              size="small"
              placeholder="小尺寸"
            />
          </ASpace>
        </div>

        <!-- 表单中使用 -->
        <div>
          <h3>在表单中使用</h3>
          <AForm
            :model="formState.addressForm"
            :rules="addressFormRules"
            layout="vertical"
            @finish="handleAddressSubmit"
          >
            <AFormItem label="收货地址" name="address" required>
              <LocatePicker
                v-model="formState.addressForm.address"
                placeholder="请选择收货地址"
              />
            </AFormItem>

            <AFormItem label="详细地址" name="detailAddress">
              <AInput
                v-model:value="formState.addressForm.detailAddress"
                placeholder="请输入详细地址"
              />
            </AFormItem>

            <AFormItem>
              <AButton type="primary" html-type="submit"> 提交 </AButton>
            </AFormItem>
          </AForm>
        </div>
      </ASpace>
    </ACard>

    <ACard title="Dependencies Playground" :style="{ marginTop: '24px' }">
      <DependencyForm />
    </ACard>

    <ACard title="Items Playground" :style="{ marginTop: '24px' }">
      <Items :tabs="itemsTabs" />
    </ACard>

    <ACard title="Form State" :style="{ marginTop: '24px' }">
      <pre>{{ JSON.stringify(formState, null, 2) }}</pre>
    </ACard>
  </PageContainer>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import {
  Card as ACard,
  Form as AForm,
  FormItem as AFormItem,
  Button as AButton,
  Input as AInput,
  Space as ASpace,
  message,
} from 'ant-design-vue';
import MediaPicker, {
  type MediaItem,
  type FetchParams,
} from '#/adapter/component/MediaPicker.vue';
import QRCode from '#/adapter/component/QRCode.vue';
import RichText from '#/adapter/component/RichText.vue';
import LocatePicker from '#/adapter/component/LocatePicker.vue';
import { useVbenForm } from '#/adapter/form';
import { applyDependencies } from '#/utils';
import Items from '#/adapter/component/Items.vue';
import FkPicker from '#/adapter/component/FkPicker.vue';

const itemsTabs = [
  { key: 'column', table: 'column', title: 'Column', parentKey: 'tableId' },
];

const formState = reactive({
  cover: null,
  gallery: [],
  video: null,
  disabledAsset: {
    id: 18,
    tenantId: 1,
    type: 'image',
    url: 'https://jhtcdn-1252100135.cos.ap-chengdu.myqcloud.com/uploads/t_1/u_1/1756364691881-454053845.png',
    thumbUrl: null,
    name: 'ç½åçè.png',
    size: 89705,
    width: null,
    height: null,
    duration: null,
    tags: null,
    meta: null,
    categoryId: 1,
    linkedEntityName: null,
    linkedEntityUrl: null,
    createdAt: '2025-08-28T07:04:52.000Z',
    updatedAt: '2025-08-28T07:04:52.000Z',
    createdBy: null,
    updatedBy: null,
    isActive: true,
  },
  customTriggerAsset: null,
  qrCodeValue: 'https://www.tencent.com',
  richTextContent:
    '<h1>Hello, Rich Text!</h1><p>This is a basic example of the RichText component.</p>',
  // LocatePicker 相关状态
  basicValue: ['150000', '150200', '150203'] as string[],
  basicFullAddress: '',
  cityValue: [] as string[],
  tableId: null,
  tableIds: [],
  provinceValue: ['150000'] as string[],
  disabledValue: ['440000', '440300', '440304'] as string[],
  sizeValue: [] as string[],
  addressForm: {
    address: [] as string[],
    detailAddress: '',
  },
});

const rawDependencySchemas = [
  {
    fieldName: 'name',
    label: 'Name',
    component: 'Input',
    required: true,
  },
  {
    fieldName: 'description',
    label: 'Description',
    component: 'Input',
    dependencies: {
      triggerFields: ['name'],
      show: 'values.name && values.name.length > 0',
      disabled: 'values.name !== "enable"',
    },
  },
].map((col) => applyDependencies(col));

console.log('rawDependencySchemas:', rawDependencySchemas);

const [DependencyForm, formApi] = useVbenForm({
  schema: [...rawDependencySchemas],
});

// LocatePicker 处理函数
const handleBasicChange = (value: string[], selectedOptions: any[]) => {
  console.log('Basic change:', value, selectedOptions);
  formState.basicFullAddress = selectedOptions.map((opt) => opt.label).join('');
};

const handleCityChange = (value: string[], selectedOptions: any[]) => {
  console.log('City change:', value, selectedOptions);
};

const handleProvinceChange = (value: string[], selectedOptions: any[]) => {
  console.log('Province change:', value, selectedOptions);
};

const addressFormRules = {
  address: [{ required: true, message: '请选择收货地址', trigger: 'change' }],
};

const handleAddressSubmit = (values: any) => {
  console.log('Form submit:', values);
  message.success('提交成功！');
};
</script>

<style scoped>
.playground-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.component-card {
  flex: 1;
}

pre {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
