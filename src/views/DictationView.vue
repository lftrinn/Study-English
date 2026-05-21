<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import type { Chunk } from '@/types/chunk';

import DictationInput from '@/components/practice/DictationInput.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const practice = usePracticeStore();
const chunks = useChunkStore();

const current = computed<Chunk | undefined>(() => practice.current);
const progressPct = computed(() => practice.progressPct);

function startWithFiltered() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'dictation', chunks: list });
}

function shuffleRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  practice.start({ mode: 'dictation', chunks: arr });
}

async function onSubmit(e: { chunk: Chunk; userAnswer: string; result: { isCorrect: boolean; score: number } }) {
  await practice.submit({
    chunkId: e.chunk.id,
    prompt: '[audio]',
    expectedAnswer: e.chunk.text,
    userAnswer: e.userAnswer,
    isCorrect: e.result.isCorrect,
    score: e.result.score,
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
    startWithFiltered();
  }
});
</script>

<template>
  <section class="dv">
    <header class="dv__head safe-pt">
      <button class="dv__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="dv__head-info">
        <p class="text-caption text-text-3">Dictation</p>
        <p class="dv__counter">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
      </div>
      <span class="dv__icon dv__icon--ghost" aria-hidden="true">
        <Icon name="ear" :size="18" />
      </span>
    </header>

    <div class="dv__bar">
      <div class="dv__bar-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <template v-if="practice.status === 'active' && current">
      <DictationInput :chunk="current" @submit="onSubmit" @next="onNext" />
    </template>

    <template v-else-if="practice.status === 'finished'">
      <StudySessionSummary
        title="Phiên dictation xong"
        :total="practice.total"
        :correct-count="practice.correctCount"
        :wrong-count="practice.wrongCount"
        primary-label="Xong"
        secondary-label="Trộn và làm lại"
        @primary="exit"
        @secondary="shuffleRestart"
      />
    </template>

    <EmptyState
      v-else
      icon="ear"
      title="Chưa có chunk để luyện nghe"
      hint="Mở Library, lọc chủ đề rồi quay lại."
    >
      <AppButton variant="primary" size="md" @click="startWithFiltered">
        <Icon name="ear" :size="14" />
        Bắt đầu với toàn bộ chunks
      </AppButton>
    </EmptyState>
  </section>
</template>

<style scoped>
.dv {
  padding: 12px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  min-height: 100dvh;
}
.dv__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.dv__icon {
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
.dv__icon--ghost {
  color: var(--color-text-3);
}
.dv__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dv__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
.dv__bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
}
.dv__bar-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
</style>
