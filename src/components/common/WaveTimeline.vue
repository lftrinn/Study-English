<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    progress?: number;
    bars?: number;
    color?: string;
    track?: string;
    height?: number;
  }>(),
  {
    progress: 0,
    bars: 26,
    color: 'var(--color-cyan)',
    track: 'var(--color-surface-3)',
    height: 36,
  },
);

const barHeights = computed(() => {
  const arr: number[] = [];
  for (let i = 0; i < props.bars; i += 1) {
    const h = 6 + Math.abs(Math.sin(i * 0.9)) * 18 + ((i * 5) % 6) * 2;
    arr.push(Math.min(h, props.height - 4));
  }
  return arr;
});

const playedCount = computed(() =>
  Math.round(Math.max(0, Math.min(1, props.progress)) * props.bars),
);
const headLeft = computed(() => `${Math.max(0, Math.min(100, props.progress * 100))}%`);
</script>

<template>
  <div
    :style="{
      flex: 1,
      minWidth: 0,
      height: `${height}px`,
      position: 'relative',
    }"
  >
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '2.5px',
        height: '100%',
      }"
    >
      <span
        v-for="(h, i) in barHeights"
        :key="i"
        :style="{
          flex: 1,
          height: `${h}px`,
          background: i < playedCount ? color : track,
          borderRadius: '2px',
          transition: 'background .2s ease',
        }"
      />
    </div>
    <div
      :style="{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `calc(${headLeft} - 1px)`,
        width: '2px',
        background: color,
        borderRadius: '2px',
        boxShadow: `0 0 8px ${color}`,
        opacity: progress > 0 && progress < 1 ? 1 : 0,
        transition: 'left .15s linear, opacity .2s ease',
      }"
    />
  </div>
</template>
