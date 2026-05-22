<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    size?: number;
    stroke?: number;
    trackColor?: string;
    color?: string;
    showLabel?: boolean;
  }>(),
  {
    size: 64,
    stroke: 6,
    trackColor: 'rgba(255,255,255,0.08)',
    color: 'var(--color-cyan)',
    showLabel: true,
  },
);

const pct = computed(() => Math.max(0, Math.min(1, props.value)));
const radius = computed(() => (props.size - props.stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dash = computed(() => `${circumference.value * pct.value} ${circumference.value}`);
const center = computed(() => props.size / 2);
const label = computed(() => `${Math.round(pct.value * 100)}%`);
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="ring-center">
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="trackColor"
        :stroke-width="stroke"
        fill="none"
      />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="color"
        :stroke-width="stroke"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        style="transition: stroke-dasharray 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)"
      />
    </svg>
    <div v-if="$slots.default" class="ring__slot">
      <slot />
    </div>
    <span v-else-if="showLabel" class="ring__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}
.ring__label {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-1);
}
.ring__slot {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
}
</style>
