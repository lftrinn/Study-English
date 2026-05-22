/**
 * TOEIC Training Center — Pinia store.
 *
 * Persists per-Part stats, mistakes notebook, exam scores, and the user's
 * goal target via localStorage so review history survives reloads. Mirrors
 * the pattern from settingsStore.ts.
 */
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import {
  TOEIC_GOAL_DEFAULT,
  TOEIC_MISTAKES_SEED,
  TOEIC_PARTS,
  TOEIC_PART_STATS_SEED,
  makeDailyHeat,
  makeSkillMatrix,
} from '@/data/toeic';
import type {
  TOEICGoal,
  TOEICMistake,
  TOEICPartStat,
  TOEICPhaseId,
  TOEICSkillCell,
} from '@/types/toeic';

const LS_KEY = 'cll.toeic.v1';

interface ExamScore {
  /** ISO timestamp. */
  takenAt: string;
  listening: number;
  reading: number;
  total: number;
}

interface PersistedTOEIC {
  goal: TOEICGoal;
  partStats: Record<number, TOEICPartStat>;
  mistakes: TOEICMistake[];
  /** Last 6 exam totals — used by the score trend sparkline. */
  examScores: ExamScore[];
  starredChunks: string[];
}

const DEFAULTS: PersistedTOEIC = {
  goal: { ...TOEIC_GOAL_DEFAULT },
  partStats: { ...TOEIC_PART_STATS_SEED },
  mistakes: [...TOEIC_MISTAKES_SEED],
  examScores: [
    { takenAt: '', listening: 220, reading: 215, total: 435 },
    { takenAt: '', listening: 225, reading: 217, total: 442 },
    { takenAt: '', listening: 230, reading: 218, total: 448 },
    { takenAt: '', listening: 238, reading: 222, total: 460 },
    { takenAt: '', listening: 245, reading: 227, total: 472 },
    { takenAt: '', listening: 248, reading: 232, total: 480 },
  ],
  starredChunks: [],
};

function load(): PersistedTOEIC {
  if (typeof localStorage === 'undefined') return cloneDefaults();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<PersistedTOEIC>;
    return {
      goal: { ...DEFAULTS.goal, ...(parsed.goal ?? {}) },
      partStats: { ...DEFAULTS.partStats, ...(parsed.partStats ?? {}) },
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [...DEFAULTS.mistakes],
      examScores: Array.isArray(parsed.examScores) && parsed.examScores.length > 0
        ? parsed.examScores
        : [...DEFAULTS.examScores],
      starredChunks: Array.isArray(parsed.starredChunks) ? parsed.starredChunks : [],
    };
  } catch {
    return cloneDefaults();
  }
}

function cloneDefaults(): PersistedTOEIC {
  return {
    goal: { ...DEFAULTS.goal },
    partStats: { ...DEFAULTS.partStats },
    mistakes: [...DEFAULTS.mistakes],
    examScores: [...DEFAULTS.examScores],
    starredChunks: [...DEFAULTS.starredChunks],
  };
}

