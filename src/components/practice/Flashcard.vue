<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Chunk } from '@/types/chunk';
import type { FlashcardDirection } from '@/types/practice';
import LevelPill from '@/components/chunk/LevelPill.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import Icon from '@/components/common/Icon.vue';
import { useChunkStore } from '@/stores/chunkStore';

const props = defineProps<{
  chunk: Chunk;
  direction: FlashcardDirection;
}>();

const emit = defineEmits<{
  flip: [boolean];
  play: [Chunk];
}>();

const flipped = ref(false);
const chunks = useChunkStore();

const topic = computed(() => chunks.topicById(props.chunk.topic));
const accent = computed(() => topic.value?.color ?? '#22D3EE');

const frontText = computed(() =>
  props.direction === 'en-to-vi' ? props.chunk.text : props.chunk.meaning,
);
const backText = computed(() =>
  props.direction === 'en-to-vi' ? props.chunk.meaning : props.chunk.text,
);
const frontLabel = computed(() => (props.direction === 'en-to-vi' ? 'English' : 'Tiếng Việt'));
const backLabel = computed(() => (props.direction === 'en-to-vi' ? 'Tiếng Việt' : 'English'));

watch(
  () => props.chunk.id,
  () => {
    flipped.value = false;
  },
);
watch(
  () => props.direction,
  () => {
    flipped.value = false;
  },
);

function flip() {
  flipped.value = !flipped.value;
  emit('flip', flipped.value);
}

function onPlay(e: Event) {
  e.stopPropagation();
  emit('play', props.chunk);
}
</script>

<template>
  <div
    class="flash flip-card"
    :class="{ 'is-flipped': flipped }"
    role="button"
    tabindex="0"
    :aria-pressed="flipped"
    :style="{ '--accent': accent }"
    @click="flip"
    @keydown.space.prevent="flip"
    @keydown.enter="flip"
  >
    <div class="flip-inner">
      <div class="flip-face flash__face glass-strong">
        <header class="flash__head">
          <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
          <LevelPill :level="chunk.level" />
        </header>
        <div class="flash__body">
          <p class="flash__caption">{{ frontLabel }}</p>
          <p class="flash__text">{{ frontText }}</p>
        </div>
        <footer class="flash__foot">
          <button class="flash__audio tap" :aria-label="'Phát âm thanh'" @click="onPlay">
            <Icon name="volume" :size="18" />
          </button>
          <span class="flash__hint">Tap để lật</span>
        </footer>
      </div>
      <div class="flip-face flip-back flash__face flash__face--back glass-strong">
        <header class="flash__head">
          <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
          <LevelPill :level="chunk.level" />
        </header>
        <div class="flash__body">
          <p class="flash__caption">{{ backLabel }}</p>
          <p class="flash__text">{{ backText }}</p>
        </div>
        <footer class="flash__foot">
          <button class="flash__audio tap" :aria-label="'Phát âm thanh'" @click="onPlay">
            <Icon name="volume" :size="18" />
          </button>
          <span class="flash__hint">Tap để lật lại</span>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flash {
  position: relative;
  width: 100%;
  height: 320px;
  cursor: pointer;
}
.flash__face {
  border-radius: 28px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  position: absolute;
  inset: 0;
}
.flash__face::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 70% at 0% 0%, color-mix(in oklch, var(--accent) 24%, transparent), transparent 55%),
    radial-gradient(120% 70% at 100% 100%, color-mix(in oklch, var(--accent) 12%, transparent), transparent 55%);
  pointer-events: none;
}
.flash__face > * {
  position: relative;
  z-index: 1;
}
.flash__face--back::before {
  background:
    radial-gradient(120% 70% at 100% 0%, color-mix(in oklch, var(--accent) 32%, transparent), transparent 55%),
    radial-gradient(120% 70% at 0% 100%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 55%);
}
.flash__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.flash__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.flash__caption {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.flash__text {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.flash__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flash__audio {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.flash__hint {
  font-size: 11px;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
