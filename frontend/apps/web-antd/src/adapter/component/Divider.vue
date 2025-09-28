<template>
  <divider orientation="left"><span class="text-blue-500">{{ label }}</span></divider>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { Divider } from 'ant-design-vue';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
});
</script>

<style scoped></style>
