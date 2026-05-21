<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './BottomNav.vue';
import ChunkDetailSheet from '@/components/chunk/ChunkDetailSheet.vue';
import InstallBanner from '@/components/common/InstallBanner.vue';
import { useSettingsStore } from '@/stores/settingsStore';

const route = useRoute();
const settings = useSettingsStore();

const hideChrome = computed(() => Boolean(route.meta?.hideChrome));

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
      <div v-if="!hideChrome" class="tabbar-spacer" aria-hidden="true" />
    </main>
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
  height: calc(88px + env(safe-area-inset-bottom));
  flex-shrink: 0;
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
