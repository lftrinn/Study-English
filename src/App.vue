<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import DesktopShell from '@/components/layout/DesktopShell.vue';
import { useViewport } from '@/composables/useViewport';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useToeicStore } from '@/stores/toeicStore';
import type { BeforeInstallPromptEventLike } from '@/stores/uiStore';

const settings = useSettingsStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const ui = useUiStore();
const player = usePlayerStore();
const toeic = useToeicStore();
const router = useRouter();
const { isDesktop } = useViewport();

function onBeforeInstall(e: Event) {
  e.preventDefault();
  ui.setInstallPromptEvent(e as BeforeInstallPromptEventLike);
}

// PWA lifecycle hooks. We *don't* pause on `visibilitychange` anymore — the
// silent-audio loop + Media Session API set up by playerStore.play() aim to
// keep playback alive when the app is backgrounded (best-effort on iOS).
// pagehide with persisted=false signals a real teardown, so stop cleanly.
function onPageHide(e: PageTransitionEvent) {
  if (e.persisted) {
    if (player.isPlaying && !player.isPaused) player.pause();
  } else {
    player.stop();
  }
}

onMounted(async () => {
  settings.hydrate();
  await Promise.all([chunks.loadAll(), progress.hydrate(), toeic.loadUserContent()]);
  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    router.replace('/onboarding');
  }
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('pagehide', onPageHide);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  window.removeEventListener('pagehide', onPageHide);
});
</script>

<template>
  <DesktopShell v-if="isDesktop" />
  <AppShell v-else />
</template>
