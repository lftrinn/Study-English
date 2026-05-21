<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Chunk, ChunkLevel, ChunkSource } from '@/types/chunk';
import type { PracticeMode } from '@/types/practice';

import QuizQuestion, {
  type LearnQuestionType,
} from '@/components/practice/QuizQuestion.vue';
import AppCard from '@/components/common/AppCard.vue';
import AppButton from '@/components/common/AppButton.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const practice = usePracticeStore();
const player = usePlayerStore();

type Difficulty = 'easy' | 'mix' | 'hard';
type Phase = 'setup' | 'running' | 'result';

const phase = ref<Phase>('setup');

const count = ref<5 | 10 | 15 | 20>(10);
const topicId = ref<string | 'all'>('all');
const level = ref<ChunkLevel | 'all'>('all');
const source = ref<ChunkSource | 'all'>('all');
const difficulty = ref<Difficulty>('mix');
const onlyStarred = ref(false);
const onlyWeak = ref(false);
const onlyDue = ref(false);

const questionTypes = ref<LearnQuestionType[]>([]);
const startedAt = ref(0);
const elapsedSec = ref(0);
let elapsedTimer: number | null = null;

const DIFFICULTY_TYPES: Record<Difficulty, LearnQuestionType[]> = {
  easy: ['mc-meaning', 'mc-text', 'listen-mc-meaning'],
  mix: ['mc-meaning', 'mc-text', 'type-text', 'listen-mc-meaning'],
  hard: ['mc-meaning', 'mc-text', 'type-text', 'listen-mc-meaning', 'listen-type'],
};

const sources: Array<{ key: ChunkSource | 'all'; label: string }> = [
  { key: 'all', label: 'Tất cả pack' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'interview', label: 'Interview' },
  { key: 'toeic', label: 'TOEIC' },
  { key: 'angular', label: 'Angular' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'profile', label: 'Profile' },
];

const levels: Array<{ key: ChunkLevel | 'all'; label: string }> = [
  { key: 'all', label: 'Mọi cấp' },
  { key: 'A1', label: 'A1' },
  { key: 'A2', label: 'A2' },
  { key: 'B1', label: 'B1' },
];

const eligibleChunks = computed<Chunk[]>(() => {
  return chunks.chunks.filter((c) => {
    if (topicId.value !== 'all' && c.topic !== topicId.value) return false;
    if (level.value !== 'all' && c.level !== level.value) return false;
    if (source.value !== 'all' && c.source !== source.value) return false;
    const p = progress.byId(c.id);
    if (onlyStarred.value && !p?.starred) return false;
    if (onlyWeak.value) {
      if (!p || p.wrongCount === 0 || p.wrongCount < p.correctCount) return false;
    }
    if (onlyDue.value) {
      const now = new Date().toISOString();
      if (!p?.nextReviewAt || p.nextReviewAt > now) return false;
    }
    return true;
  });
});

const eligibleCount = computed(() => eligibleChunks.value.length);
const canStart = computed(() => eligibleCount.value >= 2);

const current = computed<Chunk | undefined>(() => practice.current);
const currentType = computed<LearnQuestionType>(
  () => questionTypes.value[practice.index] ?? 'mc-meaning',
);
const progressPct = computed(() => practice.progressPct);

const accuracy = computed(() => {
  const total = practice.correctCount + practice.wrongCount;
  if (total === 0) return 0;
  return Math.round((practice.correctCount / total) * 100);
});

const wrongChunks = computed<Chunk[]>(() =>
  practice.results
    .filter((r) => !r.isCorrect)
    .map((r) => chunks.byId(r.chunkId))
    .filter((c): c is Chunk => Boolean(c)),
);

