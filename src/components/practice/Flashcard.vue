<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Chunk } from '@/types/chunk';
import type { FlashcardDirection } from '@/types/practice';
import LevelPill from '@/components/chunk/LevelPill.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import Icon from '@/components/common/Icon.vue';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';

const props = defineProps<{
  chunk: Chunk;
  direction: FlashcardDirection;
}>();

const emit = defineEmits<{
  flip: [boolean];
  play: [Chunk];
  toggleStar: [Chunk];
}>();

const flipped = ref(false);
const chunks = useChunkStore();
const progress = useProgressStore();

const topic = computed(() => chunks.topicById(props.chunk.topic));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const starred = computed(() => Boolean(progress.byId(props.chunk.id)?.starred));

const showEnFront = computed(() => props.direction === 'en-to-vi');
const frontText = computed(() => (showEnFront.value ? props.chunk.text : props.chunk.meaning));
const backText = computed(() => (showEnFront.value ? props.chunk.meaning : props.chunk.text));
const frontLabel = computed(() => (showEnFront.value ? 'English' : 'Vietnamese'));
const backLabel = computed(() => (showEnFront.value ? 'Vietnamese' : 'English'));
const frontPhonetic = computed(() =>
  showEnFront.value && props.chunk.phonetic
    ? props.chunk.phonetic.replace(/^\/|\/$/g, '')
    : null,
);
const backPhonetic = computed(() =>
  !showEnFront.value && props.chunk.phonetic
    ? props.chunk.phonetic.replace(/^\/|\/$/g, '')
    : null,
);

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
function onStar(e: Event) {
  e.stopPropagation();
  emit('toggleStar', props.chunk);
}

const innerStyle = computed(() => ({
  position: 'relative' as const,
  width: '100%',
  height: '100%',
  transformStyle: 'preserve-3d' as const,
  transition: 'transform .6s cubic-bezier(.4, 0, .2, 1)',
  transform: flipped.value ? 'rotateY(180deg)' : 'none',
}));
const frontFaceStyle = computed(() => ({
  position: 'absolute' as const,
  inset: 0,
  padding: '24px',
  borderRadius: '28px',
  display: 'flex',
  flexDirection: 'column' as const,
  backfaceVisibility: 'hidden' as const,
  WebkitBackfaceVisibility: 'hidden' as const,
  transform: 'none',
  background: `linear-gradient(160deg, color-mix(in oklch, ${accent.value} 22%, transparent), color-mix(in oklch, ${accent.value} 6%, transparent)), var(--color-surface-2)`,
  border: `1px solid color-mix(in oklch, ${accent.value} 25%, var(--color-border-2))`,
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
}));
const backFaceStyle = computed(() => ({
  position: 'absolute' as const,
  inset: 0,
  padding: '24px',
  borderRadius: '28px',
  display: 'flex',
  flexDirection: 'column' as const,
  backfaceVisibility: 'hidden' as const,
  WebkitBackfaceVisibility: 'hidden' as const,
  transform: 'rotateY(180deg)',
  background:
    'linear-gradient(160deg, rgba(167,139,250,0.18), rgba(34,211,238,0.08)), var(--color-surface-2)',
  border: `1px solid color-mix(in oklch, ${accent.value} 15%, var(--color-border-2))`,
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
}));
</script>

<template>
  <div
    class="flash"
    role="button"
    tabindex="0"
    :aria-pressed="flipped"
    @click="flip"
    @keydown.space.prevent="flip"
    @keydown.enter="flip"
  >
    <div :style="innerStyle">
      <!-- Front face -->
      <div :style="frontFaceStyle">
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }">
          <TopicChip :topic="chunk.topic" size="sm" />
          <button
            class="btn tap"
            :aria-label="'Phát âm thanh'"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-1)',
            }"
            @click="onPlay"
          >
            <Icon name="speaker" :size="16" />
          </button>
        </div>
        <div
          :style="{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 8px',
          }"
        >
          <div
            :style="{
              fontSize: '11px',
              color: 'var(--color-text-3)',
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }"
          >{{ frontLabel }}</div>
          <div
            :style="{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }"
          >{{ frontText }}</div>
          <div
            v-if="frontPhonetic"
            :style="{
              fontSize: '14px',
              color: 'var(--color-text-3)',
              fontStyle: 'italic',
              marginTop: '8px',
              letterSpacing: '0.01em',
            }"
          >/{{ frontPhonetic }}/</div>
        </div>
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
          <span :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">Tap để lật</span>
          <button
            class="btn tap"
            :aria-label="starred ? 'Bỏ sao' : 'Đánh dấu sao'"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              color: starred ? '#FCD34D' : 'var(--color-text-3)',
            }"
            @click="onStar"
          >
            <Icon :name="starred ? 'star-filled' : 'star'" :size="18" />
          </button>
        </div>
      </div>

      <!-- Back face -->
      <div :style="backFaceStyle">
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }">
          <TopicChip :topic="chunk.topic" size="sm" />
          <button
            class="btn tap"
            :aria-label="'Phát âm thanh'"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-1)',
            }"
            @click="onPlay"
          >
            <Icon name="speaker" :size="16" />
          </button>
        </div>
        <div
          :style="{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 8px',
          }"
        >
          <div
            :style="{
              fontSize: '11px',
              color: 'var(--color-text-3)',
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }"
          >{{ backLabel }}</div>
          <div
            :style="{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }"
          >{{ backText }}</div>
          <div
            v-if="backPhonetic"
            :style="{
              fontSize: '14px',
              color: 'var(--color-text-3)',
              fontStyle: 'italic',
              marginTop: '8px',
              letterSpacing: '0.01em',
            }"
          >/{{ backPhonetic }}/</div>
          <div
            v-if="chunk.tags && chunk.tags.length > 0"
            :style="{
              marginTop: '16px',
              fontSize: '12px',
              color: 'var(--color-text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }"
          >
            <span
              :style="{
                padding: '4px 10px',
                background: 'var(--color-surface-2)',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
              }"
            >{{ chunk.tags[0] }}</span>
            <LevelPill :level="chunk.level" />
          </div>
        </div>
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
          <span :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">Tap để lật lại</span>
          <button
            class="btn tap"
            :aria-label="starred ? 'Bỏ sao' : 'Đánh dấu sao'"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              color: starred ? '#FCD34D' : 'var(--color-text-3)',
            }"
            @click="onStar"
          >
            <Icon :name="starred ? 'star-filled' : 'star'" :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flash {
  width: min(100%, 340px);
  height: 100%;
  max-height: min(calc(100vw * 4 / 3 - 20px), 480px);
  aspect-ratio: 3 / 4;
  cursor: pointer;
  perspective: 1400px;
  margin: 0 auto;
}
</style>
