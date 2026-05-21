<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps<{
  color: string;
  icon: string;
  label: string;
}>();

const rootStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  background: `color-mix(in oklch, ${props.color} 16%, transparent)`,
  border: `1px solid color-mix(in oklch, ${props.color} 30%, transparent)`,
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
  color: props.color,
}));
</script>

<template>
  <div :style="rootStyle">
    <Icon :name="icon" :size="14" />
    {{ label }}
  </div>
</template>
