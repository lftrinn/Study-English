<script setup lang="ts">
import Icon from './Icon.vue';

defineProps<{
  icon?:
    | 'search'
    | 'sparkles'
    | 'list'
    | 'flashcard'
    | 'flame'
    | 'star'
    | 'queue'
    | 'message'
    | 'lightning'
    | 'check'
    | 'clock'
    | 'mic'
    | 'ear'
    | 'puzzle'
    | 'pencil'
    | 'trophy';
  title: string;
  hint?: string;
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
}>();
</script>

<template>
  <div class="empty">
    <div class="empty__halo" :class="`empty__halo--${tone ?? 'cyan'}`">
      <div class="empty__halo-ring" aria-hidden="true" />
      <span class="empty__halo-icon">
        <Icon :name="icon ?? 'sparkles'" :size="24" />
      </span>
    </div>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="hint" class="empty__hint">{{ hint }}</p>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 40px 24px;
  max-width: 360px;
  margin: 0 auto;
}

.empty__halo {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 6px;
}
.empty__halo-ring {
  position: absolute;
  inset: -8px;
  border-radius: 28px;
  border: 1px dashed var(--c, color-mix(in oklch, var(--color-cyan) 50%, transparent));
  opacity: 0.5;
}
.empty__halo-icon {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  background: color-mix(in oklch, var(--c, var(--color-cyan)) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--c, var(--color-cyan)) 30%, transparent);
  color: var(--c, var(--color-cyan));
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.empty__halo--cyan {
  --c: var(--color-cyan);
}
.empty__halo--violet {
  --c: var(--color-violet);
}
.empty__halo--emerald {
  --c: var(--color-emerald);
}
.empty__halo--amber {
  --c: var(--color-amber);
}
.empty__halo--rose {
  --c: var(--color-rose);
}

.empty__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.empty__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-3);
}

.empty__actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
