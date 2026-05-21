<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'glass' | 'glass-strong' | 'solid';
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }>(),
  { variant: 'glass', padding: 'md' },
);
</script>

<template>
  <div class="card" :class="[`card--${variant}`, `card--p-${padding}`]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-lg);
  position: relative;
}
.card--glass {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.card--glass-strong {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-border-2);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}
[data-theme='light'] .card--glass-strong {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
}
.card--solid {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
}

.card--p-none {
  padding: 0;
}
.card--p-sm {
  padding: 12px;
}
.card--p-md {
  padding: 16px;
}
.card--p-lg {
  padding: 20px;
}
</style>
