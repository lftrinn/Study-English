<script setup lang="ts">
import { computed } from 'vue';
import type { Chunk } from '@/types/chunk';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import TopicChip from './TopicChip.vue';
import TopicIcon from './TopicIcon.vue';
import LevelPill from './LevelPill.vue';
import Icon from '@/components/common/Icon.vue';

const props = defineProps<{ chunk: Chunk; showMeta?: boolean }>();

const emit = defineEmits<{ play: [Chunk]; open: [Chunk]; toggleStar: [Chunk] }>();

const chunks = useChunkStore();
const progress = useProgressStore();

const topic = computed(() => chunks.topicById(props.chunk.topic));
const p = computed(() => progress.byId(props.chunk.id));
const starred = computed(() => Boolean(p.value?.starred));
const status = computed(() => p.value?.status ?? 'new');
const listenCount = computed(() => p.value?.listenCount ?? 0);

function onRowClick() {
  emit('open', props.chunk);
}
function onPlay(e: Event) {
  e.stopPropagation();
  emit('play', props.chunk);
}
function onStar(e: Event) {
  e.stopPropagation();
  emit('toggleStar', props.chunk);
}
</script>

<template>
  <div
    class="chunk-row glass tap"
    role="button"
    tabindex="0"
    @click="onRowClick"
    @keydown.enter="onRowClick"
    @keydown.space.prevent="onRowClick"
  >
    <button
      class="chunk-row__play tap"
      :style="{ '--c': topic?.color ?? '#22D3EE' }"
      :aria-label="`Phát: ${chunk.text}`"
      @click="onPlay"
    >
      <TopicIcon :name="chunk.topic" :size="18" />
      <span class="chunk-row__play-overlay" aria-hidden="true">
        <Icon name="play" :size="10" />
      </span>
    </button>

    <div class="chunk-row__main">
      <p class="chunk-row__text">{{ chunk.text }}</p>
      <p class="chunk-row__meaning">{{ chunk.meaning }}</p>
      <div v-if="showMeta !== false" class="chunk-row__meta">
        <TopicChip :topic-id="chunk.topic" size="sm" />
        <LevelPill :level="chunk.level" />
        <span class="chunk-row__count">
          <Icon name="headphones" :size="12" />
          {{ listenCount }}
        </span>
        <span class="dot" :class="`dot-${status}`" :aria-label="status" />
      </div>
    </div>

    <button
      class="chunk-row__star tap"
      :class="{ 'is-starred': starred }"
      :aria-pressed="starred"
      :aria-label="starred ? 'Bỏ sao' : 'Đánh dấu sao'"
      @click="onStar"
    >
      <Icon :name="starred ? 'star-filled' : 'star'" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.chunk-row {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 12px;
  padding: 12px;
  align-items: center;
  cursor: pointer;
}

.chunk-row__play {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--c) 32%, transparent),
    color-mix(in oklch, var(--c) 14%, transparent)
  );
  border: 1px solid color-mix(in oklch, var(--c) 28%, transparent);
  color: color-mix(in oklch, var(--c) 90%, white);
}
.chunk-row__play-overlay {
  position: absolute;
  inset: auto -3px -3px auto;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-bg-0);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.chunk-row:hover .chunk-row__play-overlay,
.chunk-row__play:focus-visible .chunk-row__play-overlay {
  opacity: 1;
}

.chunk-row__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chunk-row__text {
  margin: 0;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.3;
  color: var(--color-text-1);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chunk-row__meaning {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
}
.chunk-row__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.chunk-row__count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-3);
  font-family: var(--font-mono);
}

.chunk-row__star {
  align-self: flex-start;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
  background: transparent;
}
.chunk-row__star.is-starred {
  color: var(--color-amber);
}
</style>
