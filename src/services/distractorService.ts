import type { Chunk } from '@/types/chunk';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type ChoiceDirection = 'pick-meaning' | 'pick-text';

export type ChoiceOption = {
  chunkId: string;
  label: string;
  isCorrect: boolean;
};

/**
 * Build a 4-option multiple choice question for `target`, drawing distractors
 * preferentially from chunks in the same topic. Falls back to any other chunk
 * if not enough same-topic candidates exist.
 */
function buildChoices(opts: {
  target: Chunk;
  pool: Chunk[];
  direction: ChoiceDirection;
  count?: number;
}): ChoiceOption[] {
  const count = opts.count ?? 4;
  const others = opts.pool.filter((c) => c.id !== opts.target.id);
  const sameTopic = shuffle(others.filter((c) => c.topic === opts.target.topic));
  const otherTopic = shuffle(others.filter((c) => c.topic !== opts.target.topic));

  const candidatePool = [...sameTopic, ...otherTopic];
  const distractors: Chunk[] = [];
  const seenLabels = new Set<string>();
  const labelOf = (c: Chunk) => (opts.direction === 'pick-meaning' ? c.meaning : c.text);
  seenLabels.add(labelOf(opts.target));

  for (const c of candidatePool) {
    if (distractors.length >= count - 1) break;
    const label = labelOf(c);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    distractors.push(c);
  }

  const options: ChoiceOption[] = [
    { chunkId: opts.target.id, label: labelOf(opts.target), isCorrect: true },
    ...distractors.map((c) => ({ chunkId: c.id, label: labelOf(c), isCorrect: false })),
  ];
  return shuffle(options);
}

export const distractorService = {
  buildChoices,
};
