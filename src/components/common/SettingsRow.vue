<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(
  defineProps<{
    icon: string;
    color: string;
    label: string;
    hint?: string;
    last?: boolean;
    interactive?: boolean;
  }>(),
  { last: false, interactive: true },
);

const emit = defineEmits<{ click: [] }>();

const iconBg = computed(() => `color-mix(in oklch, ${props.color} 22%, transparent)`);
const tag = computed(() => (props.interactive ? 'button' : 'div'));
</script>

<template>
  <component
    :is="tag"
    :class="['settings-row tap', interactive ? 'btn' : '']"
    :style="{
      borderBottom: last ? 'none' : '1px solid var(--color-border-1)',
    }"
    @click="interactive && emit('click')"
  >
    <span class="settings-row__icon" :style="{ background: iconBg, color }">
      <Icon :name="icon" :size="16" />
    </span>
    <div class="settings-row__body">
      <div class="settings-row__label">{{ label }}</div>
      <div v-if="hint || $slots.hint" class="settings-row__hint">
        <slot name="hint">{{ hint }}</slot>
      </div>
    </div>
    <div class="settings-row__right">
      <slot name="right">
        <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
      </slot>
    </div>
  </component>
</template>

<style scoped>
.settings-row {
  width: 100%;
  padding: 13px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  text-align: left;
  color: inherit;
}
.settings-row__icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.settings-row__body {
  flex: 1;
  min-width: 0;
}
.settings-row__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.settings-row__hint {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}
.settings-row__right {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
