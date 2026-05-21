import type { ChunkStatus } from './chunk';

export type ChunkProgress = {
  chunkId: string;
  listenCount: number;
  speakCount: number;
  correctCount: number;
  wrongCount: number;
  correctStreak: number;
  lastListenedAt?: string;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  status: ChunkStatus;
  starred: boolean;
  /** SM-2 ease factor. */
  ease?: number;
  /** SM-2 interval in days. */
  interval?: number;
};

export type ListeningMode = 'normal' | 'shuffle' | 'topic' | 'review' | 'passive';

export type ListeningLog = {
  id: string;
  chunkId: string;
  text: string;
  meaning: string;
  topic: string;
  voiceName?: string;
  rate: number;
  playedAt: string;
  mode: ListeningMode;
};

export type DailyStat = {
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  listenCount: number;
  practiceCount: number;
  speakCount: number;
};
