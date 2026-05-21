<script setup lang="ts">
import { computed } from 'vue';
import type { ChunkLevel } from '@/types/chunk';

const props = defineProps<{ level: ChunkLevel }>();

const COLORS: Record<ChunkLevel, string> = {
  A1: '#7DD3FC',
  A2: '#A78BFA',
  B1: '#FB923C',
};

const tone = computed(() => COLORS[props.level]);
</script>

<template>
  <span
    class="pill mono"
    :style="{
      color: tone,
      background: `color-mix(in oklch, ${tone} 22%, transparent)`,
      borderColor: `color-mix(in oklch, ${tone} 35%, transparent)`,
    }"
  >{{ level }}</span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-family: var(--font-mono);
  border: 1px solid;
}
</style>
