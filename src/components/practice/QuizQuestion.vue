<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Chunk } from '@/types/chunk';
import type { AnswerCheckResult, PracticeMode } from '@/types/practice';

import { answerCheckService } from '@/services/answerCheckService';
import { distractorService, type ChoiceOption } from '@/services/distractorService';
import { speechService } from '@/services/speechService';
import { useSettingsStore } from '@/stores/settingsStore';

import TopicChip from '@/components/chunk/TopicChip.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';
import AnswerDiff from './AnswerDiff.vue';

export type LearnQuestionType =
  | 'mc-meaning' // EN given, pick VI
  | 'mc-text' // VI given, pick EN
  | 'type-text' // VI given, type EN
  | 'listen-mc-meaning' // audio given, pick VI
  | 'listen-type'; // audio given, type EN

const props = defineProps<{
  chunk: Chunk;
  type: LearnQuestionType;
  pool: Chunk[];
}>();

const emit = defineEmits<{
  submit: [
    {
      chunk: Chunk;
      type: LearnQuestionType;
      mode: PracticeMode;
      userAnswer: string;
      expectedAnswer: string;
      isCorrect: boolean;
      score: number;
    },
  ];
  next: [];
}>();

const settings = useSettingsStore();

const options = ref<ChoiceOption[]>([]);
const picked = ref<string | null>(null);
const typed = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const checkResult = ref<AnswerCheckResult | null>(null);

const isChoiceType = computed(() =>
  props.type === 'mc-meaning' || props.type === 'mc-text' || props.type === 'listen-mc-meaning',
);
const isTypeType = computed(() => props.type === 'type-text' || props.type === 'listen-type');
const isAudioType = computed(() =>
  props.type === 'listen-mc-meaning' || props.type === 'listen-type',
);

const promptCaption = computed(() => {
  switch (props.type) {
    case 'mc-meaning':
    case 'mc-text':
      return 'Chọn đáp án đúng';
    case 'type-text':
      return 'Gõ chunk bằng English';
    case 'listen-mc-meaning':
      return 'Nghe rồi chọn nghĩa đúng';
    case 'listen-type':
      return 'Nghe rồi gõ chunk';
  }
  return '';
});

const promptText = computed(() => {
  if (props.type === 'mc-meaning') return props.chunk.text;
  if (props.type === 'mc-text' || props.type === 'type-text') return props.chunk.meaning;
  return '';
});

const submitted = computed(() => picked.value !== null || checkResult.value !== null);

function buildOptions() {
  const direction = props.type === 'mc-text' ? 'pick-text' : 'pick-meaning';
  options.value = distractorService.buildChoices({
    target: props.chunk,
    pool: props.pool,
    direction,
  });
}

