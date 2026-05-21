<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    color?: string;
    playing?: boolean;
    size?: number;
  }>(),
  { color: 'currentColor', playing: true, size: 18 },
);

const heightPx = computed(() => `${props.size}px`);
const idleBarHeight = computed(() => `${props.size * 0.45}px`);
</script>

<template>
  <span
    v-if="!playing"
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      color,
      height: heightPx,
    }"
  >
    <span
      v-for="i in 4"
      :key="i"
      :style="{
        display: 'inline-block',
        width: '3px',
        height: idleBarHeight,
        background: 'currentColor',
        borderRadius: '2px',
        opacity: 0.4,
      }"
    />
  </span>
  <span
    v-else
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      color,
      height: heightPx,
    }"
  >
    <span class="wave-bar" :style="{ height: heightPx }" />
    <span class="wave-bar" :style="{ height: heightPx }" />
    <span class="wave-bar" :style="{ height: heightPx }" />
    <span class="wave-bar" :style="{ height: heightPx }" />
  </span>
</template>
