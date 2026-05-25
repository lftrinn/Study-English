<script setup lang="ts">
/**
 * QuestionCard renders any of the 7 TOEIC question kinds. The parent owns
 * the selected state — for single-answer questions that's a `number | null`
 * via v-model:selected. For multi-answer questions (cloze with N blanks,
 * passage with N sub-questions) the parent passes a `selectedMulti` array
 * and listens for `update:selectedMulti`.
 *
 * Audio: tapping the Play button on Listening parts triggers
 * speechService.speak() with the appropriate text (options narration for
 * Part 1, question for Part 2, context for Parts 3-4).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import Icon from '@/components/common/Icon.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { speechService } from '@/services/speechService';
import { getMediaUrl } from '@/services/toeicContentService';
import { useSettingsStore } from '@/stores/settingsStore';
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
    /** Single-answer selection (photo / qa / conv / talk / fill). */
    selected: number | null;
    /** Multi-answer selection — one slot per blank/sub-question. */
    selectedMulti?: Array<number | null>;
    showExplain?: boolean;
    /** Hide the part-chip + index header (used in ExamSection which renders its own). */
    compactHeader?: boolean;
  }>(),
  { showExplain: false, compactHeader: false, selectedMulti: () => [] },
);

const emit = defineEmits<{
  (e: 'update:selected', value: number | null): void;
  (e: 'update:selectedMulti', value: Array<number | null>): void;
}>();

const settings = useSettingsStore();

const part = computed(() => TOEIC_PARTS.find((p) => p.id === props.partId)!);
// Lock options only after the user has committed (showExplain === true).
// Before that they should be free to change their pick.
const isLocked = computed(() => props.showExplain === true);
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
  if (isLocked.value) return;
  // Toggle off if tapping the already-selected option, so the user can
  // unset and re-pick before committing.
  emit('update:selected', props.selected === i ? null : i);
}