async function playAudio() {
  try {
    await speechService.speak({
      text: props.chunk.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

function pick(opt: ChoiceOption) {
  if (submitted.value) return;
  picked.value = opt.label;
  const modeMap: Record<LearnQuestionType, PracticeMode> = {
    'mc-meaning': 'multiple-choice',
    'mc-text': 'multiple-choice',
    'type-text': 'write',
    'listen-mc-meaning': 'multiple-choice',
    'listen-type': 'dictation',
  };
  emit('submit', {
    chunk: props.chunk,
    type: props.type,
    mode: modeMap[props.type],
    userAnswer: opt.label,
    expectedAnswer:
      props.type === 'mc-text' ? props.chunk.text : props.chunk.meaning,
    isCorrect: opt.isCorrect,
    score: opt.isCorrect ? 1 : 0,
  });
}

function submitTyped() {
  if (typed.value.trim().length === 0) return;
  const r = answerCheckService.check(props.chunk.text, typed.value, {
    ignoreCase: true,
    ignorePunctuation: true,
  });
  checkResult.value = r;
  const modeMap: Record<LearnQuestionType, PracticeMode> = {
    'mc-meaning': 'multiple-choice',
    'mc-text': 'multiple-choice',
    'type-text': 'write',
    'listen-mc-meaning': 'multiple-choice',
    'listen-type': 'dictation',
  };
  emit('submit', {
    chunk: props.chunk,
    type: props.type,
    mode: modeMap[props.type],
    userAnswer: typed.value,
    expectedAnswer: props.chunk.text,
    isCorrect: r.isCorrect,
    score: r.score,
  });
}

function next() {
  emit('next');
}

function reset() {
  picked.value = null;
  typed.value = '';
  checkResult.value = null;
}

watch(
  () => `${props.chunk.id}-${props.type}`,
  () => {
    reset();
    if (isChoiceType.value) buildOptions();
    if (isAudioType.value) void playAudio();
    if (isTypeType.value) void nextTick(() => inputRef.value?.focus());
  },
  { immediate: true },
);

onMounted(() => {
  if (isChoiceType.value && options.value.length === 0) buildOptions();
  if (isAudioType.value) void playAudio();
  if (isTypeType.value) void nextTick(() => inputRef.value?.focus());
});

function optionState(opt: ChoiceOption): 'idle' | 'correct' | 'wrong' | 'reveal' {
  if (!submitted.value) return 'idle';
  if (opt.label === picked.value) {
    return opt.isCorrect ? 'correct' : 'wrong';
  }
  if (opt.isCorrect) return 'reveal';
  return 'idle';
}
</script>

<template>
  <article class="qq glass-strong">
    <header class="qq__head">
      <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
      <LevelPill :level="chunk.level" />
    </header>

    <p class="qq__caption">{{ promptCaption }}</p>

    <!-- Audio header for listen types -->
    <div v-if="isAudioType" class="qq__player">
      <button class="qq__play tap" :aria-label="'Phát'" @click="playAudio">
        <Icon name="volume" :size="22" />
      </button>
      <span class="qq__player-hint">Tap để nghe lại</span>
    </div>

    <p v-else class="qq__prompt">{{ promptText }}</p>

    <!-- Multiple choice options -->
    <div v-if="isChoiceType" class="qq__choices">
      <button
        v-for="opt in options"
        :key="opt.label"
        class="qq__choice tap"
        :class="`is-${optionState(opt)}`"
        :disabled="submitted"
        @click="pick(opt)"
      >
        <span class="qq__choice-label">{{ opt.label }}</span>
        <span v-if="optionState(opt) === 'correct'" class="qq__choice-icon">
          <Icon name="check" :size="16" />
        </span>
        <span v-else-if="optionState(opt) === 'wrong'" class="qq__choice-icon">
          <Icon name="x" :size="16" />
        </span>
      </button>
    </div>

    <!-- Type input -->
    <div v-else-if="isTypeType" class="qq__type">
      <input
        ref="inputRef"
        v-model="typed"
        type="text"
        class="qq__input"
        :placeholder="type === 'listen-type' ? 'Gõ những gì bạn nghe...' : 'Gõ chunk bằng English...'"
        :disabled="submitted"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        @keydown.enter="submitted ? next() : submitTyped()"
      />
      <AppButton
        v-if="!submitted"
        variant="primary"
        size="md"
        block
        :disabled="typed.trim().length === 0"
        @click="submitTyped"
      >
        <Icon name="check" :size="14" />
        Kiểm tra
      </AppButton>
    </div>

    <!-- Result + next -->
    <div v-if="submitted" class="qq__result">
      <p v-if="isTypeType && checkResult" class="qq__result-line">
        <span class="qq__badge" :class="{ ok: checkResult.isCorrect, bad: !checkResult.isCorrect }">
          {{ checkResult.isCorrect ? 'Đúng rồi' : 'Cần sửa' }}
        </span>
        <span class="qq__result-meta">{{ Math.round(checkResult.score * 100) }}% khớp từ</span>
      </p>
      <AnswerDiff v-if="isTypeType && checkResult" :result="checkResult" />

      <p v-if="isAudioType || isTypeType || picked" class="qq__expected">
        <span class="qq__expected-label">Đáp án</span>
        {{ chunk.text }} <span class="qq__expected-vi">— {{ chunk.meaning }}</span>
      </p>

      <AppButton variant="primary" size="md" block @click="next">
        <Icon name="arrow-right" :size="14" />
        Tiếp tục
      </AppButton>
    </div>
  </article>
</template>

<style scoped>
.qq {
  padding: 18px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.qq__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.qq__caption {
  margin: 4px 0 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.qq__prompt {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.015em;
  color: var(--color-text-1);
}

.qq__player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.qq__play {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px -12px rgba(34, 211, 238, 0.55);
}
.qq__player-hint {
  font-size: 12px;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.qq__choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qq__choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  text-align: left;
  font-size: 14px;
  font-weight: 600;
}
.qq__choice.is-correct {
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-emerald) 45%, transparent);
  color: var(--color-emerald);
}
.qq__choice.is-wrong {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-rose) 45%, transparent);
  color: var(--color-rose);
}
.qq__choice.is-reveal {
  background: color-mix(in oklch, var(--color-emerald) 10%, transparent);
  border-color: color-mix(in oklch, var(--color-emerald) 30%, transparent);
  color: var(--color-emerald);
  opacity: 0.85;
}
.qq__choice-label {
  flex: 1;
}
.qq__choice-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: currentColor;
  color: var(--color-bg-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.qq__type {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qq__input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--color-border-1);
  background: var(--color-surface-1);
  font-family: var(--font-ui);
  font-size: 16px;
  color: var(--color-text-1);
}
.qq__input:focus {
  outline: 2px solid color-mix(in oklch, var(--color-cyan) 40%, transparent);
  outline-offset: 2px;
}

.qq__result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}
.qq__result-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.qq__badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.qq__badge.ok {
  color: var(--color-emerald);
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
}
.qq__badge.bad {
  color: var(--color-rose);
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
}
.qq__result-meta {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-3);
}
.qq__expected {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 14px;
  color: var(--color-text-1);
  font-weight: 600;
}
.qq__expected-label {
  display: inline-block;
  margin-right: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.qq__expected-vi {
  color: var(--color-text-3);
  font-weight: 500;
}
</style>
