<script setup lang="ts">
import { useRouter } from 'vue-router';
import Icon from '@/components/common/Icon.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    onClose?: () => void;
    onMore?: () => void;
  }>(),
  {},
);

const router = useRouter();

function handleClose() {
  if (props.onClose) {
    props.onClose();
    return;
  }
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function handleMore() {
  props.onMore?.();
}
</script>

<template>
  <div class="mode-shell">
    <header class="mode-shell__head">
      <button class="mode-shell__btn tap" :aria-label="'Đóng'" @click="handleClose">
        <Icon name="chevron-down" :size="20" />
      </button>
      <div class="mode-shell__title-block">
        <div class="mode-shell__title">{{ title }}</div>
        <div v-if="subtitle" class="mode-shell__subtitle">{{ subtitle }}</div>
      </div>
      <div class="mode-shell__right">
        <slot name="right">
          <button
            v-if="onMore"
            class="mode-shell__btn tap"
            :aria-label="'Thêm'"
            @click="handleMore"
          >
            <Icon name="more" :size="20" />
          </button>
          <div v-else class="mode-shell__btn mode-shell__btn--placeholder" aria-hidden="true" />
        </slot>
      </div>
    </header>
    <div class="mode-shell__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.mode-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100%;
  background: var(--color-bg-0);
}

.mode-shell__head {
  height: calc(56px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 12px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.mode-shell__btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
  color: var(--color-text-1);
}
.mode-shell__btn--placeholder {
  background: transparent;
  pointer-events: none;
}

.mode-shell__title-block {
  flex: 1;
  text-align: center;
  min-width: 0;
}
.mode-shell__title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mode-shell__subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-shell__right {
  display: inline-flex;
}

.mode-shell__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.mode-shell__body::-webkit-scrollbar {
  display: none;
}
</style>
