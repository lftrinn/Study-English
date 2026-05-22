import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Chunk, ChunkStatus } from '@/types/chunk';
import type { ChunkProgress, DailyStat, ListeningLog, ListeningMode } from '@/types/progress';
import { storageService } from '@/services/storageService';
import { reviewScheduler } from '@/services/reviewScheduler';

function newProgress(chunkId: string): ChunkProgress {
  return {
    chunkId,
    listenCount: 0,
    speakCount: 0,
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    status: 'new',
    starred: false,
    ease: 2.5,
    interval: 0,
  };
}

function isoDayKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function diffDays(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

export const useProgressStore = defineStore('progress', () => {
  const progressMap = ref<Map<string, ChunkProgress>>(new Map());
  const recentLogs = ref<ListeningLog[]>([]);
  const hydrated = ref(false);

  async function hydrate() {
    if (hydrated.value) return;
    try {
      const [all, logs] = await Promise.all([
        storageService.getAllProgress(),
        storageService.getRecentListeningLogs(500),
      ]);
      const map = new Map<string, ChunkProgress>();
      for (const p of all) map.set(p.chunkId, p);
      progressMap.value = map;
      recentLogs.value = logs;
    } catch {
      // IndexedDB unavailable; keep in-memory.
    }
    hydrated.value = true;
  }

  function byId(chunkId: string): ChunkProgress | undefined {
    return progressMap.value.get(chunkId);
  }

  function ensureProgress(chunkId: string): ChunkProgress {
    let p = progressMap.value.get(chunkId);
    if (!p) {
      p = newProgress(chunkId);
      progressMap.value.set(chunkId, p);
    }
    return p;
  }

  async function persist(p: ChunkProgress) {
    // ref<Map> in Vue 3 tracks .set() via proxy — no need to recreate the Map.
    progressMap.value.set(p.chunkId, p);
    try {
      await storageService.putProgress(p);
    } catch {
      // ignore
    }
  }

  async function recordListen(chunk: Chunk, opts: { mode: ListeningMode; rate: number; voiceName?: string }) {
    const p = ensureProgress(chunk.id);
    p.listenCount += 1;
    p.lastListenedAt = new Date().toISOString();
    if (p.status === 'new' && p.listenCount >= 1) p.status = 'learning';
    await persist(p);

    const log: ListeningLog = {
      id: crypto.randomUUID(),
      chunkId: chunk.id,
      text: chunk.text,
      meaning: chunk.meaning,
      topic: chunk.topic,
      voiceName: opts.voiceName,
      rate: opts.rate,
      playedAt: new Date().toISOString(),
      mode: opts.mode,
    };
    recentLogs.value = [log, ...recentLogs.value].slice(0, 500);
    try {
      await storageService.addListeningLog(log);
    } catch {
      // ignore
    }
  }

  async function toggleStarred(chunkId: string) {
    const p = ensureProgress(chunkId);
    p.starred = !p.starred;
    await persist(p);
  }

  async function setStarred(chunkId: string, starred: boolean) {
    const p = ensureProgress(chunkId);
    p.starred = starred;
    await persist(p);
  }

  async function setStatus(chunkId: string, status: ChunkStatus) {
    const p = ensureProgress(chunkId);
    p.status = status;
    await persist(p);
  }

  async function recordAnswer(chunkId: string, correct: boolean) {
    const p = ensureProgress(chunkId);
    p.lastPracticedAt = new Date().toISOString();
    if (correct) {
      p.correctCount += 1;
      p.correctStreak += 1;
    } else {
      p.wrongCount += 1;
      p.correctStreak = 0;
    }
    const next = reviewScheduler.next(p, correct);
    p.ease = next.ease;
    p.interval = next.interval;
    p.nextReviewAt = next.nextReviewAt;
    p.status = next.status;
    await persist(p);
  }

  async function recordSpeakResult(chunkId: string, correct: boolean) {
    const p = ensureProgress(chunkId);
    p.speakCount += 1;
    await recordAnswer(chunkId, correct);
    return p;
  }

  // ---------- Derived ----------

  const masteredCount = computed(
    () => Array.from(progressMap.value.values()).filter((p) => p.status === 'mastered').length,
  );
  const learningCount = computed(
    () =>
      Array.from(progressMap.value.values()).filter(
        (p) => p.status === 'learning' || p.status === 'familiar',
      ).length,
  );
  const starredCount = computed(
    () => Array.from(progressMap.value.values()).filter((p) => p.starred).length,
  );
  const totalListened = computed(() =>
    Array.from(progressMap.value.values()).reduce((sum, p) => sum + p.listenCount, 0),
  );

  const weakChunkIds = computed<string[]>(() =>
    Array.from(progressMap.value.values())
      .filter((p) => p.wrongCount > p.correctCount && p.wrongCount > 0)
      .map((p) => p.chunkId),
  );

  const dueReviewChunkIds = computed<string[]>(() => {
    const now = new Date().toISOString();
    return Array.from(progressMap.value.values())
      .filter((p) => p.nextReviewAt && p.nextReviewAt <= now && p.status !== 'mastered')
      .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
      .map((p) => p.chunkId);
  });

  // Pre-aggregate recentLogs by day-key once; reused by all weekly/streak computeds
  // so we don't filter recentLogs.value 7-90 times on every change.
  const logCountByDay = computed<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const l of recentLogs.value) {
      const k = isoDayKey(l.playedAt);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  });

  const weeklyStats = computed<DailyStat[]>(() => {
    const today = new Date();
    const counts = logCountByDay.value;
    const days: DailyStat[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = isoDayKey(d);
      days.push({ date: key, listenCount: counts.get(key) ?? 0, practiceCount: 0, speakCount: 0 });
    }
    return days;
  });

  const todayListenCount = computed(() => logCountByDay.value.get(isoDayKey()) ?? 0);

  const streakDays = computed(() => {
    if (recentLogs.value.length === 0) return 0;
    const counts = logCountByDay.value;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = isoDayKey(d);
      if ((counts.get(key) ?? 0) > 0) streak += 1;
      else if (i === 0) continue;
      else break;
    }
    return streak;
  });

  const bestStreak = computed(() => {
    if (recentLogs.value.length === 0) return 0;
    const counts = logCountByDay.value;
    const today = new Date();
    let best = 0;
    let run = 0;
    for (let i = 0; i < 90; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if ((counts.get(isoDayKey(d)) ?? 0) > 0) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return Math.max(best, streakDays.value);
  });

  const previousWeekTotal = computed(() => {
    const today = new Date();
    const counts = logCountByDay.value;
    let count = 0;
    for (let i = 7; i < 14; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      count += counts.get(isoDayKey(d)) ?? 0;
    }
    return count;
  });

  function topListenedChunkIds(limit = 5): string[] {
    return Array.from(progressMap.value.values())
      .filter((p) => p.listenCount > 0)
      .sort((a, b) => b.listenCount - a.listenCount)
      .slice(0, limit)
      .map((p) => p.chunkId);
  }

  function topicListenCount(topicId: string): number {
    return recentLogs.value.filter((l) => l.topic === topicId).length;
  }

  async function clearAll() {
    progressMap.value = new Map();
    recentLogs.value = [];
    try {
      await storageService.clearAll();
    } catch {
      // ignore
    }
  }

  return {
    progressMap,
    recentLogs,
    hydrated,
    hydrate,
    byId,
    recordListen,
    toggleStarred,
    setStarred,
    setStatus,
    recordAnswer,
    recordSpeakResult,
    masteredCount,
    learningCount,
    starredCount,
    totalListened,
    weakChunkIds,
    dueReviewChunkIds,
    weeklyStats,
    todayListenCount,
    streakDays,
    bestStreak,
    previousWeekTotal,
    topListenedChunkIds,
    topicListenCount,
    clearAll,
    diffDays,
  };
});
