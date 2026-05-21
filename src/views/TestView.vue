<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Chunk } from '@/types/chunk';
import type { PracticeMode } from '@/types/practice';

import QuizQuestion, {
  type LearnQuestionType,
} from '@/components/practice/QuizQuestion.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import ResultStat from '@/components/common/ResultStat.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const practice = usePracticeStore();
const player = usePlayerStore();

type Phase = 'setup' | 'running' | 'result';
const phase = ref<Phase>('setup');

type QTypeKey = 'meaning' | 'english' | 'listen' | 'type';
type PoolKey = 'weak' | 'starred' | 'due' | 'all';

const COUNT_OPTIONS = [5, 10, 15, 20] as const;
const count = ref<(typeof COUNT_OPTIONS)[number]>(10);
const topicId = ref<string | 'all'>('all');
const pool = ref<PoolKey[]>(['weak', 'starred']);
const qTypes = ref<QTypeKey[]>(['meaning', 'listen']);

const questionTypes = ref<LearnQuestionType[]>([]);
const startedAt = ref(0);
const elapsedSec = ref(0);
let elapsedTimer: number | null = null;

const QTYPE_DEFS: Array<{ key: QTypeKey; label: string; icon: string }> = [
  { key: 'meaning', label: 'Choose the meaning', icon: 'brain' },
  { key: 'english', label: 'Choose the English', icon: 'cards' },
  { key: 'listen', label: 'Listen and choose', icon: 'headphones' },
  { key: 'type', label: 'Type from Vietnamese', icon: 'edit' },
];

const POOL_DEFS: Array<{ key: PoolKey; label: string; icon: string }> = [
  { key: 'weak', label: 'Weak chunks', icon: 'wave' },
  { key: 'starred', label: 'Starred only', icon: 'star' },
  { key: 'due', label: 'Due for review', icon: 'clock' },
  { key: 'all', label: 'All chunks', icon: 'library' },
];

const QTYPE_TO_LEARN: Record<QTypeKey, LearnQuestionType[]> = {
  meaning: ['mc-meaning'],
  english: ['mc-text'],
  listen: ['listen-mc-meaning'],
  type: ['type-text'],
};

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
function isQTypeOn(k: QTypeKey) {
  return qTypes.value.includes(k);
}
function isPoolOn(k: PoolKey) {
  return pool.value.includes(k);
}

const eligibleChunks = computed<Chunk[]>(() => {
  const useAll = isPoolOn('all') || pool.value.length === 0;
  return chunks.chunks.filter((c) => {
    if (topicId.value !== 'all' && c.topic !== topicId.value) return false;
    if (useAll) return true;
    const p = progress.byId(c.id);
    let ok = false;
    if (isPoolOn('starred') && p?.starred) ok = true;
    if (isPoolOn('weak') && p && p.wrongCount > 0 && p.wrongCount >= p.correctCount) ok = true;
    if (isPoolOn('due')) {
      const now = new Date().toISOString();
      if (p?.nextReviewAt && p.nextReviewAt <= now) ok = true;
    }
    return ok;
  });
});

const eligibleCount = computed(() => eligibleChunks.value.length);
const canStart = computed(() => eligibleCount.value >= 2 && qTypes.value.length > 0);

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

const headerSubtitle = computed(() => {
  if (phase.value === 'setup') return 'Build your test';
  if (phase.value === 'running') {
    return `${Math.min(practice.index + 1, practice.total)} / ${practice.total}`;
  }
  return elapsedLabel.value;
});

