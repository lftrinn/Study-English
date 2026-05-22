<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import DesktopSidebar from './DesktopSidebar.vue';
import DesktopTopBar from './DesktopTopBar.vue';
import DesktopRail from './DesktopRail.vue';

import DTHomeView from '@/views/desktop/DTHomeView.vue';
import DTLibraryView from '@/views/desktop/DTLibraryView.vue';
import DTPlayerView from '@/views/desktop/DTPlayerView.vue';
import DTPracticeView from '@/views/desktop/DTPracticeView.vue';
import DTProgressView from '@/views/desktop/DTProgressView.vue';
import DTSettingsView from '@/views/desktop/DTSettingsView.vue';

import ChunkDetailSheet from '@/components/chunk/ChunkDetailSheet.vue';
import InstallBanner from '@/components/common/InstallBanner.vue';

import { useSettingsStore } from '@/stores/settingsStore';

const route = useRoute();
const router = useRouter();
const settings = useSettingsStore();

const tab = computed(() => (route.meta?.tab as string | undefined) ?? '');
const hideChrome = computed(() => Boolean(route.meta?.hideChrome));

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = settings.theme;
  }
});

const SHORTCUTS: Record<string, string> = {
  '1': '/',
  '2': '/library',
  '3': '/player',
  '4': '/practice',
  '5': '/progress',
};

function onKey(e: KeyboardEvent) {
  // ⌘K / Ctrl+K → focus search
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const el = document.querySelector<HTMLInputElement>('[data-dt-search]');
    el?.focus();
    el?.select();
    return;
  }
  // ⌘1..5 / Ctrl+1..5 → main nav
  if ((e.metaKey || e.ctrlKey) && SHORTCUTS[e.key]) {
    // Don't hijack browser tab switching unless we're confident this is our app.
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    if (route.path !== SHORTCUTS[e.key]) router.push(SHORTCUTS[e.key]);
  }
  // Esc closes detail sheet — handled by sheet itself.
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="dt-shell night-bg" :class="{ 'is-mode': hideChrome }">
    <template v-if="hideChrome">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </template>

    <template v-else>
      <DesktopSidebar />
      <div class="dt-shell__col">
        <DesktopTopBar />
        <main class="dt-shell__main">
          <transition name="fade" mode="out-in">
            <DTHomeView     v-if="tab === 'home'" />
            <DTLibraryView  v-else-if="tab === 'library'" />
            <DTPlayerView   v-else-if="tab === 'player'" />
            <DTPracticeView v-else-if="tab === 'practice'" />
            <DTProgressView v-else-if="tab === 'progress'" />
            <DTSettingsView v-else-if="tab === 'settings'" />
            <DTHomeView     v-else />
          </transition>
        </main>
      </div>
      <DesktopRail />
    </template>

    <ChunkDetailSheet />
    <InstallBanner v-if="!hideChrome" />
  </div>
</template>

<style scoped>
.dt-shell {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: 240px 1fr 360px;
  overflow: hidden;
}
.dt-shell.is-mode {
  display: block;
  overflow: auto;
}

.dt-shell__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.dt-shell__main {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
