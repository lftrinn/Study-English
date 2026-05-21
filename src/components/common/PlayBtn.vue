<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

type Variant = 'gradient' | 'ghost';

const props = withDefaults(
  defineProps<{
    playing?: boolean;
    size?: number;
    variant?: Variant;
  }>(),
  { playing: false, size: 56, variant: 'gradient' },
);

const emit = defineEmits<{ click: [] }>();

const iconSize = computed(() => Math.round(props.size * 0.42));
const iconColor = computed(() => (props.variant === 'gradient' ? '#fff' : 'var(--color-text-1)'));
const iconShadow = computed(() =>
  props.variant === 'gradient'
    ? { filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.25))' }
    : {},
);
const rootStyle = computed(() => {
  const common = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    position: 'relative' as const,
  };
  if (props.variant === 'gradient') {
    return {
      ...common,
      background: 'var(--grad-primary)',
      boxShadow:
        '0 10px 28px rgba(34, 211, 238, 0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
    };
  }
  return {
    ...common,
    background: 'var(--color-surface-3)',
    boxShadow: '0 0 0 1px var(--color-border-1) inset',
  };
});
</script>

<template>
  <button class="btn tap" :style="rootStyle" :aria-label="playing ? 'Pause' : 'Play'" @click="emit('click')">
    <span
      v-if="variant === 'gradient'"
      :style="{
        position: 'absolute',
        inset: '1px',
        borderRadius: '50%',
        pointerEvents: 'none',
        background:
          'radial-gradient(60% 55% at 30% 22%, rgba(255,255,255,0.4), transparent 70%)',
      }"
    />
    <Icon
      :name="playing ? 'pause' : 'play'"
      :size="iconSize"
      :style="{
        color: iconColor,
        marginLeft: playing ? '0' : '2px',
        ...iconShadow,
      }"
    />
  </button>
</template>
