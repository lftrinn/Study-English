<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import type { Chunk } from '@/types/chunk';

import WritePractice from '@/components/practice/WritePractice.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const practice = usePracticeStore();
const chunks = useChunkStore();

const ignoreCase = ref(true);
const ignorePunctuation = ref(true);
const strict = ref(false);

const current = computed<Chunk | undefined>(() => practice.current);
const progressPct = computed(() => practice.progressPct);

function startWithFiltered() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 12);
  practice.start({ mode: 'write', chunks: list });
}

function shuffleRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  practice.start({ mode: 'write', chunks: arr });
}

async function onSubmit(e: { chunk: Chunk; userAnswer: string; result: { isCorrect: boolean; score: number } }) {
  await practice.submit({
    chunkId: e.chunk.id,
    prompt: e.chunk.meaning,
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
  <section class="wv">
    <header class="wv__head safe-pt">
      <button class="wv__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="wv__head-info">
        <p class="text-caption text-text-3">Write</p>
        <p class="wv__counter">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
      </div>
      <details class="wv__opts">
        <summary aria-label="Tuỳ chọn"><Icon name="filter" :size="18" /></summary>
        <div class="wv__opts-body glass">
          <label class="wv__opt">
            <input type="checkbox" v-model="ignoreCase" />
            Bỏ qua viết hoa
          </label>
          <label class="wv__opt">
            <input type="checkbox" v-model="ignorePunctuation" />
            Bỏ qua dấu câu
          </label>
          <label class="wv__opt">
            <input type="checkbox" v-model="strict" />
            Strict (đúng từng từ)
          </label>
        </div>
      </details>
    </header>

    <div class="wv__bar">
      <div class="wv__bar-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <template v-if="practice.status === 'active' && current">
      <WritePractice
        :chunk="current"
        :ignore-case="ignoreCase"
        :ignore-punctuation="ignorePunctuation"
        :strict="strict"
        @submit="onSubmit"
        @next="onNext"
      />
    </template>

    <template v-else-if="practice.status === 'finished'">
      <StudySessionSummary
        title="Tốt lắm!"
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
      icon="pencil"
      title="Chưa có chunk để luyện viết"
      hint="Mở Library, lọc chủ đề rồi quay lại."
    >
      <AppButton variant="primary" size="md" @click="startWithFiltered">
        <Icon name="pencil" :size="14" />
        Bắt đầu với toàn bộ chunks
      </AppButton>
    </EmptyState>
  </section>
</template>

<style scoped>
.wv {
  padding: 12px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  min-height: 100dvh;
}
.wv__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.wv__icon {
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
.wv__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wv__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
.wv__opts {
  position: relative;
}
.wv__opts > summary {
  list-style: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.wv__opts > summary::-webkit-details-marker {
  display: none;
}
.wv__opts-body {
  position: absolute;
  right: 0;
  top: 48px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  min-width: 200px;
}
.wv__opt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-2);
  cursor: pointer;
}

.wv__bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
}
.wv__bar-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
</style>
