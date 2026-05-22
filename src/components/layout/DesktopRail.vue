<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';

import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useUiStore } from '@/stores/uiStore';

const router = useRouter();
const route = useRoute();
const player = usePlayerStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const ui = useUiStore();

const tab = computed(() => (route.meta?.tab as string | undefined) ?? '');

const chunk = computed(() => {
  if (tab.value === 'library' && ui.sheetChunkId) {
    return chunks.byId(ui.sheetChunkId) ?? player.current ?? chunks.chunks[0];
  }
  return player.current ?? chunks.chunks[0];
});

const topic = computed(() => (chunk.value ? chunks.topicById(chunk.value.topic) : undefined));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

const listenCount = computed(() => {
  if (!chunk.value) return 0;
  return progress.byId(chunk.value.id)?.listenCount ?? 0;
});

const progressPct = computed(() => {
  if (player.currentDurationMs <= 0) return 0;
  return Math.min(100, (player.currentElapsedMs / player.currentDurationMs) * 100);
});

const upNext = computed(() => {
  if (player.queue.length === 0) return [];
  return player.queue.slice(player.queueIndex + 1, player.queueIndex + 9);
});
const moreCount = computed(() => Math.max(0, player.queue.length - player.queueIndex - 1));

function togglePlay() {
  if (player.isPlaying && !player.isPaused) player.pause();
  else void player.play();
}
function prev() { void player.prev(); }
function next() { void player.next(); }
function jumpTo(idx: number) {
  player.moveTo(player.queueIndex + 1 + idx);
  void player.play();
}
function openPlayer() { router.push('/player'); }
</script>

<template>
  <aside class="dt-rail">
    <!-- Header -->
    <div class="dt-rail__head">
      <div>
        <div class="dt-rail__eyebrow">
          {{ tab === 'library' ? 'Selected chunk' : 'Now playing' }}
        </div>
        <div class="dt-rail__topic">{{ topic?.name ?? '—' }}</div>
      </div>
      <button class="btn tap dt-rail__expand" @click="openPlayer" aria-label="Open player">
        <Icon name="expand" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
    </div>

    <template v-if="chunk">
      <!-- Hero card -->
      <div
        class="dt-rail__card"
        :style="{
          background: `linear-gradient(160deg, color-mix(in oklch, ${accent} 40%, transparent), color-mix(in oklch, ${accent} 10%, transparent))`,
          border: `1px solid color-mix(in oklch, ${accent} 26%, transparent)`,
        }"
      >
        <div
          class="dt-rail__dot"
          :class="{ 'pulse-cyan': isPlaying }"
          :style="{ background: accent }"
        />
        <div>
          <TopicChip :topic-id="chunk.topic" size="sm" />
          <div class="dt-rail__en">{{ chunk.text }}</div>
          <div class="dt-rail__hr" />
          <div class="dt-rail__vi">{{ chunk.meaning }}</div>
        </div>
        <div class="dt-rail__meta">
          <span class="dt-rail__meta-item">
            <Icon name="mic" :size="11" :style="{ color: 'var(--color-text-3)' }" />
            Aria · {{ player.speed.toFixed(2) }}×
          </span>
          <span class="dt-rail__meta-item">
            <Icon name="headphones" :size="11" :style="{ color: 'var(--color-text-3)' }" />
            <span class="mono">{{ listenCount }}×</span>
          </span>
        </div>
      </div>

      <!-- Transport -->
      <div class="dt-rail__transport">
        <button class="btn tap dt-rail__t-btn" @click="player.setShuffle(!player.shuffle)" aria-label="Shuffle">
          <Icon name="shuffle" :size="14" :style="{ color: player.shuffle ? 'var(--color-cyan)' : 'var(--color-text-2)' }" />
        </button>
        <button class="btn tap dt-rail__t-btn" @click="prev" aria-label="Previous">
          <Icon name="prev" :size="18" />
        </button>
        <PlayBtn :playing="isPlaying" :size="48" @click="togglePlay" />
        <button class="btn tap dt-rail__t-btn" @click="next" aria-label="Next">
          <Icon name="next" :size="18" />
        </button>
        <button
          class="btn tap dt-rail__t-btn"
          @click="player.cycleRepeat()"
          aria-label="Repeat"
        >
          <Icon
            :name="player.repeatMode === 'one' ? 'repeat-one' : 'repeat'"
            :size="14"
            :style="{ color: player.repeatMode !== 'none' ? 'var(--color-cyan)' : 'var(--color-text-2)' }"
          />
        </button>
      </div>

      <ProgressBar :value="progressPct" :max="100" :height="3" :color="accent" />

      <!-- Up next -->
      <div v-if="upNext.length > 0" class="dt-rail__queue">
        <div class="dt-rail__queue-head">
          <span>Up next</span>
          <span class="mono">{{ moreCount }} more</span>
        </div>
        <div class="dt-rail__queue-list no-scrollbar">
          <button
            v-for="(c, i) in upNext"
            :key="c.id"
            class="btn tap dt-rail__row"
            @click="jumpTo(i)"
          >
            <span
              class="dt-rail__row-icon"
              :style="{ background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`, color: chunks.topicById(c.topic)?.color ?? '#22D3EE' }"
            >
              <TopicIcon :name="c.topic" :size="12" />
            </span>
            <div class="dt-rail__row-text">{{ c.text }}</div>
            <span class="mono dt-rail__row-num">{{ progress.byId(c.id)?.listenCount ?? 0 }}×</span>
          </button>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.dt-rail {
  border-left: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  overflow: hidden;
  min-width: 0;
}
.dt-rail__head { display: flex; align-items: center; justify-content: space-between; }
.dt-rail__eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.dt-rail__topic { font-size: 14px; font-weight: 700; margin-top: 2px; }
.dt-rail__expand {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
}

.dt-rail__card {
  aspect-ratio: 1;
  border-radius: 22px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.dt-rail__dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dt-rail__en {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 12px;
  letter-spacing: -0.01em;
  text-wrap: pretty;
}
.dt-rail__hr { height: 1px; background: var(--color-border-1); margin: 10px 0; }
.dt-rail__vi { font-size: 13px; color: var(--color-text-2); }
.dt-rail__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dt-rail__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-3);
}

.dt-rail__transport {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}
.dt-rail__t-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.dt-rail__t-btn:hover { background: var(--color-surface-2); }

.dt-rail__queue {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dt-rail__queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.dt-rail__queue-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dt-rail__row {
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}
.dt-rail__row:hover { background: var(--color-surface-2); }
.dt-rail__row-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.dt-rail__row-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dt-rail__row-num { font-size: 10px; color: var(--color-text-4); }
</style>
