import type { ChunkStatus } from '@/types/chunk';
import type { ChunkProgress } from '@/types/progress';

const MIN_MS = 60 * 1000;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MIN_MS);
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * MIN_MS);
}

export type NextReview = {
  ease: number;
  interval: number; // in days; 0 for sub-day
  nextReviewAt: string; // ISO
  status: ChunkStatus;
};

/**
 * Spaced repetition rules (lite, README spec):
 *   Wrong answer            → 10 minutes
 *   Correct once            → 1 day
 *   Correct 2 in a row      → 3 days
 *   Correct 3 in a row      → 7 days
 *   Correct 5+              → mastered
 */
function next(p: ChunkProgress, isCorrect: boolean): NextReview {
  const now = new Date();
  const streakAfter = isCorrect ? p.correctStreak + 1 : 0;

  if (!isCorrect) {
    return {
      ease: Math.max(1.3, (p.ease ?? 2.5) - 0.2),
      interval: 0,
      nextReviewAt: addMinutes(now, 10).toISOString(),
      status: 'learning',
    };
  }

  if (streakAfter >= 5) {
    return {
      ease: (p.ease ?? 2.5) + 0.05,
      interval: 21,
      nextReviewAt: addDays(now, 21).toISOString(),
      status: 'mastered',
    };
  }

  let intervalDays = 1;
  let status: ChunkStatus = 'familiar';
  if (streakAfter === 1) intervalDays = 1;
  else if (streakAfter === 2) intervalDays = 3;
  else if (streakAfter === 3) intervalDays = 7;
  else if (streakAfter === 4) intervalDays = 14;

  if (streakAfter <= 1) status = 'learning';

  return {
    ease: Math.min(3, (p.ease ?? 2.5) + 0.05),
    interval: intervalDays,
    nextReviewAt: addDays(now, intervalDays).toISOString(),
    status,
  };
}

export const reviewScheduler = { next };
