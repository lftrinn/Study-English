/**
 * TOEIC Training Center — type definitions.
 *
 * Models real TOEIC 2-section / 7-Part structure. Question shape is
 * polymorphic (7 kinds: photo / qa / conv / talk / fill / cloze / passage)
 * because each Part renders a different stimulus.
 */

export type TOEICSection = 'listening' | 'reading';

export type TOEICPhaseId = 'foundation' | 'expand' | 'mastery';

export interface TOEICPart {
  id: number;
  section: TOEICSection;
  name: string;
  vi: string;
  /** Number of questions in the real test for this Part. */
  count: number;
  /** Approx time spent on this Part in a real test. */
  time: string;
  color: string;
  desc: string;
  skills: string[];
  /** Phase tags — a Part belongs to exactly one phase in the 450→550 path. */
  phase: TOEICPhaseId;
}

export interface TOEICPhase {
  id: TOEICPhaseId;
  name: string;
  vi: string;
  parts: number[];
  target: string;
  weeks: string;
  color: string;
  desc: string;
  focus: string;
}

export type TOEICQuestionKind =
  | 'photo'
  | 'qa'
  | 'conv'
  | 'talk'
  | 'fill'
  | 'cloze'
  | 'passage';

export interface TOEICQuestionBase {
  id: string;
  kind: TOEICQuestionKind;
  /** Tags identify which skill the question targets (matches Part.skills entries). */
  tags?: string[];
  /** Explanation shown after the user answers. */
  explain?: string;
}

export interface TOEICPhotoQuestion extends TOEICQuestionBase {
  kind: 'photo';
  topic: string;
  img?: string;
  audio?: string;
  options: string[];
  correct: number;
}

export interface TOEICQAQuestion extends TOEICQuestionBase {
  kind: 'qa';
  q: string;
  options: string[];
  correct: number;
}

export interface TOEICConvQuestion extends TOEICQuestionBase {
  kind: 'conv';
  topic: string;
  context: string;
  q: string;
  options: string[];
  correct: number;
}

export interface TOEICTalkQuestion extends TOEICQuestionBase {
  kind: 'talk';
  topic: string;
  context: string;
  q: string;
  options: string[];
  correct: number;
}

export interface TOEICFillQuestion extends TOEICQuestionBase {
  kind: 'fill';
  q: string;
  options: string[];
  correct: number;
}

export interface TOEICClozeBlank {
  idx: number;
  options: string[];
  correct: number;
  explain?: string;
}

export interface TOEICClozeQuestion extends TOEICQuestionBase {
  kind: 'cloze';
  passage: string;
  blanks: TOEICClozeBlank[];
}

export interface TOEICPassageSubQuestion {
  q: string;
  options: string[];
  correct: number;
  explain?: string;
}

export interface TOEICPassageQuestion extends TOEICQuestionBase {
  kind: 'passage';
  topic: string;
  passage: string;
  questions: TOEICPassageSubQuestion[];
}

export type TOEICQuestion =
  | TOEICPhotoQuestion
  | TOEICQAQuestion
  | TOEICConvQuestion
  | TOEICTalkQuestion
  | TOEICFillQuestion
  | TOEICClozeQuestion
  | TOEICPassageQuestion;

/** Snapshot of a mistake captured during practice. Persisted for review. */
export interface TOEICMistake {
  id: string;
  partId: number;
  q: string;
  yourAnswer: string;
  correctAnswer: string;
  /** ISO timestamp or human label ("2 giờ trước"). */
  when: string;
  explain: string;
  chunk: string;
  xpLost: number;
  reviewCount: number;
}

export interface TOEICChunkTopic {
  id: string;
  name: string;
  vi: string;
  color: string;
  count: number;
  /** Which TOEIC Parts the topic's chunks tend to show up in. */
  parts: number[];
}

export interface TOEICChunk {
  en: string;
  vi: string;
  parts: number[];
  freq: 'high' | 'mid' | 'low';
}

export interface TOEICGoal {
  current: number;
  target: number;
  peak: number;
}

/** Per-Part rollup used by Hub heatmap + Progress view. */
export interface TOEICPartStat {
  practiced: number;
  accuracy: number;
}

/** One day's practice activity, keyed by Part id. Value is accuracy 0..1. */
export interface TOEICDailyHeat {
  day: number;
  parts: Record<number, number>;
}

/** One cell of the Part × skill matrix on the Hub heatmap. */
export interface TOEICSkillCell {
  skill: string;
  accuracy: number;
  count: number;
}
