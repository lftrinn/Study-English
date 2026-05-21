<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(
  defineProps<{
    color: string;
    icon: string;
    label: string;
    sublabel?: string;
    radius?: number;
  }>(),
  { radius: 16 },
);

const rootStyle = computed(() => ({
  padding: '16px',
  borderRadius: `${props.radius}px`,
  background: `linear-gradient(135deg, color-mix(in oklch, ${props.color} 18%, transparent), color-mix(in oklch, ${props.color} 5%, transparent))`,
  border: `1px solid color-mix(in oklch, ${props.color} 24%, transparent)`,
}));

const badgeBg = computed(
  () => `color-mix(in oklch, ${props.color} 30%, transparent)`,
);
</script>

<template>
  <div :style="rootStyle">
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }"
    >
      <div :style="{ display: 'inline-flex', alignItems: 'center', gap: '8px' }">
        <div
          :style="{
            width: '24px',
            height: '24px',
            borderRadius: '7px',
            background: badgeBg,
            display: 'grid',
            placeItems: 'center',
            color,
          }"
        >
          <Icon :name="icon" :size="13" />
        </div>
        <span
          :style="{
            fontSize: '11px',
            fontWeight: 700,
            color,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
          }"
        >{{ label }}</span>
      </div>
      <span
        v-if="sublabel"
        :style="{
          fontSize: '10px',
          fontWeight: 700,
          color,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          opacity: 0.7,
        }"
      >{{ sublabel }}</span>
    </div>
    <slot />
  </div>
</template>
