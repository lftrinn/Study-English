<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

type Variant = 'glass' | 'solid' | 'gradient';

const props = withDefaults(
  defineProps<{
    icon: string;
    color?: string;
    size?: number;
    radius?: number;
    halo?: boolean;
    variant?: Variant;
    gradient?: string;
  }>(),
  {
    color: '#22D3EE',
    size: 44,
    halo: true,
    variant: 'glass',
  },
);

const r = computed(() => props.radius ?? Math.round(props.size * 0.3));
const iconPx = computed(() => Math.round(props.size * 0.5));

const rootStyle = computed(() => {
  const base = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: `${r.value}px`,
    display: 'grid',
    placeItems: 'center',
    position: 'relative' as const,
    overflow: 'hidden',
  };
  if (props.variant === 'solid') {
    return {
      ...base,
      background: props.color,
      boxShadow: `0 8px 22px color-mix(in oklch, ${props.color} 40%, transparent), 0 1px 0 rgba(255,255,255,0.3) inset, 0 -1px 0 rgba(0,0,0,0.18) inset`,
    };
  }
  if (props.variant === 'gradient') {
    return {
      ...base,
      background: props.gradient ?? 'var(--grad-primary)',
      boxShadow:
        '0 8px 22px rgba(34,211,238,0.3), 0 1px 0 rgba(255,255,255,0.35) inset',
    };
  }
  return {
    ...base,
    background: `linear-gradient(160deg, color-mix(in oklch, ${props.color} 24%, transparent), color-mix(in oklch, ${props.color} 8%, transparent))`,
    border: `1px solid color-mix(in oklch, ${props.color} 28%, transparent)`,
    boxShadow: `0 6px 18px color-mix(in oklch, ${props.color} 18%, transparent), 0 1px 0 rgba(255,255,255,0.05) inset`,
  };
});

const isFilled = computed(() => props.variant !== 'glass');
const iconColor = computed(() => (isFilled.value ? '#fff' : props.color));
const iconShadow = computed(() =>
  isFilled.value ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))' : 'none',
);
const haloStyle = computed(() => ({
  position: 'absolute' as const,
  inset: 0,
  pointerEvents: 'none' as const,
  background:
    props.variant === 'glass'
      ? `radial-gradient(65% 55% at 28% 18%, color-mix(in oklch, ${props.color} 35%, transparent), transparent 70%)`
      : 'radial-gradient(60% 55% at 30% 22%, rgba(255,255,255,0.35), transparent 70%)',
}));
</script>

<template>
  <div :style="rootStyle">
    <span v-if="halo || isFilled" :style="haloStyle" />
    <Icon
      :name="icon"
      :size="iconPx"
      :style="{ color: iconColor, filter: iconShadow, position: 'relative', zIndex: 1 }"
    />
  </div>
</template>