function pickMulti(slot: number, i: number) {
  if (isLocked.value) return;
  const next = [...props.selectedMulti];
  while (next.length <= slot) next.push(null);
  next[slot] = next[slot] === i ? null : i;
  emit('update:selectedMulti', next);
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

// — Media resolution (real uploaded files → object URLs, else fallback) —
const imageUrl = ref<string | null>(null);
const audioUrl = ref<string | null>(null);
let audioEl: HTMLAudioElement | null = null;
// — Audio playback — prefer the uploaded file; fall back to TTS narration.
const isPlaying = ref(false);

watch(
  () => [props.q.image, props.q.audio] as const,
  async ([img, aud]) => {
    // Tear down any audio element bound to the previous question.
    if (audioEl) {
      audioEl.pause();
      audioEl = null;
    }
    isPlaying.value = false;
    imageUrl.value = await getMediaUrl(img);
    audioUrl.value = await getMediaUrl(aud);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (audioEl) {
    audioEl.pause();
    audioEl = null;
  }
});

function ttsText(): string {
  const q = props.q;
  if (q.kind === 'photo') {
    return q.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join('. ');
  }
  if (q.kind === 'qa') {
    return `${q.q}. ${q.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join('. ')}`;
  }
  if (q.kind === 'conv' || q.kind === 'talk') return q.context;
  return '';
}

async function playAudio() {
  // Uploaded file wins.
  if (audioUrl.value) {
    try {
      if (!audioEl) audioEl = new Audio(audioUrl.value);
      audioEl.playbackRate = settings.defaultSpeed;
      audioEl.currentTime = 0;
      isPlaying.value = true;
      audioEl.onended = () => (isPlaying.value = false);
      await audioEl.play();
    } catch {
      isPlaying.value = false;
    }
    return;
  }
  // Fallback: TTS narration of the text.
  const text = ttsText();
  if (!text) return;
  try {
    isPlaying.value = true;
    await speechService.speak({
      text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    /* canceled or unsupported — ignore */
  } finally {
    isPlaying.value = false;
  }
}

function replayAudio() {
  void playAudio();
}

// — Cloze / passage navigation —
const subIndex = ref(0);
const subTotal = computed(() => {
  if (isCloze(props.q)) return props.q.blanks.length;
  if (isPassage(props.q)) return props.q.questions.length;
  return 0;
});
const currentSubQ = computed(() => {
  if (isPassage(props.q)) return props.q.questions[subIndex.value];
  return null;
});
const currentBlank = computed(() => {
  if (isCloze(props.q)) return props.q.blanks[subIndex.value];
  return null;
});
function nextSub() {
  if (subIndex.value + 1 < subTotal.value) subIndex.value += 1;
}
function prevSub() {
  if (subIndex.value > 0) subIndex.value -= 1;
}
function gotoSub(i: number) {
  if (i >= 0 && i < subTotal.value) subIndex.value = i;
}

// For cloze: highlight the blank we're on in the passage
function clozePassageWithMarkers(passage: string, activeIdx: number): string {
  // Replace (N) ___ with [active marker] vs plain marker
  return passage.replace(/\((\d+)\) ___/g, (_, n) => {
    const num = parseInt(n, 10);
    return num === activeIdx ? `(${n}) ▮▮▮` : `(${n}) ▯▯▯`;
  });
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
    <div v-if="q.kind === 'photo'" class="qcard__photo" :style="!imageUrl ? {
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, color-mix(in oklch, ${part.color} 10%, transparent) 8px, color-mix(in oklch, ${part.color} 10%, transparent) 16px)`,
    } : {}">
      <img v-if="imageUrl" :src="imageUrl" :alt="q.topic" class="qcard__photo-img" />
      <div v-else class="qcard__photo-inner">
        <Icon name="headphones" :size="28" :style="{ color: 'var(--color-text-3)' }" />
        <span class="mono qcard__photo-label">{{ q.topic }} · chưa có ảnh</span>
      </div>
      <button class="btn tap qcard__photo-play" aria-label="Play audio" @click="playAudio">
        <Icon :name="isPlaying ? 'pause' : 'play'" :size="14" :style="{ color: '#fff', marginLeft: isPlaying ? 0 : '1px' }" />
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
      <button class="btn tap qcard__audio-play" aria-label="Play audio" @click="playAudio">
        <Icon :name="isPlaying ? 'pause' : 'play'" :size="16" :style="{ color: '#fff', marginLeft: isPlaying ? 0 : '1px' }" />
      </button>
      <div class="qcard__audio-meta">
        <div class="qcard__audio-label">Câu hỏi</div>
        <WaveBars :color="part.color" :playing="isPlaying" :size="18" />
        <div class="mono qcard__audio-time">{{ isPlaying ? 'Đang đọc…' : '0:00 / 0:04' }} · Aria · {{ settings.defaultSpeed.toFixed(2) }}×</div>
      </div>
      <button class="btn tap qcard__audio-replay" aria-label="Replay" @click="replayAudio">
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
        <button class="btn tap qcard__audio-play" aria-label="Play audio" @click="playAudio">
          <Icon :name="isPlaying ? 'pause' : 'play'" :size="16" :style="{ color: '#fff', marginLeft: isPlaying ? 0 : '1px' }" />
        </button>
        <div class="qcard__audio-meta">
          <div class="qcard__audio-label">{{ q.kind === 'talk' ? 'Bài nói' : 'Hội thoại' }}</div>
          <WaveBars :color="part.color" :playing="isPlaying" :size="18" />
          <div class="mono qcard__audio-time">{{ isPlaying ? 'Đang đọc…' : '0:00 / 0:18' }} · Aria · {{ settings.defaultSpeed.toFixed(2) }}×</div>
        </div>
        <button class="btn tap qcard__audio-replay" aria-label="Replay" @click="replayAudio">
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

    <!-- Cloze: multi-blank passage with stepper -->
    <div v-else-if="isCloze(q)" class="qcard__cloze">
      <div class="qcard__passage">{{ clozePassageWithMarkers(q.passage, currentBlank?.idx ?? 1) }}</div>
      <div class="qcard__sub-nav">
        <button class="btn tap qcard__sub-nav-btn" :disabled="subIndex === 0" @click="prevSub">
          <Icon name="chevron-left" :size="14" />
        </button>
        <div class="qcard__sub-pills">
          <button
            v-for="(b, i) in q.blanks"
            :key="b.idx"
            class="btn tap qcard__sub-pill"
            :class="{
              'is-active': i === subIndex,
              'is-filled': selectedMulti[i] != null,
              'is-correct': isLocked && selectedMulti[i] === b.correct,
              'is-wrong': isLocked && selectedMulti[i] != null && selectedMulti[i] !== b.correct,
            }"
            @click="gotoSub(i)"
          >({{ b.idx }})</button>
        </div>
        <button class="btn tap qcard__sub-nav-btn" :disabled="subIndex === subTotal - 1" @click="nextSub">
          <Icon name="chevron-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- Passage: scrollable text + sub-question stepper -->
    <div v-else-if="isPassage(q)" class="qcard__passage qcard__passage--scrollable">
      {{ q.passage }}
    </div>

    <!-- Prompt for fill / single-q passage / cloze sub-question -->
    <div v-if="'q' in q && q.kind !== 'fill' && !isPassage(q) && !isCloze(q)" class="qcard__prompt">{{ q.q }}</div>
    <div v-else-if="isCloze(q) && currentBlank" class="qcard__prompt">
      <span class="qcard__prompt-eye">Chỗ trống ({{ currentBlank.idx }})</span>
      Chọn từ phù hợp:
    </div>
    <div v-else-if="isPassage(q) && currentSubQ" class="qcard__prompt">
      <span class="qcard__prompt-eye">Câu {{ subIndex + 1 }} / {{ subTotal }}</span>
      {{ currentSubQ.q }}
    </div>

    <!-- Single-answer Options (photo / qa / conv / talk / fill) -->
    <div v-if="optionsForLayout && !isPassage(q) && !isCloze(q)" class="qcard__opts">
      <button
        v-for="(opt, i) in optionsForLayout"
        :key="i"
        class="btn tap qcard__opt"
        :disabled="isLocked"
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

    <!-- Cloze blank options -->
    <div v-if="isCloze(q) && currentBlank" class="qcard__opts">
      <button
        v-for="(opt, i) in currentBlank.options"
        :key="`cb-${subIndex}-${i}`"
        class="btn tap qcard__opt"
        :disabled="isLocked"
        :class="{
          'is-selected': selectedMulti[subIndex] === i && !showExplain,
          'is-correct': showExplain && i === currentBlank.correct,
          'is-wrong': showExplain && selectedMulti[subIndex] === i && i !== currentBlank.correct,
        }"
        @click="pickMulti(subIndex, i)"
      >
        <span class="qcard__opt-marker mono">
          <Icon v-if="showExplain && i === currentBlank.correct" name="check" :size="12" :style="{ color: '#fff' }" />
          <Icon v-else-if="showExplain && selectedMulti[subIndex] === i && i !== currentBlank.correct" name="x" :size="12" :style="{ color: '#fff' }" />
          <template v-else>{{ String.fromCharCode(65 + i) }}</template>
        </span>
        <span class="qcard__opt-text">{{ opt }}</span>
      </button>
    </div>

    <!-- Passage sub-question options + stepper -->
    <div v-if="isPassage(q) && currentSubQ" class="qcard__opts">
      <button
        v-for="(opt, i) in currentSubQ.options"
        :key="`pq-${subIndex}-${i}`"
        class="btn tap qcard__opt"
        :disabled="isLocked"
        :class="{
          'is-selected': selectedMulti[subIndex] === i && !showExplain,
          'is-correct': showExplain && i === currentSubQ.correct,
          'is-wrong': showExplain && selectedMulti[subIndex] === i && i !== currentSubQ.correct,
        }"
        @click="pickMulti(subIndex, i)"
      >
        <span class="qcard__opt-marker mono">
          <Icon v-if="showExplain && i === currentSubQ.correct" name="check" :size="12" :style="{ color: '#fff' }" />
          <Icon v-else-if="showExplain && selectedMulti[subIndex] === i && i !== currentSubQ.correct" name="x" :size="12" :style="{ color: '#fff' }" />
          <template v-else>{{ String.fromCharCode(65 + i) }}</template>
        </span>
        <span class="qcard__opt-text">{{ opt }}</span>
      </button>
    </div>

    <!-- Sub-question pager for passage -->
    <div v-if="isPassage(q) && subTotal > 1" class="qcard__sub-nav">
      <button class="btn tap qcard__sub-nav-btn" :disabled="subIndex === 0" @click="prevSub">
        <Icon name="chevron-left" :size="14" />
      </button>
      <div class="qcard__sub-pills">
        <button
          v-for="(_, i) in q.questions"
          :key="`pi-${i}`"
          class="btn tap qcard__sub-pill"
          :class="{
            'is-active': i === subIndex,
            'is-filled': selectedMulti[i] != null,
            'is-correct': isLocked && selectedMulti[i] === q.questions[i].correct,
            'is-wrong': isLocked && selectedMulti[i] != null && selectedMulti[i] !== q.questions[i].correct,
          }"
          @click="gotoSub(i)"
        >{{ i + 1 }}</button>
      </div>
      <button class="btn tap qcard__sub-nav-btn" :disabled="subIndex === subTotal - 1" @click="nextSub">
        <Icon name="chevron-right" :size="14" />
      </button>
    </div>

    <!-- Explanation -->
    <div v-if="showExplain && (q.explain || currentBlank?.explain || currentSubQ?.explain)" class="qcard__explain">
      <div class="qcard__explain-head">
        <Icon name="sparkle" :size="11" :style="{ color: 'var(--color-cyan)' }" />
        <span>Giải thích</span>
      </div>
      <div class="qcard__explain-body">
        {{ currentBlank?.explain || currentSubQ?.explain || q.explain }}
      </div>
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
.qcard__photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.qcard__prompt-eye {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-right: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 24%, transparent);
  vertical-align: middle;
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

/* Sub-question pager (cloze / passage) */
.qcard__sub-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qcard__sub-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  color: var(--color-text-2);
  flex-shrink: 0;
}
.qcard__sub-nav-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
.qcard__sub-pills {
  flex: 1;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.qcard__sub-pills::-webkit-scrollbar { display: none; }
.qcard__sub-pill {
  min-width: 38px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
}
.qcard__sub-pill.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}
.qcard__sub-pill.is-filled {
  background: color-mix(in oklch, var(--color-cyan) 16%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 32%, transparent);
  color: var(--color-cyan);
}
.qcard__sub-pill.is-correct {
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  border-color: var(--color-emerald);
  color: var(--color-emerald);
}
.qcard__sub-pill.is-wrong {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  border-color: var(--color-rose);
  color: var(--color-rose);
}

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
