<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import { answerCheckService } from '@/services/answerCheckService';
import { distractorService, type ChoiceOption } from '@/services/distractorService';
import { playlistService } from '@/services/playlistService';
import type { Chunk } from '@/types/chunk';
import type { PracticeMode } from '@/types/practice';

import ModeShell from '@/components/layout/ModeShell.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import PromptCard from '@/components/common/PromptCard.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import Icon from '@/components/common/Icon.vue';

type LearnQuestionType =
  | 'mc-meaning' // EN given, pick VI
  | 'mc-text' // VI given, pick EN
  | 'type-text' // VI given, type EN
  | 'listen-mc-meaning'
  | 'listen-type';

const router = useRouter();
const route = useRoute();
const practice = usePracticeStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const ui = useUiStore();

const sourceParam = computed(() => (route.query.source as string | undefined) ?? null);
const titleLabel = computed(() => {
  switch (sourceParam.value) {
    case 'review':
      return 'Ôn đến hạn';
    case 'mistakes':
      return 'Ôn chunk yếu';
    default:
      return 'Learn';
  }
});

const types: LearnQuestionType[] = ['mc-meaning', 'mc-text', 'type-text', 'listen-mc-meaning', 'listen-type'];

const questionTypes = ref<LearnQuestionType[]>([]);

const current = computed<Chunk | undefined>(() => practice.current);
const currentType = computed<LearnQuestionType>(
  () => questionTypes.value[practice.index] ?? 'mc-meaning',
);

const currentTopic = computed(() => (current.value ? chunks.topicById(current.value.topic) : undefined));

const isChoice = computed(
  () => currentType.value === 'mc-meaning' || currentType.value === 'mc-text' || currentType.value === 'listen-mc-meaning',
);
const isType = computed(
  () => currentType.value === 'type-text' || currentType.value === 'listen-type',
);
const isAudio = computed(
  () => currentType.value === 'listen-mc-meaning' || currentType.value === 'listen-type',
);

const promptColor = computed(() => {
  switch (currentType.value) {
    case 'mc-meaning':
      return currentTopic.value?.color ?? '#22D3EE';
    case 'mc-text':
      return '#A78BFA';
    case 'listen-mc-meaning':
    case 'listen-type':
      return '#22D3EE';
    case 'type-text':
      return '#F59E0B';
  }
  return '#22D3EE';
});
const promptIcon = computed(() => {
  switch (currentType.value) {
    case 'listen-mc-meaning':
    case 'listen-type':
      return 'headphones';
    case 'type-text':
      return 'edit';
    default:
      return 'brain';
  }
});
const promptLabel = computed(() => {
  switch (currentType.value) {
    case 'mc-meaning':
      return 'Choose the meaning';
    case 'mc-text':
      return 'Choose the English';
    case 'listen-mc-meaning':
      return 'Listen and choose';
    case 'listen-type':
      return 'Listen and type';
    case 'type-text':
      return 'Type the English';
  }
  return '';
});
const promptSublabel = computed(() => {
  switch (currentType.value) {
    case 'mc-meaning':
      return 'English';
    case 'mc-text':
    case 'type-text':
      return 'Vietnamese';
    case 'listen-mc-meaning':
    case 'listen-type':
      return 'Audio';
  }
  return undefined;
});
const promptText = computed(() => {
  switch (currentType.value) {
    case 'mc-meaning':
      return current.value?.text ?? '';
    case 'mc-text':
    case 'type-text':
      return current.value?.meaning ?? '';
    default:
      return '';
  }
});

const options = ref<ChoiceOption[]>([]);
const selectedIdx = ref<number | null>(null);
const typed = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const feedback = ref<'correct' | 'wrong' | null>(null);

const correctCount = computed(() => practice.correctCount);
const wrongCount = computed(() => practice.wrongCount);

const subtitle = computed(() => {
  if (practice.total === 0) return undefined;
  return `Question ${Math.min(practice.index + 1, practice.total)} of ${practice.total}`;
});

function buildOptions() {
  if (!current.value) return;
  const direction = currentType.value === 'mc-text' ? 'pick-text' : 'pick-meaning';
  options.value = distractorService.buildChoices({
    target: current.value,
    pool: chunks.chunks,
    direction,
  });
}