export const useToeicStore = defineStore('toeic', () => {
  const initial = load();

  const goal = ref<TOEICGoal>(initial.goal);
  const partStats = ref<Record<number, TOEICPartStat>>(initial.partStats);
  const mistakes = ref<TOEICMistake[]>(initial.mistakes);
  const examScores = ref<ExamScore[]>(initial.examScores);
  const starredChunks = ref<string[]>(initial.starredChunks);
  const dailyHeat = ref(makeDailyHeat());

  // ── Derived ──────────────────────────────────────────────────────────
  const skillMatrix = computed<Record<number, TOEICSkillCell[]>>(() =>
    makeSkillMatrix(partStats.value),
  );

  const weakestPart = computed(() => {
    return [...TOEIC_PARTS].sort(
      (a, b) =>
        (partStats.value[a.id]?.accuracy ?? 0) -
        (partStats.value[b.id]?.accuracy ?? 0),
    )[0];
  });

  const strongestPart = computed(() => {
    return [...TOEIC_PARTS].sort(
      (a, b) =>
        (partStats.value[b.id]?.accuracy ?? 0) -
        (partStats.value[a.id]?.accuracy ?? 0),
    )[0];
  });

  const currentPhase = computed<TOEICPhaseId>(() => {
    // Phase progression heuristic: advance once the previous phase averages
    // ≥70% accuracy across its Parts. Keeps the hub roadmap honest.
    const avgFor = (parts: number[]) => {
      const accs = parts.map((id) => partStats.value[id]?.accuracy ?? 0);
      return accs.reduce((s, v) => s + v, 0) / accs.length;
    };
    if (avgFor([1, 2, 5]) < 0.7) return 'foundation';
    if (avgFor([3, 4]) < 0.65) return 'expand';
    return 'mastery';
  });

  const mistakeCount = computed(() => mistakes.value.length);

  // ── Actions ──────────────────────────────────────────────────────────
  function recordAnswer(partId: number, correct: boolean) {
    const prev = partStats.value[partId] ?? { practiced: 0, accuracy: 0 };
    const total = prev.practiced + 1;
    // Running average — each new answer contributes 1/total weight.
    const accuracy = (prev.accuracy * prev.practiced + (correct ? 1 : 0)) / total;
    partStats.value = {
      ...partStats.value,
      [partId]: { practiced: total, accuracy },
    };
  }

  function addMistake(m: Omit<TOEICMistake, 'id' | 'reviewCount' | 'xpLost'>) {
    const id = `m${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    mistakes.value = [
      { ...m, id, reviewCount: 0, xpLost: 5 },
      ...mistakes.value,
    ];
  }

  function markMistakeReviewed(id: string) {
    mistakes.value = mistakes.value.map((m) =>
      m.id === id ? { ...m, reviewCount: m.reviewCount + 1 } : m,
    );
  }

  function deleteMistake(id: string) {
    mistakes.value = mistakes.value.filter((m) => m.id !== id);
  }

  function recordExamScore(listening: number, reading: number) {
    const score: ExamScore = {
      takenAt: new Date().toISOString(),
      listening,
      reading,
      total: listening + reading,
    };
    examScores.value = [...examScores.value.slice(-5), score];
    if (score.total > goal.value.current) {
      goal.value = { ...goal.value, current: score.total };
    }
  }

  function setGoalTarget(target: number) {
    goal.value = { ...goal.value, target };
  }

  function toggleStar(chunkEn: string) {
    starredChunks.value = starredChunks.value.includes(chunkEn)
      ? starredChunks.value.filter((c) => c !== chunkEn)
      : [...starredChunks.value, chunkEn];
  }

  function isStarred(chunkEn: string) {
    return starredChunks.value.includes(chunkEn);
  }

  function resetAll() {
    const d = cloneDefaults();
    goal.value = d.goal;
    partStats.value = d.partStats;
    mistakes.value = d.mistakes;
    examScores.value = d.examScores;
    starredChunks.value = d.starredChunks;
  }

  // ── Persist ─────────────────────────────────────────────────────────
  watch(
    [goal, partStats, mistakes, examScores, starredChunks],
    () => {
      if (typeof localStorage === 'undefined') return;
      const payload: PersistedTOEIC = {
        goal: goal.value,
        partStats: partStats.value,
        mistakes: mistakes.value,
        examScores: examScores.value,
        starredChunks: starredChunks.value,
      };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
      } catch {
        /* quota — ignore */
      }
    },
    { deep: true },
  );

  return {
    goal,
    partStats,
    mistakes,
    examScores,
    starredChunks,
    dailyHeat,
    skillMatrix,
    weakestPart,
    strongestPart,
    currentPhase,
    mistakeCount,
    recordAnswer,
    addMistake,
    markMistakeReviewed,
    deleteMistake,
    recordExamScore,
    setGoalTarget,
    toggleStar,
    isStarred,
    resetAll,
  };
});
