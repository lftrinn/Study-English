<script setup lang="ts">
/**
 * QuestionCard renders any of the 7 TOEIC question kinds. The parent owns
 * the selected/showExplain state — keep this component as a pure
 * presentational view so it can be embedded in PartPractice, MiniTest,
 * SkillPractice, and ExamMode without coupling.
 */
import { computed } from 'vue';

import Icon from '@/components/common/Icon.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import type {
  TOEICClozeQuestion,
  TOEICFillQuestion,
  TOEICPassageQuestion,
  TOEICQuestion,
} from '@/types/toeic';

const props = withDefaults(
  defineProps<{
    q: TOEICQuestion;
    partId: number;
    qIndex: number;
    total: number;
    selected: number | null;
    showExplain?: boolean;
    /** Hide the part-chip + index header (used in ExamSection which renders its own). */
    compactHeader?: boolean;
  }>(),
  { showExplain: false, compactHeader: false },
);

const emit = defineEmits<{
  (e: 'update:selected', value: number | null): void;
}>();

const part = computed(() => TOEIC_PARTS.find((p) => p.id === props.partId)!);
const isAnswered = computed(() => props.selected !== null && props.selected !== undefined);
const correctIdx = computed(() => {
  const q = props.q;
  if ('correct' in q) return q.correct;
  return 0;
});

const optionsForLayout = computed(() => {
  const q = props.q;
  if ('options' in q) return q.options;
  return null;
});

function pickOption(i: number) {
  if (isAnswered.value) return;
  emit('update:selected', i);
}

// — Fill stimulus — split on _____ blanks
function splitFill(text: string) {
  return text.split(/_+/);
}

function isFill(q: TOEICQuestion): q is TOEICFillQuestion {
  return q.kind === 'fill';
}
function isCloze(q: TOEICQuestion): q is TOEICClozeQuestion {
  return q.kind === 'cloze';
}
function isPassage(q: TOEICQuestion): q is TOEICPassageQuestion {
  return q.kind === 'passage';
}
</script>

