<template>
  <div class="qr-code-container">
    <a-image
      v-if="qrCodeUrl"
      :width="size"
      :height="size"
      :src="qrCodeUrl"
      :preview="true"
    />
    <div v-else :style="{ width: size + 'px', height: size + 'px' }" class="qr-code-placeholder">
      <span v-if="!modelValue">No data</span>
      <span v-else>Generating...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue';
import QRCode from 'qrcode';
import { Image as AImage } from 'ant-design-vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 128,
  },
});

const qrCodeUrl = ref('');

watchEffect(async () => {
  if (props.modelValue) {
    try {
      // Generate a higher resolution QR code for better quality on preview
      qrCodeUrl.value = await QRCode.toDataURL(props.modelValue, {
        width: props.size * 2,
        margin: 1,
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      qrCodeUrl.value = ''; // Clear the URL on error
    }
  } else {
    qrCodeUrl.value = '';
  }
});
</script>

<style scoped>
.qr-code-container {
  display: inline-block;
  border: 1px solid #d9d9d9;
  padding: 4px;
  border-radius: 4px;
}

.qr-code-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #bfbfbf;
}
</style>
