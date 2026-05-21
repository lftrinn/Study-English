<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';
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
const topicName = computed(() => topic.value?.name ?? '');
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

function togglePlay(e: Event) {
  e.stopPropagation();
  if (isPlaying.value) player.pause();
  else void player.play();
}

function gotoPlayer() {
  router.push('/player');
}
</script>

<template>
  <transition name="mini">
    <button
      v-if="visible && player.current"
      class="mini tap"
      :style="{
        '--c': accent,
        background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 14%, var(--color-surface-2)), var(--color-surface-2))`,
      }"
      :aria-label="`Mở player — ${player.current.text}`"
      @click="gotoPlayer"
    >
      <span class="mini__icon">
        <span class="mini__waves" aria-hidden="true">
          <template v-if="isPlaying">
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
          </template>
          <template v-else>
            <span class="mini__bar-idle" />
            <span class="mini__bar-idle" />
            <span class="mini__bar-idle" />
            <span class="mini__bar-idle" />
          </template>
        </span>
      </span>
      <span class="mini__text">
        <span class="mini__title">{{ player.current.text }}</span>
        <span class="mini__sub">
          {{ topicName }} · <span class="mono">{{ player.queueIndex + 1 }}/{{ player.queueLength }}</span>
        </span>
      </span>
      <button
        class="mini__btn"
        :style="{
          background: accent,
          boxShadow: `0 4px 14px color-mix(in oklch, ${accent} 40%, transparent)`,
        }"
        :aria-label="isPlaying ? 'Tạm dừng' : 'Phát'"
        @click="togglePlay"
      >
        <Icon :name="isPlaying ? 'pause' : 'play'" :size="14" />
      </button>
    </button>
  </transition>
</template>

<style scoped>
.mini {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 18px;
  text-align: left;
  border: 1px solid var(--color-border-2);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}
.mini__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--c) 30%, transparent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.mini__waves {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--c);
  height: 14px;
}
.mini__bar-idle {
  display: inline-block;
  width: 3px;
  height: 6px;
  background: currentColor;
  border-radius: 2px;
  opacity: 0.4;
}
.mini__waves .wave-bar {
  width: 3px;
  margin: 0 1px;
  height: 14px;
}

.mini__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  display: grid;
  place-items: center;
  color: #0b0f22;
  flex-shrink: 0;
  border: 0;
  cursor: pointer;
}

.mini-enter-active,
.mini-leave-active {
  transition:
    transform 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1)),
    opacity 0.2s ease;
}
.mini-enter-from,
.mini-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
