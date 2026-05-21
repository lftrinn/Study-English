<script setup lang="ts">
import { computed } from 'vue';
import type { Chunk } from '@/types/chunk';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import TopicChip from './TopicChip.vue';
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
      <Icon name="play" :size="14" />
    </button>

    <div class="chunk-row__main">
      <p class="chunk-row__text">{{ chunk.text }}</p>
      <p class="chunk-row__meaning">{{ chunk.meaning }}</p>
      <div v-if="showMeta !== false" class="chunk-row__meta">
        <TopicChip :topic-id="chunk.topic" :show-icon="true" size="sm" />
        <LevelPill :level="chunk.level" />
        <span class="chunk-row__count">
          <Icon name="headphones" :size="11" />
          <span class="mono">{{ listenCount }}</span>
        </span>
        <span class="chunk-row__status">
          <span class="dot" :class="`dot-${status}`" :aria-label="status" />
        </span>
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
  grid-template-columns: 40px 1fr auto;
  gap: 12px;
  padding: 12px 14px;
  align-items: flex-start;
  cursor: pointer;
}

.chunk-row__play {
  margin-top: 2px;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--c) 32%, transparent),
    color-mix(in oklch, var(--c) 16%, transparent)
  );
  border: 1px solid color-mix(in oklch, var(--c) 30%, transparent);
  color: var(--c);
  flex-shrink: 0;
}
.chunk-row__play :deep(svg) {
  margin-left: 1px;
}

.chunk-row__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.chunk-row__text {
  margin: 0;
  font-weight: 600;
  font-size: 14.5px;
  line-height: 1.35;
  color: var(--color-text-1);
  letter-spacing: -0.005em;
}
.chunk-row__meaning {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--color-text-3);
}
.chunk-row__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.chunk-row__count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-3);
}
.chunk-row__status {
  display: inline-flex;
  align-items: center;
}

.chunk-row__star {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--color-text-3);
  background: transparent;
}
.chunk-row__star.is-starred {
  color: #fcd34d;
}
</style>
