<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    color?: string;
    mono?: boolean;
  }>(),
  { color: 'var(--color-text-1)', mono: false },
);
</script>

<template>
  <div
    class="glass"
    :style="{ padding: '12px 0', textAlign: 'center' }"
  >
    <div
      :class="mono ? 'mono' : ''"
      :style="{ fontSize: '20px', fontWeight: 700, color: props.color }"
    >{{ value }}</div>
    <div
      :style="{
        fontSize: '10px',
        color: 'var(--color-text-3)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        marginTop: '2px',
      }"
    >{{ label }}</div>
  </div>
</template>
