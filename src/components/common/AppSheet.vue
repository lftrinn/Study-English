<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Icon from './Icon.vue';

const props = defineProps<{
  open: boolean;
  title?: string;
  maxHeight?: string;
}>();

const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (props.open && e.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <teleport to="body">
    <transition name="sheet">
      <div v-if="open" class="sheet-root" role="dialog" aria-modal="true">
        <div class="sheet-backdrop" @click="emit('close')" />
        <div
          class="sheet glass-strong"
          :style="{ maxHeight: maxHeight ?? '85dvh' }"
          @click.stop
        >
          <header class="sheet__head">
            <div class="sheet__handle" aria-hidden="true" />
            <div class="sheet__title-row">
              <h2 v-if="title" class="text-heading">{{ title }}</h2>
              <button class="sheet__close tap" :aria-label="'Đóng'" @click="emit('close')">
                <Icon name="close" :size="20" />
              </button>
            </div>
          </header>
          <div class="sheet__body no-scrollbar">
            <slot />
          </div>
          <div v-if="$slots.actions" class="sheet__actions">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 200;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 4, 15, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 28px 28px 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet__head {
  padding: 10px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sheet__handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-border-2);
  align-self: center;
}
.sheet__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sheet__close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sheet__body {
  padding: 8px 20px 16px;
  overflow-y: auto;
  scrollbar-width: none;
  flex: 1;
}
.sheet__actions {
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border-1);
  display: flex;
  gap: 8px;
  background: var(--color-surface-1);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.35s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

/* ─── Desktop: render as centered modal instead of bottom sheet ─── */
@media (min-width: 1180px) {
  .sheet-root { display: grid; place-items: center; padding: 24px; }
  .sheet {
    position: relative;
    inset: auto;
    left: auto; right: auto; bottom: auto;
    width: min(760px, calc(100vw - 48px));
    max-width: 760px;
    /* Override max-height passed inline for mobile (92dvh etc.) — desktop modal is shorter. */
    max-height: min(85vh, 760px) !important;
    border-radius: 20px;
    padding-bottom: 0;
    /* Solid card so it actually pops above the page (.glass-strong is rgba 7%/3% on dark night-bg). */
    background:
      linear-gradient(180deg,
        color-mix(in oklch, var(--color-bg-2) 96%, transparent),
        color-mix(in oklch, var(--color-bg-1) 96%, transparent));
    border: 1px solid var(--color-border-2);
    box-shadow:
      0 32px 80px -16px rgba(0, 0, 0, 0.65),
      0 12px 28px -10px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  }
  [data-theme='light'] .sheet {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94));
    box-shadow:
      0 32px 80px -16px rgba(14, 18, 38, 0.22),
      0 12px 28px -10px rgba(14, 18, 38, 0.14);
  }
  .sheet__head { padding: 16px 22px 8px; }
  .sheet__handle { display: none; }
  .sheet__body { padding: 8px 22px 18px; }
  .sheet__actions {
    padding: 14px 22px 18px;
    border-radius: 0 0 20px 20px;
  }

  /* Modal-style enter: scale + fade instead of slide-up */
  .sheet-enter-active .sheet,
  .sheet-leave-active .sheet {
    transition:
      transform 0.22s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1)),
      opacity 0.18s ease;
  }
  .sheet-enter-from .sheet,
  .sheet-leave-to .sheet {
    transform: scale(0.97);
    opacity: 0;
  }
}
</style>
