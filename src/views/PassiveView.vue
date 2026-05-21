<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { playlistService } from '@/services/playlistService';

import ModeShell from '@/components/layout/ModeShell.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const player = usePlayerStore();
const chunks = useChunkStore();
const progress = useProgressStore();

const showMeaning = ref(true);
const startedAt = ref(Date.now());
const seconds = ref(0);
let tick: number | null = null;

const current = computed(() => player.current);
const topic = computed(() => (current.value ? chunks.topicById(current.value.topic) : undefined));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

const mm = computed(() => String(Math.floor(seconds.value / 60)).padStart(2, '0'));
const ss = computed(() => String(seconds.value % 60).padStart(2, '0'));

const voiceLine = computed(() => {
  if (player.mixVoice) return 'Mix voices';
  return player.selectedVoiceName ?? 'Default voice';
});

const ringStyles = (i: number) => ({
  position: 'absolute' as const,
  width: '260px',
  height: '260px',
  borderRadius: '50%',
  border: `1.5px solid color-mix(in oklch, ${accent.value} 60%, transparent)`,
  animation: `passivePulse 3s ${i}s ease-out infinite`,
});

function ensureQueue() {
  if (player.queue.length > 0) return;
  const lowListen = playlistService.buildLowListen(chunks.chunks, progress.progressMap, {
    threshold: 5,
    limit: 30,
  });
  const queue = lowListen.length > 0 ? lowListen : chunks.chunks.slice(0, 20);
  if (queue.length === 0) {
    router.replace('/library');
    return;
  }
  player.setShuffle(true);
  player.setQueue(queue, { mode: 'passive' });
}

function togglePlay() {
  if (isPlaying.value) player.pause();
  else void player.play();
}

function toggleMeaning() {
  showMeaning.value = !showMeaning.value;
}

onMounted(() => {
  ensureQueue();
  if (!isPlaying.value) void player.play();
  startedAt.value = Date.now();
  tick = window.setInterval(() => {
    if (isPlaying.value) {
      seconds.value = Math.floor((Date.now() - startedAt.value) / 1000);
    } else {
      startedAt.value = Date.now() - seconds.value * 1000;
    }
  }, 1000);
});

onBeforeUnmount(() => {
  if (tick !== null) window.clearInterval(tick);
});
</script>

<template>
  <ModeShell title="Passive Lab" subtitle="Hands-free">
    <template v-if="current && topic">
      <div class="passive">
        <!-- Stats row -->
        <div class="passive__stats">
          <div>
            <div class="passive__stat-label">Session</div>
            <div class="passive__stat-value mono">{{ mm }}:{{ ss }}</div>
          </div>
          <div :style="{ textAlign: 'right' }">
            <div class="passive__stat-label">Played</div>
            <div class="passive__stat-value mono">
              {{ player.sessionPlayedCount }}
              <span :style="{ fontSize: '12px', color: 'var(--color-text-3)', fontWeight: 600 }">chunks</span>
            </div>
          </div>
        </div>

        <!-- Pulse + chunk -->
        <div class="passive__centre">
          <div class="passive__pulse">
            <template v-if="isPlaying">
              <div v-for="i in 3" :key="i" :style="ringStyles(i - 1)" />
            </template>
            <div
              class="passive__halo"
              :style="{
                background: `radial-gradient(circle at 50% 40%, color-mix(in oklch, ${accent} 50%, transparent), transparent 70%)`,
              }"
            />
            <div
              class="passive__sphere"
              :style="{
                background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 60%, var(--color-violet)))`,
                boxShadow: `0 30px 80px color-mix(in oklch, ${accent} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.4)`,
              }"
            >
              <WaveBars color="#fff" :size="48" :playing="isPlaying" />
            </div>
          </div>

          <div class="passive__chunk">
            <TopicChip :topic="current.topic" />
            <div class="passive__text">{{ current.text }}</div>
            <div
              class="passive__meaning"
              :style="{
                color: showMeaning ? 'var(--color-text-2)' : 'transparent',
                textShadow: showMeaning ? 'none' : '0 0 14px var(--color-text-2)',
                userSelect: showMeaning ? 'auto' : 'none',
              }"
            >{{ current.meaning }}</div>
            <button class="btn tap passive__reveal" @click="toggleMeaning">
              <Icon :name="showMeaning ? 'eye-off' : 'eye'" :size="14" />
              {{ showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa' }}
            </button>
          </div>
        </div>

        <!-- Controls -->
        <div class="passive__controls">
          <div class="passive__transport">
            <button
              class="btn tap passive__nav"
              :aria-label="'Trước'"
              @click="player.prev"
            >
              <Icon name="prev" :size="22" />
            </button>
            <PlayBtn :playing="isPlaying" :size="72" @click="togglePlay" />
            <button
              class="btn tap passive__nav"
              :aria-label="'Sau'"
              @click="player.next"
            >
              <Icon name="next" :size="22" />
            </button>
          </div>
          <div class="passive__meta">
            <Icon name="mic" :size="12" />
            <span>{{ voiceLine }}</span>
            <span class="passive__sep" />
            <span class="mono">{{ player.speed.toFixed(2) }}×</span>
            <span class="passive__sep" />
            <span>Gap {{ (player.gap / 1000).toFixed(1) }}s</span>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="passive__empty">
      <p>Queue trống. Quay lại Library để thêm chunk.</p>
      <button class="btn tap passive__back" @click="router.replace('/library')">
        Tới Library
      </button>
    </div>
  </ModeShell>
</template>

<style scoped>
.passive {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 20px 24px;
  gap: 14px;
}

.passive__stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.passive__stat-label {
  font-size: 11px;
  color: var(--color-text-3);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.passive__stat-value {
  font-size: 22px;
  font-weight: 700;
  margin-top: 2px;
}

.passive__centre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}
.passive__pulse {
  position: relative;
  width: 260px;
  height: 260px;
  display: grid;
  place-items: center;
}
.passive__halo {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(8px);
}
.passive__sphere {
  position: relative;
  z-index: 1;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.passive__chunk {
  text-align: center;
  padding: 0 14px;
  max-width: 360px;
}
.passive__text {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.25;
  margin-top: 14px;
  text-wrap: pretty;
}
.passive__meaning {
  font-size: 15px;
  margin-top: 12px;
  transition: color 0.2s ease, text-shadow 0.2s ease;
}
.passive__reveal {
  margin-top: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.passive__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.passive__transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}
.passive__nav {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  color: var(--color-text-1);
}
.passive__meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-3);
}
.passive__sep {
  width: 3px;
  height: 3px;
  border-radius: 2px;
  background: var(--color-text-4);
  display: inline-block;
}

.passive__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--color-text-3);
  text-align: center;
  padding: 0 24px;
}
.passive__back {
  padding: 12px 22px;
  border-radius: 16px;
  background: var(--grad-primary);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow:
    0 10px 28px rgba(34, 211, 238, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}

@keyframes passivePulse {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .passive__pulse > div[style*='passivePulse'] {
    animation: none !important;
  }
}
</style>
