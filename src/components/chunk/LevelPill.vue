<script setup lang="ts">
import { computed } from 'vue';
import type { ChunkLevel } from '@/types/chunk';

const props = defineProps<{ level: ChunkLevel }>();

const tone = computed(() => {
  switch (props.level) {
    case 'A1':
      return 'var(--color-emerald)';
    case 'A2':
      return 'var(--color-cyan)';
    case 'B1':
    default:
      return 'var(--color-violet)';
  }
});
</script>

<template>
  <span class="pill" :style="{ color: tone, borderColor: tone }">{{ level }}</span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid currentColor;
  background: color-mix(in oklch, currentColor 12%, transparent);
}
</style>
