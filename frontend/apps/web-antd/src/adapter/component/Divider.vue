<template>
  <divider orientation="left">{{ label }}</divider>
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
