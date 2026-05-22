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
    class="chunk-card"
    :class="{ 'is-playing': isPlaying }"
    :style="{ '--accent': accent }"
  >
    <span v-if="isPlaying" class="chunk-card__pulse" aria-hidden="true" />

    <div class="chunk-card__head">
      <TopicChip :topic-id="chunk.topic" :show-icon="true" />
      <LevelPill :level="chunk.level" />
      <span class="dot" :class="`dot-${status}`" :aria-label="status" />
    </div>

    <div class="chunk-card__body">
      <p class="chunk-card__text">{{ chunk.text }}</p>
      <p v-if="chunk.phonetic" class="chunk-card__phonetic">
        /{{ chunk.phonetic.replace(/^\/|\/$/g, '') }}/
      </p>
      <p class="chunk-card__meaning">{{ chunk.meaning }}</p>
    </div>

    <footer v-if="showFooter !== false" class="chunk-card__foot">
      <span class="chunk-card__voice">
        <span class="chunk-card__voice-circle"><Icon name="mic" :size="14" /></span>
        <span class="chunk-card__voice-text">{{ voiceName ?? 'Default' }}</span>
      </span>
      <span class="chunk-card__divider" aria-hidden="true" />
      <span class="chunk-card__listen mono">
        <Icon name="headphones" :size="12" />
        <span>{{ listenCount }}</span>
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
  aspect-ratio: 1 / 1;
  padding: 26px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  background:
    linear-gradient(
      160deg,
      color-mix(in oklch, var(--accent) 45%, transparent) 0%,
      color-mix(in oklch, var(--accent) 10%, transparent) 100%
    ),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--accent) 24%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

.chunk-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    120% 80% at 20% 0%,
    rgba(255, 255, 255, 0.18),
    transparent 55%
  );
  pointer-events: none;
}

.chunk-card__pulse {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--color-cyan);
  box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-cyan) 50%, transparent);
  animation: pulseGlow 2.4s ease-out infinite;
  z-index: 2;
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

.chunk-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.chunk-card__text {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--color-text-1);
}
.chunk-card__phonetic {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  color: var(--color-text-3);
  font-style: italic;
  letter-spacing: 0.01em;
}
.chunk-card__meaning {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-text-2);
}

.chunk-card__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  padding-top: 10px;
  border-top: 1px solid color-mix(in oklch, var(--accent) 18%, transparent);
}
.chunk-card__voice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.chunk-card__voice-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-surface-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-2);
}
.chunk-card__voice-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}
.chunk-card__divider {
  width: 1px;
  height: 18px;
  background: var(--color-border-1);
}
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
</style>
