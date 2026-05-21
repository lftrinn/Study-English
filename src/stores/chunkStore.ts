import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Chunk, ChunkLevel, ChunkSource, Topic } from '@/types/chunk';
import { storageService } from '@/services/storageService';
import { useProgressStore } from './progressStore';

import topicsData from '@/data/topics.json';
import frontendChunks from '@/data/chunks.frontend.json';
import interviewChunks from '@/data/chunks.interview.json';
import toeicChunks from '@/data/chunks.toeic.json';
import profileChunks from '@/data/chunks.profile.json';
import angularChunks from '@/data/chunks.angular.json';
import javascriptChunks from '@/data/chunks.javascript.json';
import typescriptChunks from '@/data/chunks.typescript.json';

export type LibraryTab = 'all' | 'starred' | 'learning' | 'mastered' | 'unheard';

const STATIC_CHUNKS = [
  ...(frontendChunks as Chunk[]),
  ...(interviewChunks as Chunk[]),
  ...(toeicChunks as Chunk[]),
  ...(profileChunks as Chunk[]),
  ...(angularChunks as Chunk[]),
  ...(javascriptChunks as Chunk[]),
  ...(typescriptChunks as Chunk[]),
];

export const useChunkStore = defineStore('chunks', () => {
  const chunks = ref<Chunk[]>([]);
  const topics = ref<Topic[]>(topicsData as Topic[]);
  const loaded = ref(false);

  const selectedTopic = ref<string | 'all'>('all');
  const selectedLevel = ref<ChunkLevel | 'all'>('all');
  const selectedSource = ref<ChunkSource | 'all'>('all');
  const searchKeyword = ref('');
  const activeTab = ref<LibraryTab>('all');

  async function loadAll() {
    if (loaded.value) return;
    const custom = await storageService.getAllCustomChunks().catch(() => [] as Chunk[]);
    const merged = [...STATIC_CHUNKS, ...custom];
    // Dedupe by id (custom overrides static if same id).
    const map = new Map<string, Chunk>();
    for (const c of merged) map.set(c.id, c);
    chunks.value = Array.from(map.values());
    loaded.value = true;
  }

  function byId(id: string): Chunk | undefined {
    return chunks.value.find((c) => c.id === id);
  }

  function topicById(id: string): Topic | undefined {
    return topics.value.find((t) => t.id === id);
  }

  function chunksByTopic(topicId: string): Chunk[] {
    return chunks.value.filter((c) => c.topic === topicId);
  }

  const topicWithCounts = computed<Topic[]>(() =>
    topics.value.map((t) => ({ ...t, count: chunksByTopic(t.id).length })),
  );

  function matchesSearch(c: Chunk, kw: string): boolean {
    if (!kw) return true;
    const k = kw.toLowerCase();
    return (
      c.text.toLowerCase().includes(k) ||
      c.meaning.toLowerCase().includes(k) ||
      c.topic.toLowerCase().includes(k) ||
      c.tags.some((t) => t.toLowerCase().includes(k))
    );
  }

  const filtered = computed<Chunk[]>(() => {
    const progress = useProgressStore();
    return chunks.value.filter((c) => {
      if (selectedTopic.value !== 'all' && c.topic !== selectedTopic.value) return false;
      if (selectedLevel.value !== 'all' && c.level !== selectedLevel.value) return false;
      if (selectedSource.value !== 'all' && c.source !== selectedSource.value) return false;
      if (!matchesSearch(c, searchKeyword.value)) return false;

      const p = progress.byId(c.id);
      switch (activeTab.value) {
        case 'starred':
          return Boolean(p?.starred);
        case 'learning':
          return p?.status === 'learning' || p?.status === 'familiar';
        case 'mastered':
          return p?.status === 'mastered';
        case 'unheard':
          return !p || p.listenCount === 0;
        case 'all':
        default:
          return true;
      }
    });
  });

  function setTopic(id: string | 'all') {
    selectedTopic.value = id;
  }
  function setLevel(l: ChunkLevel | 'all') {
    selectedLevel.value = l;
  }
  function setSource(s: ChunkSource | 'all') {
    selectedSource.value = s;
  }
  function setSearch(kw: string) {
    searchKeyword.value = kw;
  }
  function setTab(tab: LibraryTab) {
    activeTab.value = tab;
  }
  function clearFilters() {
    selectedTopic.value = 'all';
    selectedLevel.value = 'all';
    selectedSource.value = 'all';
    searchKeyword.value = '';
    activeTab.value = 'all';
  }

  const customChunks = computed(() => chunks.value.filter((c) => c.source === 'custom'));

  async function upsertCustomChunk(c: Chunk) {
    const normalized: Chunk = { ...c, source: 'custom' };
    await storageService.putCustomChunk(normalized);
    const idx = chunks.value.findIndex((x) => x.id === normalized.id);
    if (idx >= 0) chunks.value.splice(idx, 1, normalized);
    else chunks.value.push(normalized);
  }

  async function deleteCustomChunkById(id: string) {
    await storageService.deleteCustomChunk(id);
    chunks.value = chunks.value.filter((c) => c.id !== id);
  }

  return {
    chunks,
    topics,
    loaded,
    selectedTopic,
    selectedLevel,
    selectedSource,
    searchKeyword,
    activeTab,
    topicWithCounts,
    filtered,
    customChunks,
    loadAll,
    byId,
    topicById,
    chunksByTopic,
    setTopic,
    setLevel,
    setSource,
    setSearch,
    setTab,
    clearFilters,
    upsertCustomChunk,
    deleteCustomChunkById,
  };
});
