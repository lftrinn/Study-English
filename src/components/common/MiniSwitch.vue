<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    accent?: string;
    size?: 'sm' | 'md';
  }>(),
  { accent: 'var(--color-cyan)', size: 'md' },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const widths = props.size === 'sm' ? { w: 30, h: 18, knob: 14, on: 14, off: 2 } : { w: 42, h: 26, knob: 20, on: 19, off: 3 };

function toggle(e: Event) {
  e.stopPropagation();
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <button
    class="btn tap"
    type="button"
    :aria-pressed="modelValue"
    :style="{
      width: `${widths.w}px`,
      height: `${widths.h}px`,
      borderRadius: '99px',
      background: modelValue ? accent : 'var(--color-surface-3)',
      position: 'relative',
      transition: 'background .15s ease',
      flexShrink: 0,
    }"
    @click="toggle"
  >
    <span
      :style="{
        position: 'absolute',
        top: `${widths.off}px`,
        left: modelValue ? `${widths.on}px` : `${widths.off}px`,
        width: `${widths.knob}px`,
        height: `${widths.knob}px`,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left .15s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,.2)',
      }"
    />
  </button>
</template>
