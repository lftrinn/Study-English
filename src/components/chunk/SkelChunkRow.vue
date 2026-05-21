<script setup lang="ts">
defineProps<{
  count?: number;
}>();
</script>

<template>
  <div class="skel-row" v-for="i in count ?? 5" :key="i" aria-hidden="true">
    <span class="skel-row__lead skel" />
    <div class="skel-row__main">
      <span class="skel skel-row__title" />
      <span class="skel skel-row__sub" />
      <div class="skel-row__meta">
        <span class="skel skel-row__chip" />
        <span class="skel skel-row__chip skel-row__chip--mini" />
        <span class="skel skel-row__chip skel-row__chip--mini" />
      </div>
    </div>
    <span class="skel-row__star skel" />
  </div>
</template>

<style scoped>
.skel-row {
  display: grid;
  grid-template-columns: 44px 1fr 36px;
  gap: 12px;
  padding: 12px;
  align-items: center;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
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

.skel-row__lead {
  width: 44px;
  height: 44px;
  border-radius: 14px;
}
.skel-row__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.skel-row__title {
  height: 14px;
  width: 85%;
  border-radius: 6px;
}
.skel-row__sub {
  height: 11px;
  width: 55%;
  border-radius: 6px;
}
.skel-row__meta {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.skel-row__chip {
  height: 18px;
  width: 64px;
  border-radius: 999px;
}
.skel-row__chip--mini {
  width: 32px;
}
.skel-row__star {
  width: 32px;
  height: 32px;
  border-radius: 10px;
}
</style>
