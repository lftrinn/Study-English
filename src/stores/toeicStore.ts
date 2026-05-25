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
  TOEIC_PARTS,
  TOEIC_QUESTIONS,
  makeSkillMatrix,
} from '@/data/toeic';
import { storageService } from '@/services/storageService';
import type {
  TOEICGoal,
  TOEICMistake,
  TOEICPartStat,
  TOEICPhaseId,
  TOEICQuestion,
  TOEICSkillCell,
} from '@/types/toeic';

// v2: dropped the demo seed data — stats/scores/heatmap now reflect only the
// user's real activity. (Bumped key so stale v1 seed data doesn't leak in.)
const LS_KEY = 'cll.toeic.v2';

export interface ExamPartResult {
  correct: number;
  total: number;
}

interface ExamScore {
  /** ISO timestamp. */
  takenAt: string;
  listening: number;
  reading: number;
  total: number;
  /** Per-Part correct/total from this attempt, for the result breakdown. */
  breakdown?: Record<number, ExamPartResult>;
}

interface DayPartStat {
  correct: number;
  total: number;
}
/** Per-day (YYYY-MM-DD) × per-Part practice tally for the activity heatmap. */
type DailyActivity = Record<string, Record<number, DayPartStat>>;

interface PersistedTOEIC {
  goal: TOEICGoal;
  partStats: Record<number, TOEICPartStat>;
  mistakes: TOEICMistake[];
  examScores: ExamScore[];
  starredChunks: string[];
  dailyActivity: DailyActivity;
}

const DEFAULTS: PersistedTOEIC = {
  goal: { ...TOEIC_GOAL_DEFAULT },
  partStats: {},
  mistakes: [],
  examScores: [],
  starredChunks: [],
  dailyActivity: {},
};

function load(): PersistedTOEIC {
  if (typeof localStorage === 'undefined') return cloneDefaults();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<PersistedTOEIC>;
    return {
      goal: { ...DEFAULTS.goal, ...(parsed.goal ?? {}) },
      partStats: parsed.partStats ?? {},
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      examScores: Array.isArray(parsed.examScores) ? parsed.examScores : [],
      starredChunks: Array.isArray(parsed.starredChunks) ? parsed.starredChunks : [],
      dailyActivity: parsed.dailyActivity ?? {},
    };
  } catch {
    return cloneDefaults();
  }
}

function cloneDefaults(): PersistedTOEIC {
  return {
    goal: { ...DEFAULTS.goal },
    partStats: {},
    mistakes: [],
    examScores: [],
    starredChunks: [],
    dailyActivity: {},
  };
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useToeicStore = defineStore('toeic', () => {
  const initial = load();

  const goal = ref<TOEICGoal>(initial.goal);
  const partStats = ref<Record<number, TOEICPartStat>>(initial.partStats);
  const mistakes = ref<TOEICMistake[]>(initial.mistakes);
  const examScores = ref<ExamScore[]>(initial.examScores);
  const starredChunks = ref<string[]>(initial.starredChunks);
  const dailyActivity = ref<DailyActivity>(initial.dailyActivity);

  // 28-day × Part heatmap derived from real daily activity. Cells stay empty
  // until the user actually practices that Part on that day.
  const dailyHeat = computed(() => {
    const days: { day: number; parts: Record<number, number> }[] = [];
    const now = new Date();
    for (let d = 27; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      const rec = dailyActivity.value[dayKey(date)] ?? {};
      const parts: Record<number, number> = {};
      for (const [p, st] of Object.entries(rec)) {
        if (st.total > 0) parts[Number(p)] = st.correct / st.total;
      }
      days.push({ day: d, parts });
    }
    return days;
  });

  // User-imported questions, keyed by Part. Empty until loadUserContent()
  // runs; views fall back to the bundled samples when a Part is empty.
  const userQuestions = ref<Record<number, TOEICQuestion[]>>({});
  const contentLoaded = ref(false);

  async function loadUserContent() {
    try {
      const rows = await storageService.getAllToeicQuestions();
      const map: Record<number, TOEICQuestion[]> = {};
      for (const r of rows) {
        (map[r.part] ??= []).push(r.data);
      }
      userQuestions.value = map;
    } catch {
      userQuestions.value = {};
    } finally {
      contentLoaded.value = true;
    }
  }

  /** Questions for a Part: user-imported if any, else bundled samples. */
  function questionsForPart(part: number): TOEICQuestion[] {
    const user = userQuestions.value[part];
    if (user && user.length > 0) return user;
    return TOEIC_QUESTIONS[part] ?? [];
  }

  const hasUserContent = computed(() =>
    Object.values(userQuestions.value).some((arr) => arr.length > 0),
  );

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
    // Log into today's bucket so the activity heatmap reflects real practice.
    const key = dayKey(new Date());
    const day = { ...(dailyActivity.value[key] ?? {}) };
    const cur = day[partId] ?? { correct: 0, total: 0 };
    day[partId] = { correct: cur.correct + (correct ? 1 : 0), total: cur.total + 1 };
    dailyActivity.value = { ...dailyActivity.value, [key]: day };
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

  function recordExamScore(
    listening: number,
    reading: number,
    breakdown?: Record<number, ExamPartResult>,
  ) {
    const score: ExamScore = {
      takenAt: new Date().toISOString(),
      listening,
      reading,
      total: listening + reading,
      breakdown,
    };
    examScores.value = [...examScores.value.slice(-11), score];
    if (score.total > goal.value.current) {
      goal.value = { ...goal.value, current: score.total };
    }
  }

  const lastExam = computed<ExamScore | null>(() =>
    examScores.value.length > 0 ? examScores.value[examScores.value.length - 1] : null,
  );

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
    dailyActivity.value = d.dailyActivity;
  }

  // ── Persist ─────────────────────────────────────────────────────────
  watch(
    [goal, partStats, mistakes, examScores, starredChunks, dailyActivity],
    () => {
      if (typeof localStorage === 'undefined') return;
      const payload: PersistedTOEIC = {
        goal: goal.value,
        partStats: partStats.value,
        mistakes: mistakes.value,
        examScores: examScores.value,
        starredChunks: starredChunks.value,
        dailyActivity: dailyActivity.value,
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
    dailyActivity,
    dailyHeat,
    lastExam,
    userQuestions,
    contentLoaded,
    hasUserContent,
    skillMatrix,
    weakestPart,
    strongestPart,
    currentPhase,
    mistakeCount,
    loadUserContent,
    questionsForPart,
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