function pickType(): LearnQuestionType {
  const learnPool: LearnQuestionType[] = qTypes.value.flatMap((k) => QTYPE_TO_LEARN[k]);
  const finalPool = learnPool.length > 0 ? learnPool : (['mc-meaning'] as LearnQuestionType[]);
  return finalPool[Math.floor(Math.random() * finalPool.length)];
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
  const arr = [...eligibleChunks.value];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const list = arr.slice(0, count.value);
  questionTypes.value = list.map(() => pickType());
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
  if (window.history.length > 1) router.back();
  else router.replace('/');
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
  <ModeShell title="Mini Test" :subtitle="headerSubtitle" :on-close="exit">
    <!-- Setup -->
    <template v-if="phase === 'setup'">
      <div class="tv__scroll">
        <!-- Count -->
        <section class="tv__block">
          <p class="tv__block-label">Number of questions</p>
          <div class="tv__count-row">
            <button
              v-for="n in COUNT_OPTIONS"
              :key="n"
              class="tv__count-btn tap mono"
              :class="{ 'is-active': count === n }"
              @click="count = n"
            >{{ n }}</button>
          </div>
        </section>

        <!-- Topic -->
        <section class="tv__block">
          <p class="tv__block-label">Topic</p>
          <div class="tv__chip-strip no-scrollbar">
            <button
              class="tv__topic-chip tap"
              :class="{ 'is-active': topicId === 'all' }"
              :style="{ '--c': '#22D3EE' }"
              @click="topicId = 'all'"
            >
              All topics
            </button>
            <button
              v-for="t in chunks.topicWithCounts"
              :key="t.id"
              class="tv__topic-chip tap"
              :class="{ 'is-active': topicId === t.id }"
              :style="{ '--c': t.color }"
              @click="topicId = t.id"
            >
              <TopicIcon :name="t.id" :size="13" />
              <span>{{ t.name }}</span>
            </button>
          </div>
        </section>

        <!-- Chunk pool -->
        <section class="tv__block">
          <p class="tv__block-label">Chunk pool</p>
          <div class="tv__pool-grid">
            <button
              v-for="p in POOL_DEFS"
              :key="p.key"
              class="tv__pool-btn tap"
              :class="{ 'is-active': isPoolOn(p.key) }"
              @click="pool = toggle(pool, p.key)"
            >
              <Icon :name="p.icon" :size="16" />
              <span>{{ p.label }}</span>
            </button>
          </div>
        </section>

        <!-- Question types -->
        <section class="tv__block">
          <p class="tv__block-label">Question types</p>
          <div class="tv__qtype-list">
            <button
              v-for="q in QTYPE_DEFS"
              :key="q.key"
              class="tv__qtype-btn tap"
              :class="{ 'is-active': isQTypeOn(q.key) }"
              @click="qTypes = toggle(qTypes, q.key)"
            >
              <Icon :name="q.icon" :size="16" />
              <span class="tv__qtype-label">{{ q.label }}</span>
              <Icon
                v-if="isQTypeOn(q.key)"
                name="check"
                :size="16"
                class="tv__qtype-check"
              />
            </button>
          </div>
          <button
            class="tv__speaking-link tap"
            @click="router.push('/study/speaking')"
          >
            <Icon name="mic" :size="14" />
            <span>Luyện phát âm? Mở Speaking Lab →</span>
          </button>
        </section>

        <p class="tv__pool-hint">
          <strong class="mono">{{ eligibleCount }}</strong> chunk hợp lệ —
          sẽ random {{ Math.min(count, eligibleCount || count) }} câu
        </p>
      </div>

      <div class="tv__sticky">
        <button
          class="tv__cta tap"
          :disabled="!canStart"
          @click="start"
        >
          Start test · {{ count }} questions →
        </button>
      </div>

      <EmptyState
        v-if="eligibleCount === 0"
        icon="trophy"
        title="Chưa có chunk hợp lệ"
        hint="Nới lỏng Chunk pool hoặc đổi chủ đề rồi thử lại."
      />
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
      <div :style="{ padding: '0 20px 20px' }">
        <QuizQuestion
          v-if="current"
          :key="`${current.id}-${currentType}`"
          :chunk="current"
          :type="currentType"
          :pool="chunks.chunks"
          @submit="onSubmit"
          @next="onNext"
        />
      </div>
    </template>

    <!-- Result -->
    <template v-else>
      <div class="tv__result-scroll">
        <div class="tv__result-hero">
          <div class="tv__ring">
            <ProgressRing
              :value="accuracy / 100"
              :size="140"
              :stroke="10"
              :color="'#34D399'"
              :show-label="false"
            />
            <div class="tv__ring-inner">
              <span class="tv__ring-pct mono">
                {{ accuracy }}<span class="tv__ring-pct-unit">%</span>
              </span>
              <span class="tv__ring-label">accuracy</span>
            </div>
          </div>
          <div class="tv__result-headline">
            <span class="grad-text">
              {{ accuracy >= 80 ? 'Strong work!' : accuracy >= 60 ? 'Solid effort' : 'Keep going' }}
            </span>
          </div>
          <div class="tv__result-sub">
            <span class="mono" :style="{ color: '#34D399' }">{{ practice.correctCount }}</span>
            correct ·
            <span class="mono" :style="{ color: '#FB7185' }">{{ practice.wrongCount }}</span>
            to revisit
          </div>
        </div>

        <div class="tv__stats-grid">
          <ResultStat label="Correct" :value="practice.correctCount" color="#34D399" />
          <ResultStat label="Wrong" :value="practice.wrongCount" color="#FB7185" />
          <ResultStat label="Time" :value="elapsedLabel" color="#22D3EE" mono />
        </div>

        <div v-if="wrongChunks.length > 0" class="tv__mistakes">
          <header class="tv__mistakes-head">
            <h3 class="tv__mistakes-title">Chunks to revisit</h3>
            <p class="tv__mistakes-count mono">{{ wrongChunks.length }}</p>
          </header>
          <article
            v-for="c in wrongChunks"
            :key="c.id"
            class="tv__mistake glass"
          >
            <div
              class="tv__mistake-icon"
              :style="{
                background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`,
                color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
              }"
            >
              <TopicIcon :name="c.topic" :size="16" />
            </div>
            <div class="tv__mistake-text">
              <p class="tv__mistake-en">{{ c.text }}</p>
              <p class="tv__mistake-vi">{{ c.meaning }}</p>
            </div>
            <button
              class="tv__mistake-play tap"
              :aria-label="'Phát chunk'"
              @click="player.setQueue([c], { mode: 'review' }); void player.play(); router.push('/player')"
            >
              <Icon name="play" :size="12" :style="{ color: 'var(--color-cyan)' }" />
            </button>
          </article>
        </div>

        <EmptyState
          v-else
          icon="trophy"
          title="Hoàn hảo!"
          hint="Bạn đã đúng tất cả các câu."
        />
      </div>

      <div class="tv__sticky tv__sticky--stack">
        <button class="tv__cta tap" @click="reviewMistakes" :disabled="wrongChunks.length === 0">
          <Icon name="refresh" :size="16" /> Review mistakes
        </button>
        <button class="tv__cta-secondary tap" @click="playMistakes" :disabled="wrongChunks.length === 0">
          <Icon name="play" :size="14" /> Play mistake playlist
        </button>
        <div class="tv__final-actions">
          <button class="tv__cta-secondary tap" @click="newTest">
            <Icon name="shuffle" :size="14" /> Test mới
          </button>
          <button class="tv__cta tap" @click="exit">
            <Icon name="check" :size="14" /> Xong
          </button>
        </div>
      </div>
    </template>
  </ModeShell>
</template>

<style scoped>
.tv__scroll {
  flex: 1;
  padding: 0 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tv__result-scroll {
  flex: 1;
  padding: 0 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Block */
.tv__block {
  margin-top: 18px;
}
.tv__block-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

/* Count */
.tv__count-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.tv__count-btn {
  padding: 12px 0;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 16px;
  font-weight: 700;
}
.tv__count-btn.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

/* Topic chip strip */
.tv__chip-strip {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.tv__chip-strip::-webkit-scrollbar { display: none; }
.tv__topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.tv__topic-chip.is-active {
  background: color-mix(in oklch, var(--c, var(--color-cyan)) 28%, transparent);
  border-color: var(--c, var(--color-cyan));
  color: var(--c, var(--color-cyan));
}

/* Pool grid */
.tv__pool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.tv__pool-btn {
  padding: 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}
.tv__pool-btn.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-violet);
  color: var(--color-violet);
}

/* Question type list */
.tv__qtype-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tv__qtype-btn {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}
.tv__qtype-btn.is-active {
  background: rgba(34, 211, 238, 0.1);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}
.tv__qtype-label {
  flex: 1;
}
.tv__qtype-check {
  color: var(--color-cyan);
}
.tv__speaking-link {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  border: 1px dashed color-mix(in oklch, var(--color-cyan) 35%, transparent);
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.tv__pool-hint {
  margin: 18px 0 24px;
  font-size: 13px;
  color: var(--color-text-3);
  text-align: center;
}
.tv__pool-hint strong {
  color: var(--color-text-1);
}

/* Running */
.tv__bar {
  height: 4px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
  margin: 0 20px;
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
  padding: 10px 20px 0;
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
  margin-left: auto;
}

/* Result hero */
.tv__result-hero {
  padding: 24px;
  border-radius: 28px;
  text-align: center;
  background:
    linear-gradient(160deg, rgba(52, 211, 153, 0.18), rgba(34, 211, 238, 0.06)),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 30%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
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
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}
.tv__ring-pct-unit {
  font-size: 16px;
  color: var(--color-text-3);
  margin-left: 2px;
}
.tv__ring-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.tv__result-headline {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.tv__result-sub {
  font-size: 13px;
  color: var(--color-text-2);
}

.tv__stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

/* Mistakes */
.tv__mistakes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tv__mistakes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0;
}
.tv__mistakes-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.tv__mistakes-count {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.tv__mistake {
  padding: 12px;
  border-left: 3px solid var(--color-rose);
  display: flex;
  align-items: center;
  gap: 10px;
}
.tv__mistake-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.tv__mistake-text {
  flex: 1;
  min-width: 0;
}
.tv__mistake-en {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}
.tv__mistake-vi {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-text-3);
}
.tv__mistake-play {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--color-surface-3);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* Sticky */
.tv__sticky {
  padding: 14px 20px calc(20px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.tv__sticky--stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tv__final-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.tv__cta {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow:
    0 10px 28px rgba(34, 211, 238, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}
.tv__cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tv__cta-secondary {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tv__cta-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