async function playAudio() {
  if (!current.value) return;
  try {
    await speechService.speak({
      text: current.value.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

async function pick(opt: ChoiceOption, i: number) {
  if (selectedIdx.value !== null || !current.value) return;
  selectedIdx.value = i;
  feedback.value = opt.isCorrect ? 'correct' : 'wrong';
  const modeMap: Record<LearnQuestionType, PracticeMode> = {
    'mc-meaning': 'multiple-choice',
    'mc-text': 'multiple-choice',
    'type-text': 'write',
    'listen-mc-meaning': 'multiple-choice',
    'listen-type': 'dictation',
  };
  await practice.submit({
    chunkId: current.value.id,
    prompt: currentType.value.startsWith('listen')
      ? '[audio]'
      : currentType.value === 'mc-text'
        ? current.value.text
        : current.value.meaning,
    expectedAnswer: currentType.value === 'mc-text' ? current.value.text : current.value.meaning,
    userAnswer: opt.label,
    isCorrect: opt.isCorrect,
    score: opt.isCorrect ? 1 : 0,
    modeOverride: modeMap[currentType.value],
  });
}

async function submitTyped() {
  if (typed.value.trim().length === 0 || !current.value) return;
  const r = answerCheckService.check(current.value.text, typed.value, {
    ignoreCase: true,
    ignorePunctuation: true,
  });
  feedback.value = r.isCorrect ? 'correct' : 'wrong';
  const modeMap: Record<LearnQuestionType, PracticeMode> = {
    'mc-meaning': 'multiple-choice',
    'mc-text': 'multiple-choice',
    'type-text': 'write',
    'listen-mc-meaning': 'multiple-choice',
    'listen-type': 'dictation',
  };
  await practice.submit({
    chunkId: current.value.id,
    prompt: currentType.value === 'listen-type' ? '[audio]' : current.value.meaning,
    expectedAnswer: current.value.text,
    userAnswer: typed.value,
    isCorrect: r.isCorrect,
    score: r.score,
    modeOverride: modeMap[currentType.value],
  });
}

function continueNext() {
  if (!feedback.value) return;
  practice.advance();
}

function resetQuestion() {
  selectedIdx.value = null;
  typed.value = '';
  feedback.value = null;
}

const correctAnswerText = computed(() => {
  if (!current.value) return '';
  if (currentType.value === 'mc-text' || currentType.value === 'type-text' || currentType.value === 'listen-type') {
    return current.value.text;
  }
  return current.value.meaning;
});

const correctOptionIdx = computed(() => options.value.findIndex((o) => o.isCorrect));

function buildList(): Chunk[] {
  switch (sourceParam.value) {
    case 'review':
      return playlistService.buildReview(chunks.chunks, progress.progressMap, { limit: 20 });
    case 'mistakes':
      return playlistService.buildMistakes(chunks.chunks, progress.progressMap, { limit: 20 });
    default: {
      const filtered = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks;
      const sorted = [...filtered].sort((a, b) => {
        const la = progress.byId(a.id)?.listenCount ?? 0;
        const lb = progress.byId(b.id)?.listenCount ?? 0;
        return la - lb;
      });
      return sorted.slice(0, 15);
    }
  }
}

function pickQuestionType(_chunk: Chunk, listenProgress?: number): LearnQuestionType {
  const listen = listenProgress ?? 0;
  if (listen < 2) {
    const a: LearnQuestionType[] = ['mc-meaning', 'mc-text', 'listen-mc-meaning'];
    return a[Math.floor(Math.random() * a.length)];
  }
  return types[Math.floor(Math.random() * types.length)];
}

function start() {
  const list = buildList();
  if (list.length === 0) return;
  questionTypes.value = list.map((c) =>
    pickQuestionType(c, progress.byId(c.id)?.listenCount),
  );
  practice.start({ mode: 'multiple-choice', chunks: list });
}

function shuffleRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  questionTypes.value = arr.map((c) =>
    pickQuestionType(c, progress.byId(c.id)?.listenCount),
  );
  practice.start({ mode: 'multiple-choice', chunks: arr });
}

function exit() {
  practice.reset();
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function openDetail() {
  if (current.value) ui.openChunkDetail(current.value.id);
}

watch(
  () => `${current.value?.id ?? ''}-${currentType.value}`,
  () => {
    resetQuestion();
    if (isChoice.value) buildOptions();
    if (isAudio.value) void playAudio();
    if (isType.value) void nextTick(() => inputRef.value?.focus());
  },
  { immediate: false },
);

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) start();
  if (isChoice.value && options.value.length === 0) buildOptions();
  if (isAudio.value) void playAudio();
});

watch(
  () => sourceParam.value,
  () => {
    practice.reset();
    start();
  },
);
</script>

<template>
  <ModeShell :title="titleLabel" :subtitle="subtitle" :on-close="exit" :on-more="openDetail">
    <template v-if="practice.status === 'active' && current">
      <div :style="{ padding: '0 20px' }">
        <ProgressBar
          :value="Math.min(practice.index + 1, practice.total)"
          :max="practice.total"
          :height="4"
        />
        <div
          :style="{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '11px',
            color: 'var(--color-text-3)',
          }"
        >
          <span :style="{ display: 'flex', alignItems: 'center', gap: '6px' }">
            <Icon name="check" :size="12" :style="{ color: 'var(--color-emerald)' }" />
            <span class="mono">{{ correctCount }}</span> correct
          </span>
          <span :style="{ display: 'flex', alignItems: 'center', gap: '6px' }">
            <span class="mono">{{ wrongCount }}</span> wrong
            <Icon name="close" :size="12" :style="{ color: 'var(--color-rose)' }" />
          </span>
        </div>
      </div>

      <div :style="{ flex: 1, padding: '20px', overflowY: 'auto' }">
        <!-- PromptCard -->
        <PromptCard
          :color="promptColor"
          :icon="promptIcon"
          :label="promptLabel"
          :sublabel="promptSublabel"
        >
          <template v-if="isAudio">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '14px' }">
              <PlayBtn :size="52" @click="playAudio" />
              <div :style="{ flex: 1 }">
                <WaveBars color="var(--color-cyan)" :playing="false" :size="26" />
                <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '6px' }">
                  Tap để nghe lại
                </div>
              </div>
            </div>
          </template>
          <div
            v-else
            :style="{
              fontSize: '22px',
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }"
          >{{ promptText }}</div>
        </PromptCard>

        <!-- Choices -->
        <div
          v-if="isChoice"
          :style="{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '14px',
          }"
        >
          <button
            v-for="(opt, i) in options"
            :key="opt.label"
            class="btn tap learn-opt"
            :class="{
              'is-correct': feedback && i === correctOptionIdx,
              'is-wrong': i === selectedIdx && feedback === 'wrong',
              'is-selected': i === selectedIdx && !feedback,
            }"
            :disabled="selectedIdx !== null"
            @click="pick(opt, i)"
          >
            <span class="learn-opt__letter">
              <Icon v-if="feedback && i === correctOptionIdx" name="check" :size="12" />
              <Icon v-else-if="i === selectedIdx && feedback === 'wrong'" name="close" :size="12" />
              <template v-else>{{ String.fromCharCode(65 + i) }}</template>
            </span>
            <span :style="{ flex: 1, textAlign: 'left' }">{{ opt.label }}</span>
          </button>
        </div>

        <!-- Type input -->
        <div v-else-if="isType" :style="{ marginTop: '18px' }">
          <div
            :style="{
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-2)',
              minHeight: '100px',
              display: 'flex',
            }"
          >
            <textarea
              ref="inputRef"
              v-model="typed"
              :disabled="feedback !== null"
              :placeholder="currentType === 'listen-type' ? 'Type what you heard…' : 'Type the English chunk…'"
              :style="{
                width: '100%',
                height: '80px',
                resize: 'none',
                background: 'transparent',
                border: 0,
                outline: 'none',
                color: 'var(--color-text-1)',
                fontSize: '16px',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }"
            />
          </div>
          <div
            :style="{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--color-text-3)',
            }"
          >
            <span><span class="mono">{{ typed.length }}</span> / {{ current?.text.length ?? 0 }} chars</span>
            <button
              v-if="!feedback"
              class="btn tap"
              :disabled="typed.trim().length === 0"
              :style="{
                color: typed.trim().length === 0 ? 'var(--color-text-4)' : 'var(--color-cyan)',
                fontWeight: 700,
                fontSize: '12px',
              }"
              @click="submitTyped"
            >Kiểm tra →</button>
          </div>
        </div>
      </div>

      <!-- Feedback + Continue -->
      <div :style="{ padding: '0 20px 20px' }">
        <div
          v-if="feedback"
          :style="{
            background: feedback === 'correct' ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
            border: feedback === 'correct'
              ? '1px solid rgba(52,211,153,0.35)'
              : '1px solid rgba(251,113,133,0.35)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '12px',
          }"
        >
          <div
            :style="{
              fontSize: '12px',
              fontWeight: 700,
              color: feedback === 'correct' ? 'var(--color-emerald)' : 'var(--color-rose)',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }"
          >{{ feedback === 'correct' ? 'Nice!' : 'Not quite' }}</div>
          <div
            v-if="feedback === 'wrong'"
            :style="{ fontSize: '13px', marginTop: '4px', color: 'var(--color-text-2)' }"
          >
            The answer is <b :style="{ color: 'var(--color-text-1)' }">{{ correctAnswerText }}</b>
            <span
              v-if="current?.phonetic"
              class="mono"
              :style="{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--color-amber)' }"
            >{{ current.phonetic }}</span>
          </div>
          <div
            v-else
            :style="{ fontSize: '13px', marginTop: '4px', color: 'var(--color-text-2)' }"
          >Lock vào pile Familiar. +2 XP</div>
        </div>
        <button
          class="btn tap"
          :disabled="!feedback"
          :style="{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            fontSize: '15px',
            fontWeight: 700,
            background: feedback ? 'var(--grad-primary)' : 'var(--color-surface-2)',
            color: feedback ? '#fff' : 'var(--color-text-3)',
            border: feedback ? 'none' : '1px solid var(--color-border-1)',
            opacity: feedback ? 1 : 0.6,
            cursor: feedback ? 'pointer' : 'not-allowed',
            textShadow: feedback ? '0 1px 1.5px rgba(0,0,0,0.18)' : 'none',
            boxShadow: feedback ? '0 10px 28px rgba(34,211,238,0.21), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset' : 'none',
          }"
          @click="continueNext"
        >{{ feedback ? 'Continue →' : 'Pick an answer' }}</button>
      </div>
    </template>

    <template v-else-if="practice.status === 'finished'">
      <StudySessionSummary
        :title="practice.correctCount >= practice.total * 0.8 ? 'Tốt lắm!' : 'Cố thêm chút nữa nhé'"
        :total="practice.total"
        :correct-count="practice.correctCount"
        :wrong-count="practice.wrongCount"
        primary-label="Xong"
        secondary-label="Làm lại"
        @primary="exit"
        @secondary="shuffleRestart"
      />
    </template>

    <EmptyState
      v-else
      icon="sparkles"
      :title="`${titleLabel} — chưa có chunk`"
      :hint="
        sourceParam === 'review'
          ? 'Chưa có chunk nào đến hạn ôn.'
          : sourceParam === 'mistakes'
          ? 'Bạn chưa có chunk nào sai trong các phiên trước.'
          : 'Mở Library, lọc chủ đề rồi quay lại.'
      "
    >
      <button
        class="btn tap"
        :style="{
          padding: '12px 18px',
          borderRadius: '14px',
          background: 'var(--grad-primary)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 700,
          textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
          boxShadow: '0 10px 28px rgba(34,211,238,0.21), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
        }"
        @click="start"
      >Bắt đầu</button>
    </EmptyState>
  </ModeShell>
</template>

<style scoped>
.learn-opt {
  padding: 14px 16px;
  text-align: left;
  border-radius: 16px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-1);
}
.learn-opt:disabled {
  cursor: default;
}
.learn-opt.is-selected {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
}
.learn-opt.is-correct {
  background: rgba(52, 211, 153, 0.16);
  border-color: var(--color-emerald);
}
.learn-opt.is-wrong {
  background: rgba(251, 113, 133, 0.16);
  border-color: var(--color-rose);
}
.learn-opt__letter {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--color-surface-3);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  font-family: var(--font-mono);
}
.learn-opt.is-correct .learn-opt__letter {
  background: var(--color-emerald);
  color: #0b0f22;
}
.learn-opt.is-wrong .learn-opt__letter {
  background: var(--color-rose);
  color: #0b0f22;
}
</style>
