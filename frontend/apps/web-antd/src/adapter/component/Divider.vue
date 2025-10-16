<template>
  <div class="mt-8 mb-3 w-full flex items-center">
    <CaretRightOutlined class="text-blue-500" />
    <span
      class="text-[14px] text-blue-500"
      >{{ label }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { CaretRightOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
});
</script>

<style scoped></style>
