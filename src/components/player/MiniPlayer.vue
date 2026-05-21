<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import Icon from '@/components/common/Icon.vue';

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const chunks = useChunkStore();

const visible = computed(() => Boolean(player.current) && route.name !== 'player');
const topic = computed(() =>
  player.current ? chunks.topicById(player.current.topic) : undefined,
);
const accent = computed(() => topic.value?.color ?? '#22D3EE');

function togglePlay(e: Event) {
  e.stopPropagation();
  if (player.isPlaying && !player.isPaused) {
    player.pause();
  } else {
    void player.play();
  }
}

function gotoPlayer() {
  router.push('/player');
}
</script>

<template>
  <transition name="mini">
    <button
      v-if="visible && player.current"
      class="mini glass-strong tap"
      :style="{ '--c': accent }"
      :aria-label="`Mở player — ${player.current.text}`"
      @click="gotoPlayer"
    >
      <span class="mini__icon"><TopicIcon :name="player.current.topic" :size="18" /></span>
      <span v-if="player.isPlaying && !player.isPaused" class="mini__waves" aria-hidden="true">
        <span class="wave-bar" />
        <span class="wave-bar" />
        <span class="wave-bar" />
        <span class="wave-bar" />
      </span>
      <span class="mini__text">
        <span class="mini__title">{{ player.current.text }}</span>
        <span class="mini__sub">{{ player.queueIndex + 1 }} / {{ player.queueLength }} · {{ player.current.meaning }}</span>
      </span>
      <button
        class="mini__btn tap"
        :aria-label="player.isPlaying && !player.isPaused ? 'Tạm dừng' : 'Phát'"
        @click="togglePlay"
      >
        <Icon :name="player.isPlaying && !player.isPaused ? 'pause' : 'play'" :size="16" />
      </button>
    </button>
  </transition>
</template>

<style scoped>
.mini {
  position: fixed;
  inset: auto 12px calc(96px + env(safe-area-inset-bottom)) 12px;
  z-index: 50;
  padding: 8px 8px 8px 10px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 38px auto 1fr 36px;
  align-items: center;
  gap: 10px;
  text-align: left;
  border-color: color-mix(in oklch, var(--c) 28%, transparent);
}
.mini__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--c) 32%, transparent),
    color-mix(in oklch, var(--c) 12%, transparent)
  );
  color: color-mix(in oklch, var(--c) 90%, white);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mini__waves {
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
  height: 14px;
}
.mini__text {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}
.mini__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini__sub {
  font-size: 11px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini__btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px -8px rgba(34, 211, 238, 0.55);
  flex-shrink: 0;
}

.mini-enter-active,
.mini-leave-active {
  transition: transform 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1)), opacity 0.2s ease;
}
.mini-enter-from,
.mini-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
