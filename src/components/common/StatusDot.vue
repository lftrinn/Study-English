<script setup lang="ts">
import { computed } from 'vue';

type Status = 'new' | 'learning' | 'familiar' | 'mastered';

const props = withDefaults(
  defineProps<{
    status: Status | string;
    withLabel?: boolean;
  }>(),
  { withLabel: false },
);

const label = computed(() => {
  const map: Record<string, string> = {
    new: 'New',
    learning: 'Learning',
    familiar: 'Familiar',
    mastered: 'Mastered',
  };
  return map[props.status] ?? props.status;
});

const dotClass = computed(() => `dot dot-${props.status}`);
</script>

<template>
  <span
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: 'var(--color-text-3)',
    }"
  >
    <span :class="dotClass" />
    <span v-if="withLabel">{{ label }}</span>
  </span>
</template>
