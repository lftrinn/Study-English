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
    | 'lightning';
  title: string;
  hint?: string;
}>();
</script>

<template>
  <div class="empty">
    <div class="empty__icon">
      <Icon :name="icon ?? 'sparkles'" :size="22" />
    </div>
    <h3 class="text-heading">{{ title }}</h3>
    <p v-if="hint" class="text-body text-text-3">{{ hint }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 36px 24px;
}
.empty__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-cyan);
}
</style>
