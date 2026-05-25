<script setup lang="ts">
type Variant = 'primary' | 'ghost' | 'glass' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    block?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    ariaLabel?: string;
  }>(),
  {
    variant: 'glass',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
  },
);
</script>

<template>
  <button
    class="btn tap"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--disabled': disabled }]"
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-family: var(--font-ui);
  white-space: nowrap;
  user-select: none;
}

.btn--sm {
  padding: 8px 14px;
  font-size: 13px;
  min-height: 36px;
}
.btn--md {
  padding: 11px 20px;
  font-size: 14px;
  min-height: 44px;
}
.btn--lg {
  padding: 14px 26px;
  font-size: 16px;
  min-height: 52px;
}

.btn--block {
  width: 100%;
}

.btn--primary {
  background: var(--grad-primary);
  color: white;
  border: 1px solid transparent;
  box-shadow: 0 8px 24px -8px rgba(34, 211, 238, 0.25);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-2);
  border: 1px solid transparent;
}
.btn--ghost:hover {
  color: var(--color-text-1);
  background: var(--color-surface-1);
}

.btn--glass {
  background: var(--color-surface-2);
  color: var(--color-text-1);
  border: 1px solid var(--color-border-1);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}

.btn--outline {
  background: transparent;
  color: var(--color-text-1);
  border: 1px solid var(--color-border-2);
}

.btn--danger {
  background: color-mix(in oklch, var(--color-rose) 22%, transparent);
  color: color-mix(in oklch, var(--color-rose) 80%, white);
  border: 1px solid color-mix(in oklch, var(--color-rose) 40%, transparent);
}

.btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
