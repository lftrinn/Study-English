import type { Chunk, ChunkLevel, ChunkSource } from '@/types/chunk';
import type { ChunkProgress } from '@/types/progress';

export type PlaylistFilter = {
  topic?: string | 'all';
  level?: ChunkLevel | 'all';
  source?: ChunkSource | 'all';
  starredOnly?: boolean;
  unheardOnly?: boolean;
  limit?: number;
};

function getProgress(
  progressMap: Map<string, ChunkProgress>,
  chunkId: string,
): ChunkProgress | undefined {
  return progressMap.get(chunkId);
}

function build(
  chunks: Chunk[],
  progressMap: Map<string, ChunkProgress>,
  filter: PlaylistFilter,
): Chunk[] {
  const filtered = chunks.filter((c) => {
    if (filter.topic && filter.topic !== 'all' && c.topic !== filter.topic) return false;
    if (filter.level && filter.level !== 'all' && c.level !== filter.level) return false;
    if (filter.source && filter.source !== 'all' && c.source !== filter.source) return false;
    const p = getProgress(progressMap, c.id);
    if (filter.starredOnly && !p?.starred) return false;
    if (filter.unheardOnly && p && p.listenCount > 0) return false;
    return true;
  });
  return filter.limit ? filtered.slice(0, filter.limit) : filtered;
}

function buildReview(
  chunks: Chunk[],
  progressMap: Map<string, ChunkProgress>,
  opts: { limit?: number } = {},
): Chunk[] {
  const now = new Date().toISOString();
  const due = chunks
    .map((c) => ({ chunk: c, progress: progressMap.get(c.id) }))
    .filter(({ progress }) => progress?.nextReviewAt && progress.nextReviewAt <= now && progress.status !== 'mastered')
    .sort((a, b) => (a.progress?.nextReviewAt ?? '').localeCompare(b.progress?.nextReviewAt ?? ''))
    .map(({ chunk }) => chunk);
  return opts.limit ? due.slice(0, opts.limit) : due;
}

function buildMistakes(
  chunks: Chunk[],
  progressMap: Map<string, ChunkProgress>,
  opts: { limit?: number } = {},
): Chunk[] {
  const weak = chunks
    .map((c) => ({ chunk: c, progress: progressMap.get(c.id) }))
    .filter(({ progress }) => progress && progress.wrongCount > 0 && progress.wrongCount >= progress.correctCount)
    .sort((a, b) => (b.progress?.wrongCount ?? 0) - (a.progress?.wrongCount ?? 0))
    .map(({ chunk }) => chunk);
  return opts.limit ? weak.slice(0, opts.limit) : weak;
}

function buildLowListen(
  chunks: Chunk[],
  progressMap: Map<string, ChunkProgress>,
  opts: { threshold?: number; limit?: number } = {},
): Chunk[] {
  const threshold = opts.threshold ?? 3;
  const list = chunks
    .map((c) => ({ chunk: c, listen: progressMap.get(c.id)?.listenCount ?? 0 }))
    .filter(({ listen }) => listen < threshold)
    .sort((a, b) => a.listen - b.listen)
    .map(({ chunk }) => chunk);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

function buildStarred(
  chunks: Chunk[],
  progressMap: Map<string, ChunkProgress>,
  opts: { limit?: number } = {},
): Chunk[] {
  const list = chunks.filter((c) => progressMap.get(c.id)?.starred);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export const playlistService = {
  build,
  buildReview,
  buildMistakes,
  buildLowListen,
  buildStarred,
};
