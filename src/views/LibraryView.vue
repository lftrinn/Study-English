<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import type { LibraryTab } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useUiStore } from '@/stores/uiStore';
import type { Chunk, ChunkLevel, ChunkSource } from '@/types/chunk';

import ChunkRow from '@/components/chunk/ChunkRow.vue';
import ChunkFormSheet from '@/components/chunk/ChunkFormSheet.vue';
import SkelChunkRow from '@/components/chunk/SkelChunkRow.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const ui = useUiStore();

const filterOpen = ref(false);
const formOpen = ref(false);

function getTabCount(key: LibraryTab): number {
  switch (key) {
    case 'starred':
      return progress.starredCount;
    case 'learning':
      return Array.from(progress.progressMap.values()).filter(
        (p) => p.status === 'learning' || p.status === 'familiar',
      ).length;
    case 'mastered':
      return progress.masteredCount;
    case 'unheard':
      return chunks.chunks.filter((c) => !progress.byId(c.id) || progress.byId(c.id)!.listenCount === 0).length;
    case 'all':
    default:
      return chunks.chunks.length;
  }
}

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'starred', label: 'Đã sao' },
  { key: 'learning', label: 'Đang học' },
  { key: 'mastered', label: 'Đã thuộc' },
  { key: 'unheard', label: 'Chưa nghe' },
];

const levels: Array<{ key: ChunkLevel | 'all'; label: string }> = [
  { key: 'all', label: 'Mọi cấp' },
  { key: 'A1', label: 'A1' },
  { key: 'A2', label: 'A2' },
  { key: 'B1', label: 'B1' },
];

const sources: Array<{ key: ChunkSource | 'all'; label: string }> = [
  { key: 'all', label: 'Tất cả pack' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'interview', label: 'Interview' },
  { key: 'toeic', label: 'TOEIC' },
  { key: 'angular', label: 'Angular' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'profile', label: 'Profile' },
  { key: 'custom', label: 'Custom' },
];

const filteredCount = computed(() => chunks.filtered.length);

function setTab(t: LibraryTab) {
  chunks.setTab(t);
}
function setTopic(id: string | 'all') {
  chunks.setTopic(id);
}
function clearAll() {
  chunks.clearFilters();
}

function playAll() {
  if (chunks.filtered.length === 0) return;
  player.setQueue([...chunks.filtered], { mode: 'topic' });
  void player.play();
  router.push('/player');
}

function shufflePlayAll() {
  if (chunks.filtered.length === 0) return;
  player.setShuffle(true);
  player.setQueue([...chunks.filtered], { mode: 'shuffle' });
  void player.play();
  router.push('/player');
}

function startFlashcards() {
  if (chunks.filtered.length === 0) return;
  practice.start({ mode: 'flashcard', chunks: [...chunks.filtered] });
  router.push('/study/flashcard');
}

function startWrite() {
  if (chunks.filtered.length === 0) return;
  practice.start({ mode: 'write', chunks: [...chunks.filtered] });
  router.push('/study/write');
}

function startDictation() {
  if (chunks.filtered.length === 0) return;
  practice.start({ mode: 'dictation', chunks: [...chunks.filtered] });
  router.push('/study/dictation');
}

function startLearn() {
  if (chunks.filtered.length === 0) return;
  router.push('/study/learn');
}

function startTest() {
  router.push('/study/test');
}

function startMatch() {
  router.push('/study/match');
}

function startSpeaking() {
  if (chunks.filtered.length === 0) return;
  practice.start({ mode: 'speaking', chunks: [...chunks.filtered] });
  router.push('/study/speaking');
}

function openDetail(chunk: Chunk) {
  ui.openChunkDetail(chunk.id);
}
function playChunk(chunk: Chunk) {
  player.setQueue([chunk], { mode: 'normal' });
  void player.play();
  router.push('/player');
}
function toggleStar(chunk: Chunk) {
  void progress.toggleStarred(chunk.id);
}
</script>

