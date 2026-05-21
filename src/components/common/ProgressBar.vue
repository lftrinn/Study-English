<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    max?: number;
    color?: string;
    height?: number;
    bg?: string;
  }>(),
  {
    max: 100,
    color: 'var(--grad-primary)',
    height: 6,
    bg: 'var(--color-surface-2)',
  },
);

const pct = computed(() => Math.max(0, Math.min(100, (props.value / props.max) * 100)));
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: `${height}px`,
      background: bg,
      borderRadius: '999px',
      overflow: 'hidden',
    }"
  >
    <div
      :style="{
        width: `${pct}%`,
        height: '100%',
        background: color,
        borderRadius: '999px',
        transition: 'width .35s ease',
      }"
    />
  </div>
</template>