<template>
  <div class="qcard glass">
    <!-- Header: Part chip + counter -->
    <div v-if="!compactHeader" class="qcard__head">
      <span
        class="qcard__part-chip"
        :style="{
          background: `color-mix(in oklch, ${part.color} 18%, transparent)`,
          color: part.color,
          borderColor: `color-mix(in oklch, ${part.color} 35%, transparent)`,
        }"
      >
        <span class="mono">P{{ part.id }}</span> · {{ part.vi }}
      </span>
      <span class="mono qcard__counter">{{ qIndex + 1 }} / {{ total }}</span>
    </div>

    <!-- Stimulus -->
    <div v-if="q.kind === 'photo'" class="qcard__photo" :style="{
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, color-mix(in oklch, ${part.color} 10%, transparent) 8px, color-mix(in oklch, ${part.color} 10%, transparent) 16px)`,
    }">
      <div class="qcard__photo-inner">
        <Icon name="headphones" :size="28" :style="{ color: 'var(--color-text-3)' }" />
        <span class="mono qcard__photo-label">{{ q.topic }} · photo</span>
      </div>
      <button class="btn tap qcard__photo-play" aria-label="Play audio">
        <Icon name="play" :size="14" :style="{ color: '#fff', marginLeft: '1px' }" />
      </button>
    </div>

    <div
      v-else-if="q.kind === 'qa'"
      class="qcard__audio"
      :style="{
        background: `linear-gradient(135deg, color-mix(in oklch, ${part.color} 14%, transparent), color-mix(in oklch, ${part.color} 4%, transparent))`,
        borderColor: `color-mix(in oklch, ${part.color} 24%, transparent)`,
      }"
    >
      <button class="btn tap qcard__audio-play" aria-label="Play audio">
        <Icon name="play" :size="16" :style="{ color: '#fff', marginLeft: '1px' }" />
      </button>
      <div class="qcard__audio-meta">
        <div class="qcard__audio-label">Câu hỏi</div>
        <WaveBars :color="part.color" :playing="false" :size="18" />
        <div class="mono qcard__audio-time">0:00 / 0:04 · Aria · 1.00×</div>
      </div>
      <button class="btn tap qcard__audio-replay" aria-label="Replay">
        <Icon name="refresh" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
    </div>

    <div v-else-if="q.kind === 'conv' || q.kind === 'talk'">
      <div
        class="qcard__audio"
        :style="{
          background: `linear-gradient(135deg, color-mix(in oklch, ${part.color} 14%, transparent), color-mix(in oklch, ${part.color} 4%, transparent))`,
          borderColor: `color-mix(in oklch, ${part.color} 24%, transparent)`,
        }"
      >
        <button class="btn tap qcard__audio-play" aria-label="Play audio">
          <Icon name="play" :size="16" :style="{ color: '#fff', marginLeft: '1px' }" />
        </button>
        <div class="qcard__audio-meta">
          <div class="qcard__audio-label">{{ q.kind === 'talk' ? 'Bài nói' : 'Hội thoại' }}</div>
          <WaveBars :color="part.color" :playing="false" :size="18" />
          <div class="mono qcard__audio-time">0:00 / 0:18 · Aria · 1.00×</div>
        </div>
        <button class="btn tap qcard__audio-replay" aria-label="Replay">
          <Icon name="refresh" :size="14" :style="{ color: 'var(--color-text-2)' }" />
        </button>
      </div>
      <div class="qcard__script">
        <span class="qcard__script-label">Script (ẩn khi thi)</span>
        {{ q.context }}
      </div>
    </div>

    <div v-else-if="isFill(q)" class="qcard__fill">
      <template v-for="(seg, i) in splitFill(q.q)" :key="i">
        <span>{{ seg }}</span>
        <span v-if="i < splitFill(q.q).length - 1" class="qcard__fill-blank" />
      </template>
    </div>

    <div v-else-if="isCloze(q)" class="qcard__passage">
      {{ q.passage }}
    </div>

    <div v-else-if="isPassage(q)" class="qcard__passage qcard__passage--scrollable">
      {{ q.passage }}
    </div>

    <!-- Prompt -->
    <div v-if="'q' in q && q.kind !== 'fill'" class="qcard__prompt">{{ q.q }}</div>
    <div v-else-if="isPassage(q) && q.questions[0]" class="qcard__prompt">{{ q.questions[0].q }}</div>

    <!-- Options -->
    <div v-if="optionsForLayout" class="qcard__opts">
      <button
        v-for="(opt, i) in optionsForLayout"
        :key="i"
        class="btn tap qcard__opt"
        :disabled="isAnswered"
        :class="{
          'is-selected': selected === i && !showExplain,
          'is-correct': showExplain && i === correctIdx,
          'is-wrong': showExplain && selected === i && i !== correctIdx,
        }"
        @click="pickOption(i)"
      >
        <span class="qcard__opt-marker mono">
          <Icon v-if="showExplain && i === correctIdx" name="check" :size="12" :style="{ color: '#fff' }" />
          <Icon v-else-if="showExplain && selected === i && i !== correctIdx" name="x" :size="12" :style="{ color: '#fff' }" />
          <template v-else>{{ String.fromCharCode(65 + i) }}</template>
        </span>
        <span class="qcard__opt-text">{{ opt }}</span>
      </button>
    </div>

    <!-- Passage: sub-questions for the first one only (parents drive multi-sub flow). -->
    <div v-if="isPassage(q) && q.questions[0]" class="qcard__opts">
      <button
        v-for="(opt, i) in q.questions[0].options"
        :key="`pq-${i}`"
        class="btn tap qcard__opt"
        :disabled="isAnswered"
        :class="{
          'is-selected': selected === i && !showExplain,
          'is-correct': showExplain && i === q.questions[0].correct,
          'is-wrong': showExplain && selected === i && i !== q.questions[0].correct,
        }"
        @click="pickOption(i)"
      >
        <span class="qcard__opt-marker mono">
          <Icon v-if="showExplain && i === q.questions[0].correct" name="check" :size="12" :style="{ color: '#fff' }" />
          <Icon v-else-if="showExplain && selected === i && i !== q.questions[0].correct" name="x" :size="12" :style="{ color: '#fff' }" />
          <template v-else>{{ String.fromCharCode(65 + i) }}</template>
        </span>
        <span class="qcard__opt-text">{{ opt }}</span>
      </button>
    </div>

    <!-- Explanation -->
    <div v-if="showExplain && q.explain" class="qcard__explain">
      <div class="qcard__explain-head">
        <Icon name="sparkle" :size="11" :style="{ color: 'var(--color-cyan)' }" />
        <span>Giải thích</span>
      </div>
      <div class="qcard__explain-body">{{ q.explain }}</div>
      <div v-if="q.tags && q.tags.length > 0" class="qcard__tags">
        <span v-for="t in q.tags" :key="t" class="mono qcard__tag">{{ t }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qcard {
  padding: 16px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.qcard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qcard__part-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid;
}
.qcard__counter { font-size: 11px; color: var(--color-text-3); }

.qcard__photo {
  aspect-ratio: 16 / 11;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, var(--color-surface-2), var(--color-surface-3));
  border: 1px solid var(--color-border-1);
}
.qcard__photo-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}
.qcard__photo-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.qcard__photo-play {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grad-primary);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 14px rgba(34, 211, 238, 0.5);
}

.qcard__audio {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 12px;
}
.qcard__audio-play {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--grad-primary);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 18px rgba(34, 211, 238, 0.4);
  flex-shrink: 0;
}
.qcard__audio-meta {
  flex: 1;
  min-width: 0;
}
.qcard__audio-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.qcard__audio-time {
  font-size: 10px;
  color: var(--color-text-3);
  margin-top: 2px;
}
.qcard__audio-replay {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.qcard__script {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
  font-size: 12px;
  color: var(--color-text-3);
  font-style: italic;
  line-height: 1.5;
}
.qcard__script-label {
  color: var(--color-text-4);
  text-transform: uppercase;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-right: 6px;
}

.qcard__fill {
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-2);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
}
.qcard__fill-blank {
  display: inline-block;
  min-width: 70px;
  height: 22px;
  margin: 0 4px;
  border-bottom: 2px dashed var(--color-cyan);
  vertical-align: middle;
}

.qcard__passage {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 13px;
  line-height: 1.55;
  font-family: var(--font-body);
  color: var(--color-text-2);
  white-space: pre-wrap;
}
.qcard__passage--scrollable {
  max-height: 240px;
  overflow-y: auto;
}

.qcard__prompt {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--color-text-1);
}

.qcard__opts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qcard__opt {
  padding: 12px 14px;
  text-align: left;
  border-radius: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-1);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.qcard__opt.is-selected {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
}
.qcard__opt.is-correct {
  background: rgba(52, 211, 153, 0.16);
  border-color: var(--color-emerald);
}
.qcard__opt.is-wrong {
  background: rgba(251, 113, 133, 0.16);
  border-color: var(--color-rose);
}
.qcard__opt[disabled] { cursor: default; }

.qcard__opt-marker {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  background: var(--color-surface-3);
  color: var(--color-text-3);
}
.qcard__opt.is-selected .qcard__opt-marker {
  background: var(--color-cyan);
  color: #0b0f22;
}
.qcard__opt.is-correct .qcard__opt-marker {
  background: var(--color-emerald);
  color: #0b0f22;
}
.qcard__opt.is-wrong .qcard__opt-marker {
  background: var(--color-rose);
  color: #0b0f22;
}
.qcard__opt-text { flex: 1; }

.qcard__explain {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-cyan) 9%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 22%, transparent);
}
.qcard__explain-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.qcard__explain-body {
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1.5;
}
.qcard__tags {
  display: flex;
  gap: 5px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.qcard__tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--color-surface-2);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
}
</style>
