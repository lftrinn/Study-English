<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';

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
const settings = useSettingsStore();

const tab = computed(() => (route.meta?.tab as string | undefined) ?? '');
const hideChrome = computed(() => Boolean(route.meta?.hideChrome));

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = settings.theme;
  }
});
</script>

<template>
  <div class="dt-shell night-bg" :class="{ 'is-mode': hideChrome }">
    <!-- Full-screen mode overlays (passive/flashcard/learn/etc.) get their own
         routes that set hideChrome=true — for those we render the routed view
         only, no shell. -->
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
