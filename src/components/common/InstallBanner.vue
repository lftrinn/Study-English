<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import Icon from './Icon.vue';

const ui = useUiStore();
const settings = useSettingsStore();

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const shouldShow = computed(() => {
  if (!ui.installPromptVisible || !ui.installPromptEvent) return false;
  const dismissedAt = settings.installPromptDismissedAt;
  if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
  return true;
});

async function install() {
  const evt = ui.installPromptEvent;
  if (!evt) return;
  try {
    await evt.prompt();
    const result = await evt.userChoice;
    if (result.outcome === 'dismissed') {
      settings.dismissInstallPrompt();
    }
  } catch {
    // ignore
  } finally {
    ui.setInstallPromptEvent(null);
  }
}

function later() {
  settings.dismissInstallPrompt();
  ui.setInstallPromptEvent(null);
}
</script>

<template>
  <transition name="install">
    <div v-if="shouldShow" class="install glass-strong" role="status" aria-label="Cài app">
      <span class="install__icon" aria-hidden="true">
        <Icon name="lightning" :size="18" />
      </span>
      <div class="install__text">
        <p class="install__title">Cài Chunk Listening Lab</p>
        <p class="install__hint">Mở nhanh từ home screen, hoạt động offline.</p>
      </div>
      <button class="install__later tap" :aria-label="'Để sau'" @click="later">Để sau</button>
      <button class="install__install tap" :aria-label="'Cài đặt'" @click="install">Cài</button>
    </div>
  </transition>
</template>

<style scoped>
.install {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 70;
  padding: 12px 14px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.55);
}
.install__icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.install__text {
  flex: 1;
  min-width: 0;
}
.install__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
}
.install__hint {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-text-3);
}
.install__later {
  padding: 6px 10px;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 600;
}
.install__install {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--grad-primary);
  color: white;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 8px 18px -8px rgba(34, 211, 238, 0.55);
}

.install-enter-active,
.install-leave-active {
  transition: transform 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1)), opacity 0.3s ease;
}
.install-enter-from,
.install-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
