<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './BottomNav.vue';
import ChunkDetailSheet from '@/components/chunk/ChunkDetailSheet.vue';
import InstallBanner from '@/components/common/InstallBanner.vue';
import MiniPlayer from '@/components/player/MiniPlayer.vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';

const route = useRoute();
const settings = useSettingsStore();
const player = usePlayerStore();

const hideChrome = computed(() => Boolean(route.meta?.hideChrome));
const hasMini = computed(
  () => !hideChrome.value && Boolean(player.current) && route.name !== 'player',
);

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = settings.theme;
  }
});
</script>

<template>
  <div class="app-shell night-bg">
    <main class="app-main no-scrollbar">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
      <div
        v-if="!hideChrome"
        class="tabbar-spacer"
        :class="{ 'tabbar-spacer--mini': hasMini }"
        aria-hidden="true"
      />
    </main>
    <MiniPlayer v-if="!hideChrome" />
    <BottomNav v-if="!hideChrome" />
    <ChunkDetailSheet />
    <InstallBanner v-if="!hideChrome" />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  position: relative;
}

.tabbar-spacer {
  height: calc(96px + env(safe-area-inset-bottom));
  flex-shrink: 0;
  transition: height 0.2s ease;
}
.tabbar-spacer--mini {
  height: calc(160px + env(safe-area-inset-bottom));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
