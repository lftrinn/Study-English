export type ChunkLevel = 'A1' | 'A2' | 'B1';

export type ChunkStatus = 'new' | 'learning' | 'familiar' | 'mastered';

export type ChunkSource =
  | 'frontend'
  | 'interview'
  | 'toeic'
  | 'profile'
  | 'angular'
  | 'javascript'
  | 'typescript'
  | 'custom';

export type ChunkExampleContext =
  | 'standup'
  | 'slack'
  | 'client'
  | 'interview'
  | 'toeic'
  | 'general';

export type ChunkExample = {
  context: ChunkExampleContext;
  text: string;
  meaning: string;
};

export type Chunk = {
  id: string;
  text: string;
  meaning: string;
  topic: string;
  level: ChunkLevel;
  source: ChunkSource;
  tags: string[];
  examples?: ChunkExample[];
  phonetic?: string;
  note?: string;
  audio?: Partial<Record<string, string>>;
};

export type Topic = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  /** Optional precomputed count of chunks in this topic. */
  count?: number;
};
