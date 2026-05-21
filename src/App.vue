<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useUiStore } from '@/stores/uiStore';
import type { BeforeInstallPromptEventLike } from '@/stores/uiStore';

const settings = useSettingsStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const ui = useUiStore();
const router = useRouter();

function onBeforeInstall(e: Event) {
  e.preventDefault();
  ui.setInstallPromptEvent(e as BeforeInstallPromptEventLike);
}

onMounted(async () => {
  settings.hydrate();
  await Promise.all([chunks.loadAll(), progress.hydrate()]);
  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    router.replace('/onboarding');
  }
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall);
});
</script>

<template>
  <AppShell />
</template>