const elapsedLabel = computed(() => {
  const mm = Math.floor(elapsedSec.value / 60).toString().padStart(2, '0');
  const ss = (elapsedSec.value % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
});

function pickType(_chunk: Chunk): LearnQuestionType {
  const pool = DIFFICULTY_TYPES[difficulty.value];
  return pool[Math.floor(Math.random() * pool.length)];
}

function startTimer() {
  startedAt.value = Date.now();
  elapsedSec.value = 0;
  elapsedTimer = window.setInterval(() => {
    elapsedSec.value = Math.floor((Date.now() - startedAt.value) / 1000);
  }, 1000) as unknown as number;
}

function stopTimer() {
  if (elapsedTimer !== null) {
    window.clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

function start() {
  if (!canStart.value) return;
  const pool = [...eligibleChunks.value];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const list = pool.slice(0, count.value);
  questionTypes.value = list.map((c) => pickType(c));
  practice.start({ mode: 'test', chunks: list });
  phase.value = 'running';
  startTimer();
}

async function onSubmit(e: {
  chunk: Chunk;
  type: LearnQuestionType;
  mode: PracticeMode;
  userAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
  score: number;
}) {
  await practice.submit({
    chunkId: e.chunk.id,
    prompt: e.type.startsWith('listen') ? '[audio]' : e.expectedAnswer,
    expectedAnswer: e.expectedAnswer,
    userAnswer: e.userAnswer,
    isCorrect: e.isCorrect,
    score: e.score,
    modeOverride: e.mode,
  });
}

function onNext() {
  practice.advance();
  if (practice.status === 'finished') {
    stopTimer();
    phase.value = 'result';
  }
}

function exit() {
  stopTimer();
  practice.reset();
  router.replace('/');
}

function newTest() {
  stopTimer();
  practice.reset();
  questionTypes.value = [];
  phase.value = 'setup';
}

function reviewMistakes() {
  router.push({ path: '/study/learn', query: { source: 'mistakes' } });
}

function playMistakes() {
  if (wrongChunks.value.length === 0) return;
  player.setQueue([...wrongChunks.value], { mode: 'review' });
  void player.play();
  router.push('/player');
}
</script>

<template>
  <section class="tv">
    <header class="tv__head safe-pt">
      <button class="tv__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="tv__head-info">
        <p class="text-caption text-text-3">Mini Test</p>
        <p v-if="phase === 'running'" class="tv__counter">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
        <p v-else-if="phase === 'result'" class="tv__counter">{{ elapsedLabel }}</p>
      </div>
      <span class="tv__icon tv__icon--ghost" aria-hidden="true">
        <Icon name="trophy" :size="18" />
      </span>
    </header>

    <!-- Setup -->
    <template v-if="phase === 'setup'">
      <AppCard variant="glass-strong" padding="lg" class="tv__section">
        <p class="tv__section-label">Số câu</p>
        <div class="tv__chips">
          <button
            v-for="n in ([5, 10, 15, 20] as const)"
            :key="n"
            class="tv__chip tap"
            :class="{ 'is-active': count === n }"
            @click="count = n"
          >
            {{ n }}
          </button>
        </div>
      </AppCard>

      <AppCard variant="glass-strong" padding="lg" class="tv__section">
        <p class="tv__section-label">Độ khó</p>
        <div class="tv__chips">
          <button
            class="tv__chip tap"
            :class="{ 'is-active': difficulty === 'easy' }"
            @click="difficulty = 'easy'"
          >
            Nhẹ <span class="tv__chip-sub">MC</span>
          </button>
          <button
            class="tv__chip tap"
            :class="{ 'is-active': difficulty === 'mix' }"
            @click="difficulty = 'mix'"
          >
            Hỗn hợp <span class="tv__chip-sub">MC + type</span>
          </button>
          <button
            class="tv__chip tap"
            :class="{ 'is-active': difficulty === 'hard' }"
            @click="difficulty = 'hard'"
          >
            Khó <span class="tv__chip-sub">+ listen</span>
          </button>
        </div>
      </AppCard>

      <AppCard variant="glass" padding="lg" class="tv__section">
        <p class="tv__section-label">Chủ đề</p>
        <div class="tv__chips tv__chips--scroll no-scrollbar">
          <button
            class="tv__topic-chip tap"
            :class="{ 'is-active': topicId === 'all' }"
            @click="topicId = 'all'"
          >
            Mọi chủ đề
          </button>
          <button
            v-for="t in chunks.topicWithCounts"
            :key="t.id"
            class="tv__topic-chip tap"
            :class="{ 'is-active': topicId === t.id }"
            :style="{ '--c': t.color }"
            @click="topicId = t.id"
          >
            <span>{{ t.emoji }}</span>
            <span>{{ t.name }}</span>
          </button>
        </div>
      </AppCard>

      <AppCard variant="glass" padding="lg" class="tv__section">
        <p class="tv__section-label">Bộ lọc</p>
        <div class="tv__chips">
          <button
            v-for="l in levels"
            :key="l.key"
            class="tv__chip tap"
            :class="{ 'is-active': level === l.key }"
            @click="level = l.key as ChunkLevel | 'all'"
          >
            {{ l.label }}
          </button>
        </div>
        <div class="tv__chips tv__chips--margin-top">
          <button
            v-for="s in sources"
            :key="s.key"
            class="tv__chip tap"
            :class="{ 'is-active': source === s.key }"
            @click="source = s.key as ChunkSource | 'all'"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="tv__chips tv__chips--margin-top">
          <button
            class="tv__chip tap"
            :class="{ 'is-active': onlyStarred }"
            @click="onlyStarred = !onlyStarred"
          >
            <Icon name="star" :size="12" /> Chỉ starred
          </button>
          <button
            class="tv__chip tap"
            :class="{ 'is-active': onlyWeak }"
            @click="onlyWeak = !onlyWeak"
          >
            <Icon name="flame" :size="12" /> Chỉ chunk yếu
          </button>
          <button
            class="tv__chip tap"
            :class="{ 'is-active': onlyDue }"
            @click="onlyDue = !onlyDue"
          >
            <Icon name="clock" :size="12" /> Chỉ đến hạn
          </button>
        </div>
      </AppCard>

      <p class="tv__count-hint">
        <strong>{{ eligibleCount }}</strong> chunk hợp lệ — sẽ random {{ count }} câu
      </p>

      <AppButton variant="primary" size="lg" block :disabled="!canStart" @click="start">
        <Icon name="play" :size="14" />
        Bắt đầu test
      </AppButton>
    </template>

    <!-- Running -->
    <template v-else-if="phase === 'running'">
      <div class="tv__bar">
        <div class="tv__bar-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      <div class="tv__running-meta">
        <span class="tv__meta-pill">
          <Icon name="check" :size="12" /> {{ practice.correctCount }}
        </span>
        <span class="tv__meta-pill rose">
          <Icon name="x" :size="12" /> {{ practice.wrongCount }}
        </span>
        <span class="tv__meta-pill mono">{{ elapsedLabel }}</span>
      </div>
      <QuizQuestion
        v-if="current"
        :key="`${current.id}-${currentType}`"
        :chunk="current"
        :type="currentType"
        :pool="chunks.chunks"
        @submit="onSubmit"
        @next="onNext"
      />
    </template>

    <!-- Result -->
    <template v-else>
      <AppCard variant="glass-strong" padding="lg" class="tv__result">
        <p class="text-caption text-text-3">Kết quả</p>
        <h2 class="text-title-2">{{ accuracy >= 80 ? 'Xuất sắc!' : accuracy >= 60 ? 'Khá ổn' : 'Cần cố hơn' }}</h2>

        <div class="tv__ring">
          <ProgressRing :value="accuracy / 100" :size="140" :stroke="10" :show-label="false" />
          <div class="tv__ring-inner">
            <span class="tv__ring-pct">{{ accuracy }}%</span>
            <span class="tv__ring-label">accuracy</span>
          </div>
        </div>

        <div class="tv__stats">
          <div>
            <p class="tv__stat-label">Đúng</p>
            <p class="tv__stat-value emerald">{{ practice.correctCount }}</p>
          </div>
          <div>
            <p class="tv__stat-label">Sai</p>
            <p class="tv__stat-value rose">{{ practice.wrongCount }}</p>
          </div>
          <div>
            <p class="tv__stat-label">Thời gian</p>
            <p class="tv__stat-value mono">{{ elapsedLabel }}</p>
          </div>
        </div>
      </AppCard>

      <div v-if="wrongChunks.length > 0" class="tv__mistakes">
        <header class="tv__mistakes-head">
          <h3 class="tv__mistakes-title">Chunk cần ôn lại</h3>
          <p class="tv__mistakes-count">{{ wrongChunks.length }}</p>
        </header>
        <article
          v-for="c in wrongChunks"
          :key="c.id"
          class="tv__mistake glass"
        >
          <TopicChip :topic-id="c.topic" :show-emoji="true" />
          <div class="tv__mistake-text">
            <p class="tv__mistake-en">{{ c.text }}</p>
            <p class="tv__mistake-vi">{{ c.meaning }}</p>
          </div>
        </article>

        <div class="tv__actions">
          <AppButton variant="glass" size="md" block @click="playMistakes">
            <Icon name="play" :size="14" />
            Phát playlist sai
          </AppButton>
          <AppButton variant="primary" size="md" block @click="reviewMistakes">
            <Icon name="sparkles" :size="14" />
            Ôn lại bằng Learn
          </AppButton>
        </div>
      </div>

      <EmptyState
        v-else
        icon="trophy"
        title="Hoàn hảo!"
        hint="Bạn đã đúng tất cả các câu."
      />

      <div class="tv__final-actions">
        <AppButton variant="glass" size="md" block @click="newTest">
          <Icon name="shuffle" :size="14" />
          Test mới
        </AppButton>
        <AppButton variant="primary" size="md" block @click="exit">
          <Icon name="check" :size="14" />
          Xong
        </AppButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tv {
  padding: 12px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
  min-height: 100dvh;
}
.tv__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.tv__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tv__icon--ghost {
  color: var(--color-text-3);
}
.tv__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tv__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}

.tv__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tv__section-label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.tv__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tv__chips--scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}
.tv__chips--margin-top {
  margin-top: 4px;
}
.tv__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 700;
}
.tv__chip-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-3);
}
.tv__chip.is-active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
.tv__chip.is-active .tv__chip-sub {
  color: color-mix(in oklch, var(--color-cyan) 80%, white);
}
.tv__topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.tv__topic-chip.is-active {
  background: color-mix(in oklch, var(--c, var(--color-cyan)) 18%, transparent);
  border-color: color-mix(in oklch, var(--c, var(--color-cyan)) 40%, transparent);
  color: color-mix(in oklch, var(--c, var(--color-cyan)) 90%, white);
}
.tv__count-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-3);
  text-align: center;
}
.tv__count-hint strong {
  color: var(--color-text-1);
  font-family: var(--font-mono);
}

