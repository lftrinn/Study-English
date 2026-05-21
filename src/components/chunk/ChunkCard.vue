<script setup lang="ts">
import { computed } from 'vue';
import type { Chunk } from '@/types/chunk';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import LevelPill from './LevelPill.vue';
import TopicChip from './TopicChip.vue';
import Icon from '@/components/common/Icon.vue';

const props = defineProps<{
  chunk: Chunk;
  voiceName?: string;
  isPlaying?: boolean;
  showFooter?: boolean;
}>();

const chunks = useChunkStore();
const progress = useProgressStore();

const topic = computed(() => chunks.topicById(props.chunk.topic));
const status = computed(() => progress.byId(props.chunk.id)?.status ?? 'new');
const listenCount = computed(() => progress.byId(props.chunk.id)?.listenCount ?? 0);
const accent = computed(() => topic.value?.color ?? '#22D3EE');
</script>

<template>
  <article
    class="chunk-card glass-strong"
    :class="{ 'is-playing': isPlaying }"
    :style="{ '--accent': accent }"
  >
    <div class="chunk-card__head">
      <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
      <LevelPill :level="chunk.level" />
      <span class="dot" :class="`dot-${status}`" :aria-label="status" />
    </div>

    <p class="chunk-card__text">{{ chunk.text }}</p>
    <p class="chunk-card__meaning">{{ chunk.meaning }}</p>

    <footer v-if="showFooter !== false" class="chunk-card__foot">
      <span class="chunk-card__voice">
        <Icon name="voice" :size="14" />
        <span>{{ voiceName ?? 'Default voice' }}</span>
      </span>
      <span class="chunk-card__listen">
        <Icon name="ear" :size="14" />
        <span>{{ listenCount }} lần</span>
      </span>
      <span v-if="isPlaying" class="chunk-card__waves" aria-hidden="true">
        <span class="wave-bar" />
        <span class="wave-bar" />
        <span class="wave-bar" />
        <span class="wave-bar" />
      </span>
    </footer>
  </article>
</template>

<style scoped>
.chunk-card {
  position: relative;
  padding: 20px 20px 18px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.chunk-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 70% at 0% 0%, color-mix(in oklch, var(--accent) 26%, transparent), transparent 55%),
    radial-gradient(120% 70% at 100% 100%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 55%);
  z-index: 0;
  pointer-events: none;
}
.chunk-card > * {
  position: relative;
  z-index: 1;
}

.chunk-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chunk-card__text {
  margin: 8px 0 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.chunk-card__meaning {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-text-2);
}

.chunk-card__foot {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
}
.chunk-card__voice,
.chunk-card__listen {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.chunk-card__waves {
  margin-left: auto;
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
}

.chunk-card.is-playing::before {
  background:
    radial-gradient(120% 70% at 0% 0%, color-mix(in oklch, var(--accent) 38%, transparent), transparent 55%),
    radial-gradient(120% 70% at 100% 100%, color-mix(in oklch, var(--accent) 22%, transparent), transparent 55%);
}
</style>