<template>
  <section class="lib">
    <header class="lib__head safe-pt">
      <div class="lib__title-block">
        <h1 class="lib__title">Library</h1>
        <p class="lib__sub">
          <span class="mono">{{ chunks.chunks.length }}</span> chunks across
          <span class="mono">{{ chunks.topics.length }}</span> topics
        </p>
      </div>

      <div class="lib__search-row">
        <label class="lib__search glass">
          <Icon name="search" :size="18" />
          <input
            :value="chunks.searchKeyword"
            type="search"
            placeholder="Search English or Vietnamese…"
            aria-label="Tìm kiếm"
            @input="chunks.setSearch(($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="chunks.searchKeyword"
            class="lib__search-clear tap"
            :aria-label="'Xoá'"
            @click="chunks.setSearch('')"
          >
            <Icon name="close" :size="14" />
          </button>
        </label>
        <button class="lib__filter glass tap" :aria-label="'Bộ lọc'" @click="filterOpen = true">
          <Icon name="filter" :size="18" />
        </button>
      </div>

      <nav class="lib__tabs no-scrollbar" aria-label="Lọc theo trạng thái">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="lib__tab tap"
          :class="{ 'is-active': chunks.activeTab === t.key }"
          @click="setTab(t.key)"
        >
          {{ t.label }}
          <span class="lib__tab-count mono">{{ getTabCount(t.key) }}</span>
        </button>
      </nav>

      <div class="lib__topics no-scrollbar" aria-label="Lọc theo chủ đề">
        <button
          class="lib__topic-chip lib__topic-chip--all tap"
          :class="{ 'is-active': chunks.selectedTopic === 'all' }"
          @click="setTopic('all')"
        >
          All topics
        </button>
        <button
          v-for="t in chunks.topicWithCounts"
          :key="t.id"
          class="lib__topic-chip tap"
          :class="{ 'is-active': chunks.selectedTopic === t.id }"
          :style="{
            '--c': t.color,
            background:
              chunks.selectedTopic === t.id
                ? `color-mix(in oklch, ${t.color} 32%, transparent)`
                : 'var(--color-surface-2)',
            color: chunks.selectedTopic === t.id ? t.color : 'var(--color-text-2)',
            borderColor:
              chunks.selectedTopic === t.id
                ? `color-mix(in oklch, ${t.color} 60%, var(--color-border-1))`
                : 'var(--color-border-1)',
          }"
          @click="setTopic(t.id)"
        >
          <TopicIcon :name="t.id" :size="13" />
          <span>{{ t.name }}</span>
        </button>
      </div>
    </header>

    <div class="lib__actions no-scrollbar">
      <AppButton variant="primary" size="sm" @click="playAll">
        <Icon name="play" :size="14" />
        Phát tất cả
      </AppButton>
      <AppButton variant="glass" size="sm" @click="shufflePlayAll">
        <Icon name="shuffle" :size="14" />
        Trộn
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startFlashcards">
        <Icon name="flashcard" :size="14" />
        Flashcard
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startLearn">
        <Icon name="sparkles" :size="14" />
        Learn
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startWrite">
        <Icon name="pencil" :size="14" />
        Write
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startDictation">
        <Icon name="ear" :size="14" />
        Dictation
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startSpeaking">
        <Icon name="mic" :size="14" />
        Speaking
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startTest">
        <Icon name="trophy" :size="14" />
        Test
      </AppButton>
      <AppButton variant="glass" size="sm" @click="startMatch">
        <Icon name="puzzle" :size="14" />
        Match
      </AppButton>
      <button
        v-if="chunks.searchKeyword || chunks.selectedTopic !== 'all' || chunks.selectedLevel !== 'all' || chunks.selectedSource !== 'all' || chunks.activeTab !== 'all'"
        class="lib__clear tap"
        @click="clearAll"
      >
        Xoá bộ lọc
      </button>
    </div>

    <div class="lib__list">
      <SkelChunkRow v-if="!chunks.loaded" :count="6" />

      <template v-else>
        <ChunkRow
          v-for="c in chunks.filtered"
          :key="c.id"
          :chunk="c"
          @open="openDetail"
          @play="playChunk"
          @toggle-star="toggleStar"
        />
        <EmptyState
          v-if="filteredCount === 0"
          icon="search"
          title="Không có chunk nào khớp"
          tone="violet"
          hint="Thử bỏ bớt bộ lọc, hoặc đổi từ khoá tìm kiếm."
        >
          <AppButton variant="glass" size="sm" @click="clearAll">
            <Icon name="x" :size="14" />
            Xoá bộ lọc
          </AppButton>
        </EmptyState>
      </template>
    </div>

    <ChunkFormSheet :open="formOpen" @close="formOpen = false" />

    <AppSheet :open="filterOpen" title="Bộ lọc" @close="filterOpen = false">
      <div class="filter">
        <section>
          <p class="filter__label">Cấp độ</p>
          <div class="filter__chips">
            <button
              v-for="l in levels"
              :key="l.key"
              class="filter__chip tap"
              :class="{ 'is-active': chunks.selectedLevel === l.key }"
              @click="chunks.setLevel(l.key as ChunkLevel | 'all')"
            >
              {{ l.label }}
            </button>
          </div>
        </section>
        <section>
          <p class="filter__label">Pack nguồn</p>
          <div class="filter__chips">
            <button
              v-for="s in sources"
              :key="s.key"
              class="filter__chip tap"
              :class="{ 'is-active': chunks.selectedSource === s.key }"
              @click="chunks.setSource(s.key as ChunkSource | 'all')"
            >
              {{ s.label }}
            </button>
          </div>
        </section>
      </div>
      <template #actions>
        <AppButton variant="glass" size="md" block @click="clearAll">Xoá tất cả</AppButton>
        <AppButton variant="primary" size="md" block @click="filterOpen = false">Áp dụng</AppButton>
      </template>
    </AppSheet>
  </section>
</template>

<style scoped>
.lib {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 56px 0 0;
}
.lib__head {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lib__title-block {
  padding: 8px 20px 0;
}
.lib__title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.lib__sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--color-text-3);
}

.lib__search-row {
  display: flex;
  gap: 8px;
  padding: 0 20px;
}
.lib__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 44px;
  border-radius: var(--radius-lg);
  color: var(--color-text-3);
}
.lib__search input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-1);
}
.lib__search input::placeholder {
  color: var(--color-text-3);
}
.lib__search-clear {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface-3);
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.lib__filter {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  color: var(--color-text-2);
}

.lib__tabs {
  display: flex;
  gap: 6px;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}
.lib__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
  white-space: nowrap;
}
.lib__tab.is-active {
  background: var(--color-surface-3);
  color: var(--color-text-1);
  border-color: var(--color-border-2);
}
.lib__tab-count {
  font-size: 11px;
  opacity: 0.7;
}

.lib__topics {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}
.lib__topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--color-surface-2);
  color: var(--color-text-2);
  border: 1px solid var(--color-border-1);
}
.lib__topic-chip--all {
  background: var(--color-surface-2);
  color: var(--color-text-2);
}
.lib__topic-chip--all.is-active {
  background: var(--grad-primary) !important;
  color: #0b0f22 !important;
  border-color: transparent !important;
}

.lib__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.lib__clear {
  margin-left: auto;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-text-3);
  text-decoration: underline;
  background: transparent;
}

.lib__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 20px 0;
}

/* Filter sheet */
.filter {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0 12px;
}
.filter__label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.filter__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter__chip {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}
.filter__chip.is-active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
</style>
