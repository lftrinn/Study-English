<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { playlistService } from '@/services/playlistService';
import type { Chunk } from '@/types/chunk';
import type { PracticeMode } from '@/types/practice';

import QuizQuestion, {
  type LearnQuestionType,
} from '@/components/practice/QuizQuestion.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const route = useRoute();
const practice = usePracticeStore();
const chunks = useChunkStore();
const progress = useProgressStore();

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

const types: LearnQuestionType[] = [
  'mc-meaning',
  'mc-text',
  'type-text',
  'listen-mc-meaning',
  'listen-type',
];

const questionTypes = ref<LearnQuestionType[]>([]);

const current = computed<Chunk | undefined>(() => practice.current);
const currentType = computed<LearnQuestionType>(
  () => questionTypes.value[practice.index] ?? 'mc-meaning',
);
const progressPct = computed(() => practice.progressPct);

function pickQuestionType(_chunk: Chunk, listenProgress?: number): LearnQuestionType {
  // Skew: low-listen → favor mc/listen-mc, high listen → favor type/dictation
  const listen = listenProgress ?? 0;
  if (listen < 2) {
    const a: LearnQuestionType[] = ['mc-meaning', 'mc-text', 'listen-mc-meaning'];
    return a[Math.floor(Math.random() * a.length)];
  }
  return types[Math.floor(Math.random() * types.length)];
}

function buildList(): Chunk[] {
  switch (sourceParam.value) {
    case 'review':
      return playlistService.buildReview(chunks.chunks, progress.progressMap, { limit: 20 });
    case 'mistakes':
      return playlistService.buildMistakes(chunks.chunks, progress.progressMap, { limit: 20 });
    default: {
      const filtered = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks;
      // Prioritize unheard + learning chunks for the session
      const sorted = [...filtered].sort((a, b) => {
        const la = progress.byId(a.id)?.listenCount ?? 0;
        const lb = progress.byId(b.id)?.listenCount ?? 0;
        return la - lb;
      });
      return sorted.slice(0, 15);
    }
  }
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
}

function exit() {
  practice.reset();
  router.replace('/');
}

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    start();
  }
});

// If user navigates with different ?source, restart the session
watch(
  () => sourceParam.value,
  () => {
    practice.reset();
    start();
  },
);
</script>

<template>
  <section class="lv">
    <header class="lv__head safe-pt">
      <button class="lv__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="lv__head-info">
        <p class="text-caption text-text-3">{{ titleLabel }}</p>
        <p class="lv__counter">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
      </div>
      <span class="lv__icon lv__icon--ghost" aria-hidden="true">
        <Icon name="sparkles" :size="18" />
      </span>
    </header>

    <div class="lv__bar">
      <div class="lv__bar-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <template v-if="practice.status === 'active' && current">
      <QuizQuestion
        :key="`${current.id}-${currentType}`"
        :chunk="current"
        :type="currentType"
        :pool="chunks.chunks"
        @submit="onSubmit"
        @next="onNext"
      />
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
      title="Chưa có chunk phù hợp"
      :hint="
        sourceParam === 'review'
          ? 'Chưa có chunk nào đến hạn ôn.'
          : sourceParam === 'mistakes'
          ? 'Bạn chưa có chunk nào sai trong các phiên trước.'
          : 'Mở Library, lọc chủ đề rồi quay lại.'
      "
    >
      <AppButton variant="primary" size="md" @click="start">
        <Icon name="sparkles" :size="14" />
        Bắt đầu với toàn bộ chunks
      </AppButton>
    </EmptyState>
  </section>
</template>

<style scoped>
.lv {
  padding: 12px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  min-height: 100dvh;
}
.lv__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.lv__icon {
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
.lv__icon--ghost {
  color: var(--color-text-3);
}
.lv__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lv__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
.lv__bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
}
.lv__bar-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
</style>
