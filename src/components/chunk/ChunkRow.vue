<script setup lang="ts">
/**
 * Literal port of screens-main.jsx ChunkRow (lines 314-342). All
 * spacing / sizes / colors copied verbatim through :style binding.
 */
import { computed } from 'vue';
import type { Chunk } from '@/types/chunk';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import TopicChip from './TopicChip.vue';
import LevelPill from './LevelPill.vue';
import Icon from '@/components/common/Icon.vue';

const props = defineProps<{ chunk: Chunk }>();
const emit = defineEmits<{ play: [Chunk]; open: [Chunk]; toggleStar: [Chunk] }>();

const chunks = useChunkStore();
const progress = useProgressStore();

const topic = computed(() => chunks.topicById(props.chunk.topic));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
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
    class="glass tap"
    :style="{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }"
    role="button"
    tabindex="0"
    @click="onRowClick"
    @keydown.enter="onRowClick"
  >
    <button
      class="btn tap"
      :style="{
        width: '40px',
        height: '40px',
        borderRadius: '14px',
        flexShrink: 0,
        background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 32%, transparent), color-mix(in oklch, ${accent} 16%, transparent))`,
        border: `1px solid color-mix(in oklch, ${accent} 30%, transparent)`,
        display: 'grid',
        placeItems: 'center',
        marginTop: '2px',
        color: accent,
      }"
      :aria-label="`Phát: ${chunk.text}`"
      @click="onPlay"
    >
      <Icon name="play" :size="14" :style="{ marginLeft: '1px' }" />
    </button>

    <div :style="{ flex: 1, minWidth: 0 }">
      <div :style="{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35 }">
        {{ chunk.text }}
      </div>
      <div :style="{ fontSize: '12.5px', color: 'var(--color-text-3)', marginTop: '2px', lineHeight: 1.35 }">
        {{ chunk.meaning }}
      </div>
      <div
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
          flexWrap: 'wrap',
        }"
      >
        <TopicChip :topic-id="chunk.topic" :show-icon="true" size="sm" />
        <LevelPill :level="chunk.level" />
        <span
          :style="{
            fontSize: '11px',
            color: 'var(--color-text-3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }"
        >
          <Icon name="headphones" :size="11" />
          <span class="mono">{{ listenCount }}</span>
        </span>
        <span
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--color-text-3)',
          }"
        >
          <span class="dot" :class="`dot-${status}`" />
        </span>
      </div>
    </div>

    <button
      class="btn tap"
      :style="{
        width: '36px',
        height: '36px',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '12px',
        color: starred ? '#FCD34D' : 'var(--color-text-3)',
      }"
      :aria-pressed="starred"
      :aria-label="starred ? 'Bỏ sao' : 'Đánh dấu sao'"
      @click="onStar"
    >
      <Icon :name="starred ? 'star-filled' : 'star'" :size="18" />
    </button>
  </div>
</template>
