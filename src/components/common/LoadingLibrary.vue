<script setup lang="ts">
import SkelChunkRow from '@/components/chunk/SkelChunkRow.vue';
</script>

<template>
  <div class="loading-library">
    <div class="loading-library__search">
      <span class="skel skel--search" />
      <span class="skel skel--filter" />
    </div>
    <div class="loading-library__tabs">
      <span v-for="(w, i) in [60, 80, 70, 70, 64]" :key="i" class="skel skel--tab" :style="{ width: `${w}px` }" />
    </div>
    <SkelChunkRow :count="5" />
  </div>
</template>

<style scoped>
.loading-library {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.loading-library__search {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.loading-library__tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.skel {
  position: relative;
  overflow: hidden;
  background: var(--color-surface-2);
  border-radius: 8px;
}
.skel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in oklch, var(--color-surface-3) 90%, transparent) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: skelShimmer 1.4s ease-in-out infinite;
}
@keyframes skelShimmer {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(60%);
  }
  100% {
    transform: translateX(120%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .skel::after {
    animation: none;
  }
}

.skel--search {
  flex: 1;
  height: 44px;
  border-radius: 20px;
}
.skel--filter {
  width: 44px;
  height: 44px;
  border-radius: 14px;
}
.skel--tab {
  height: 30px;
  border-radius: 999px;
}
</style>
