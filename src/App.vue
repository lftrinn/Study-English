<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { BeforeInstallPromptEventLike } from '@/stores/uiStore';

const settings = useSettingsStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const ui = useUiStore();
const player = usePlayerStore();
const router = useRouter();

function onBeforeInstall(e: Event) {
  e.preventDefault();
  ui.setInstallPromptEvent(e as BeforeInstallPromptEventLike);
}

// iOS PWA lifecycle: when the user swipes to the home screen, switches apps
// or locks the device, the system fires `visibilitychange` with hidden=true.
// We pause so the user can resume on return. When the PWA is actually closed
// (pagehide, persisted=false), we stop entirely to release the speech queue.
function onVisibilityChange() {
  if (document.visibilityState === 'hidden' && player.isPlaying && !player.isPaused) {
    player.pause();
  }
}

function onPageHide(e: PageTransitionEvent) {
  // persisted=true means the page is going into bfcache and may come back —
  // pause is enough; persisted=false means a real teardown, so stop.
  if (e.persisted) {
    if (player.isPlaying && !player.isPaused) player.pause();
  } else {
    player.stop();
  }
}

onMounted(async () => {
  settings.hydrate();
  await Promise.all([chunks.loadAll(), progress.hydrate()]);
  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    router.replace('/onboarding');
  }
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
});
</script>

<template>
  <AppShell />
</template>
