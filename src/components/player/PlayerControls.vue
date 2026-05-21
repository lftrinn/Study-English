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
      class="controls__icon tap"
      :class="{ 'is-active': player.shuffle }"
      :aria-label="player.shuffle ? 'Tắt shuffle' : 'Bật shuffle'"
      @click="player.toggleShuffle"
    >
      <Icon name="shuffle" :size="20" />
    </button>

    <button
      class="controls__step tap"
      :aria-label="'Chunk trước'"
      :disabled="!player.hasPrev && player.queueLength <= 1"
      @click="player.prev"
    >
      <Icon name="prev" :size="26" />
    </button>

    <button class="controls__primary tap" :aria-label="playLabel" @click="togglePlay">
      <Icon
        :name="player.isPlaying && !player.isPaused ? 'pause' : 'play'"
        :size="30"
      />
    </button>

    <button
      class="controls__step tap"
      :aria-label="'Chunk sau'"
      :disabled="!player.hasNext && player.queueLength <= 1"
      @click="player.next"
    >
      <Icon name="next" :size="26" />
    </button>

    <button
      class="controls__icon tap"
      :class="{ 'is-active': player.repeatMode !== 'none' }"
      :aria-label="repeatLabel"
      @click="player.cycleRepeat"
    >
      <Icon :name="repeatIcon" :size="20" />
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
}
.controls__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--color-text-2);
  background: transparent;
}
.controls__icon.is-active {
  color: var(--color-cyan);
  background: var(--color-surface-3);
}
.controls__step {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--color-text-1);
  background: transparent;
}
.controls__step:disabled {
  opacity: 0.35;
}
.controls__primary {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow:
    0 8px 30px rgba(34, 211, 238, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.controls__primary :deep(svg) {
  margin-left: 2px;
}
</style>
