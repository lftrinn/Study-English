<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(
  defineProps<{
    icon: string;
    active?: boolean;
    size?: number;
    iconSize?: number;
    color?: string;
    ariaLabel?: string;
  }>(),
  { active: false, size: 40, iconSize: 18 },
);

const emit = defineEmits<{ click: [] }>();

const rootStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: '12px',
  display: 'grid',
  placeItems: 'center',
  background: props.active ? 'var(--color-surface-3)' : 'transparent',
  color: props.color ?? (props.active ? 'var(--color-cyan)' : 'var(--color-text-2)'),
}));
</script>

<template>
  <button class="btn tap" :aria-label="ariaLabel" :style="rootStyle" @click="emit('click')">
    <Icon :name="icon" :size="iconSize" />
  </button>
</template>
