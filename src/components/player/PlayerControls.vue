<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/playerStore';
import Icon from '@/components/common/Icon.vue';

const player = usePlayerStore();

const playLabel = computed(() => (player.isPlaying && !player.isPaused ? 'Tạm dừng' : 'Phát'));
const repeatIcon = computed(() => (player.repeatMode === 'one' ? 'repeat-one' : 'repeat'));
const repeatLabel = computed(() => {
  switch (player.repeatMode) {
    case 'one':
      return 'Lặp 1 chunk';
    case 'all':
      return 'Lặp hết queue';
    case 'none':
    default:
      return 'Không lặp';
  }
});

function togglePlay() {
  if (player.isPlaying && !player.isPaused) {
    player.pause();
  } else {
    void player.play();
  }
}
</script>

<template>
  <div class="controls">
    <button
      class="controls__btn tap"
      :class="{ 'is-active': player.shuffle }"
      :aria-label="player.shuffle ? 'Tắt shuffle' : 'Bật shuffle'"
      @click="player.toggleShuffle"
    >
      <Icon name="shuffle" :size="18" />
    </button>

    <button
      class="controls__btn tap"
      :aria-label="'Chunk trước'"
      :disabled="!player.hasPrev && player.queueLength <= 1"
      @click="player.prev"
    >
      <Icon name="prev" :size="22" />
    </button>

    <button class="controls__primary tap" :aria-label="playLabel" @click="togglePlay">
      <Icon
        :name="player.isPlaying && !player.isPaused ? 'pause' : 'play'"
        :size="26"
      />
    </button>

    <button
      class="controls__btn tap"
      :aria-label="'Chunk sau'"
      :disabled="!player.hasNext && player.queueLength <= 1"
      @click="player.next"
    >
      <Icon name="next" :size="22" />
    </button>

    <button
      class="controls__btn tap"
      :class="{ 'is-active': player.repeatMode !== 'none' }"
      :aria-label="repeatLabel"
      @click="player.cycleRepeat"
    >
      <Icon :name="repeatIcon" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  justify-items: center;
  gap: 8px;
}
.controls__btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-2);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.controls__btn.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
}
.controls__btn:disabled {
  opacity: 0.35;
}
.controls__primary {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 10px 30px -10px rgba(34, 211, 238, 0.6),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}
</style>
