export type PracticeMode =
  | 'flashcard'
  | 'write'
  | 'dictation'
  | 'multiple-choice'
  | 'match'
  | 'test'
  | 'speaking';

export type PracticeResult = {
  id: string;
  chunkId: string;
  mode: PracticeMode;
  prompt: string;
  expectedAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  score?: number;
  practicedAt: string;
};

export type FlashcardDirection = 'en-to-vi' | 'vi-to-en';

export type AnswerCheckResult = {
  isCorrect: boolean;
  /** 0..1 fuzzy similarity. */
  score: number;
  expectedTokens: string[];
  userTokens: string[];
  /** Per-token diff for highlighting. */
  diff: Array<{ token: string; status: 'match' | 'wrong' | 'missing' }>;
};