/* Running */
.tv__bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 2px;
}
.tv__bar-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.tv__running-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tv__meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 40%, transparent);
  color: var(--color-emerald);
  font-size: 12px;
  font-weight: 700;
}
.tv__meta-pill.rose {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-rose) 40%, transparent);
  color: var(--color-rose);
}
.tv__meta-pill.mono {
  background: var(--color-surface-1);
  border-color: var(--color-border-1);
  color: var(--color-text-2);
  font-family: var(--font-mono);
  margin-left: auto;
}

/* Result */
.tv__result {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}
.tv__ring {
  position: relative;
  width: 140px;
  height: 140px;
}
.tv__ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.tv__ring-pct {
  font-family: var(--font-ui);
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.tv__ring-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.tv__stats {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.tv__stat-label {
  margin: 0 0 2px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.tv__stat-value {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.tv__stat-value.emerald {
  color: var(--color-emerald);
}
.tv__stat-value.rose {
  color: var(--color-rose);
}
.tv__stat-value.mono {
  font-family: var(--font-mono);
  font-size: 22px;
}

.tv__mistakes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.tv__mistakes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.tv__mistakes-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.tv__mistakes-count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-3);
}
.tv__mistake {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--color-rose);
}
.tv__mistake-text {
  min-width: 0;
}
.tv__mistake-en {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.tv__mistake-vi {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.tv__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.tv__final-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
</style>
