import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Chunk } from '@/types/chunk';
import type { PracticeMode, PracticeResult } from '@/types/practice';
import { storageService } from '@/services/storageService';
import { useProgressStore } from './progressStore';

type SessionStatus = 'idle' | 'active' | 'finished';

export const usePracticeStore = defineStore('practice', () => {
  const mode = ref<PracticeMode | null>(null);
  const chunks = ref<Chunk[]>([]);
  const index = ref(0);
  const status = ref<SessionStatus>('idle');
  const results = ref<PracticeResult[]>([]);

  const current = computed<Chunk | undefined>(() => chunks.value[index.value]);
  const total = computed(() => chunks.value.length);
  const progressPct = computed(() => (total.value === 0 ? 0 : (index.value / total.value) * 100));

  const correctCount = computed(() => results.value.filter((r) => r.isCorrect).length);
  const wrongCount = computed(() => results.value.filter((r) => !r.isCorrect).length);

  function start(opts: { mode: PracticeMode; chunks: Chunk[] }) {
    mode.value = opts.mode;
    chunks.value = [...opts.chunks];
    index.value = 0;
    results.value = [];
    status.value = opts.chunks.length > 0 ? 'active' : 'finished';
  }

  function reset() {
    mode.value = null;
    chunks.value = [];
    index.value = 0;
    results.value = [];
    status.value = 'idle';
  }

  async function submit(opts: {
    chunkId: string;
    prompt: string;
    expectedAnswer: string;
    userAnswer?: string;
    isCorrect: boolean;
    score?: number;
    modeOverride?: PracticeMode;
  }) {
    const m = opts.modeOverride ?? mode.value;
    if (!m) return;
    const r: PracticeResult = {
      id: crypto.randomUUID(),
      chunkId: opts.chunkId,
      mode: m,
      prompt: opts.prompt,
      expectedAnswer: opts.expectedAnswer,
      userAnswer: opts.userAnswer,
      isCorrect: opts.isCorrect,
      score: opts.score,
      practicedAt: new Date().toISOString(),
    };
    results.value.push(r);
    try {
      await storageService.addPracticeResult(r);
    } catch {
      // ignore
    }
    const progress = useProgressStore();
    await progress.recordAnswer(opts.chunkId, opts.isCorrect);
  }

  function advance() {
    if (status.value !== 'active') return;
    if (index.value < chunks.value.length - 1) {
      index.value += 1;
    } else {
      status.value = 'finished';
    }
  }

  function jumpTo(i: number) {
    if (i < 0 || i >= chunks.value.length) return;
    index.value = i;
  }

  return {
    mode,
    chunks,
    index,
    status,
    results,
    current,
    total,
    progressPct,
    correctCount,
    wrongCount,
    start,
    reset,
    submit,
    advance,
    jumpTo,
  };
});
