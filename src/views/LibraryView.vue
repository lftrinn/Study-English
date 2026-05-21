<script setup lang="ts">
/**
 * Literal port of screens-main.jsx LibraryScreen (lines 202-312) +
 * FilterSheetContent (lines 344-390). All inline styles preserved.
 */
import { computed, ref, watch } from 'vue';
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
import LoadingLibrary from '@/components/common/LoadingLibrary.vue';
import EmptyFiltered from '@/components/common/EmptyFiltered.vue';
import EmptyLibrary from '@/components/common/EmptyLibrary.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const ui = useUiStore();

const filterOpen = ref(false);
const formOpen = ref(false);
const editingChunk = ref<Chunk | undefined>(undefined);

const levelFilters = ref<ChunkLevel[]>([...chunks.selectedLevels]);
const sourceFilters = ref<ChunkSource[]>([...chunks.selectedSources]);

watch(filterOpen, (open) => {
  if (open) {
    levelFilters.value = [...chunks.selectedLevels];
    sourceFilters.value = [...chunks.selectedSources];
  }
});

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'starred', label: 'Đã sao' },
  { key: 'learning', label: 'Đang học' },
  { key: 'mastered', label: 'Đã thuộc' },
  { key: 'unheard', label: 'Chưa nghe' },
];

const SOURCES: Array<{ key: ChunkSource; label: string }> = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'interview', label: 'Interview' },
  { key: 'toeic', label: 'TOEIC' },
  { key: 'angular', label: 'Angular' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'profile', label: 'Profile' },
  { key: 'custom', label: 'Custom' },
];

const LEVELS: ChunkLevel[] = ['A1', 'A2', 'B1'];

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
      return chunks.chunks.filter(
        (c) => !progress.byId(c.id) || progress.byId(c.id)!.listenCount === 0,
      ).length;
    case 'all':
    default:
      return chunks.chunks.length;
  }
}

const filteredChunks = computed(() => chunks.filtered);

function setTab(t: LibraryTab) {
  chunks.setTab(t);
}
function setTopic(id: string | 'all') {
  chunks.setTopic(id);
}
function clearAll() {
  chunks.clearFilters();
  levelFilters.value = [];
  sourceFilters.value = [];
  filterOpen.value = false;
}
function applyFilters() {
  chunks.setLevels(levelFilters.value);
  chunks.setSources(sourceFilters.value);
  filterOpen.value = false;
}
function toggleLevel(l: ChunkLevel) {
  const idx = levelFilters.value.indexOf(l);
  if (idx >= 0) levelFilters.value.splice(idx, 1);
  else levelFilters.value.push(l);
}
function toggleSource(s: ChunkSource) {
  const idx = sourceFilters.value.indexOf(s);
  if (idx >= 0) sourceFilters.value.splice(idx, 1);
  else sourceFilters.value.push(s);
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

function openNewChunk() {
  editingChunk.value = undefined;
  formOpen.value = true;
}
</script>

<template>
  <div class="library-view">
    <!-- Sticky top: header + search + tabs + topic chips -->
    <div class="library-top">
      <!-- Header -->
      <div :style="{ padding: '8px 20px 14px' }">
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }">
          <div>
            <h1 :style="{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }">Library</h1>
            <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">{{ chunks.chunks.length }}</span> chunks ·
              <span class="mono">{{ chunks.topics.length }}</span> topics
            </div>
          </div>
          <button
            class="btn tap"
            :style="{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'color-mix(in oklch, var(--color-cyan) 16%, transparent)',
              border: '1px solid color-mix(in oklch, var(--color-cyan) 35%, transparent)',
              color: 'var(--color-cyan)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }"
            @click="openNewChunk"
          >
            <Icon name="plus" :size="12" /> Thêm
          </button>
        </div>
      </div>

    <!-- Search row -->
    <div :style="{ padding: '0 20px', display: 'flex', gap: '8px' }">
      <label
        class="glass"
        :style="{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 14px',
          height: '44px',
        }"
      >
        <Icon name="search" :size="18" :style="{ color: 'var(--color-text-3)' }" />
        <input
          :value="chunks.searchKeyword"
          type="search"
          placeholder="Tìm English hoặc Vietnamese…"
          :style="{
            flex: 1,
            background: 'transparent',
            border: 0,
            outline: 'none',
            color: 'var(--color-text-1)',
            fontSize: '14px',
            fontFamily: 'inherit',
          }"
          @input="chunks.setSearch(($event.target as HTMLInputElement).value)"
        />
      </label>
      <button
        class="btn tap glass"
        :style="{ width: '44px', height: '44px', display: 'grid', placeItems: 'center' }"
        :aria-label="'Bộ lọc'"
        @click="filterOpen = true"
      >
        <Icon name="filter" :size="18" :style="{ color: 'var(--color-text-2)' }" />
      </button>
    </div>

    <!-- Tabs -->
    <div
      class="no-scrollbar"
      :style="{ display: 'flex', gap: '6px', padding: '14px 20px 0', overflowX: 'auto' }"
    >
      <button
        v-for="t in tabs"
        :key="t.key"
        class="btn tap"
        :style="{
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: 600,
          background: chunks.activeTab === t.key ? 'var(--color-surface-3)' : 'transparent',
          color: chunks.activeTab === t.key ? 'var(--color-text-1)' : 'var(--color-text-3)',
          border: chunks.activeTab === t.key
            ? '1px solid var(--color-border-2)'
            : '1px solid var(--color-border-1)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }"
        @click="setTab(t.key)"
      >
        {{ t.label }}
        <span class="mono" :style="{ fontSize: '11px', opacity: 0.7 }">{{ getTabCount(t.key) }}</span>
      </button>
    </div>

    <!-- Topic chip scroller -->
    <div
      class="no-scrollbar"
      :style="{ display: 'flex', gap: '8px', padding: '12px 20px 0', overflowX: 'auto' }"
    >
      <button
        class="btn tap"
        :style="{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          background: chunks.selectedTopic === 'all' ? 'var(--grad-primary)' : 'var(--color-surface-2)',
          color: chunks.selectedTopic === 'all' ? '#0B0F22' : 'var(--color-text-2)',
          border: '1px solid var(--color-border-1)',
          whiteSpace: 'nowrap',
        }"
        @click="setTopic('all')"
      >All topics</button>
      <button
        v-for="t in chunks.topicWithCounts"
        :key="t.id"
        class="btn tap"
        :style="{
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          background: chunks.selectedTopic === t.id
            ? `color-mix(in oklch, ${t.color} 32%, transparent)`
            : 'var(--color-surface-2)',
          color: chunks.selectedTopic === t.id ? t.color : 'var(--color-text-2)',
          border: `1px solid color-mix(in oklch, ${t.color} ${chunks.selectedTopic === t.id ? 60 : 0}%, var(--color-border-1))`,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }"
        @click="setTopic(t.id)"
      >
        <TopicIcon :name="t.id" :size="13" />{{ t.name }}
      </button>
      </div>
    </div>

    <!-- Result list (scrollable area) -->
    <div class="library-list no-scrollbar">
      <LoadingLibrary v-if="!chunks.loaded" />
      <template v-else>
        <EmptyLibrary v-if="chunks.chunks.length === 0" @seed="router.push('/onboarding')" @import="openNewChunk" />
        <template v-else>
          <ChunkRow
            v-for="c in filteredChunks"
            :key="c.id"
            :chunk="c"
            @open="openDetail"
            @play="playChunk"
            @toggle-star="toggleStar"
          />
          <EmptyFiltered v-if="filteredChunks.length === 0" @reset="clearAll" />
        </template>
      </template>
    </div>

    <!-- Filter sheet -->
    <AppSheet :open="filterOpen" title="Filter chunks" @close="filterOpen = false">
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '8px' }">
        <div>
          <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '8px' }">Level</div>
          <div :style="{ display: 'flex', gap: '8px' }">
            <button
              v-for="l in LEVELS"
              :key="l"
              class="btn tap"
              :style="{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                background: levelFilters.includes(l) ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
                border: levelFilters.includes(l) ? '1px solid var(--color-violet)' : '1px solid var(--color-border-1)',
                fontSize: '14px',
                fontWeight: 700,
                color: levelFilters.includes(l) ? 'var(--color-violet)' : 'var(--color-text-2)',
              }"
              @click="toggleLevel(l)"
            >{{ l }}</button>
          </div>
        </div>
        <div>
          <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '8px' }">Source</div>
          <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }">
            <button
              v-for="s in SOURCES"
              :key="s.key"
              class="btn tap"
              :style="{
                padding: '10px 14px',
                borderRadius: '14px',
                textAlign: 'left',
                background: sourceFilters.includes(s.key) ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
                border: sourceFilters.includes(s.key) ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: 600,
              }"
              @click="toggleSource(s.key)"
            >
              {{ s.label }}
              <Icon v-if="sourceFilters.includes(s.key)" name="check" :size="16" :style="{ color: 'var(--color-cyan)' }" />
            </button>
          </div>
        </div>
        <div :style="{ display: 'flex', gap: '8px', paddingTop: '4px' }">
          <button
            class="btn tap glass"
            :style="{ flex: 1, padding: '14px 0', fontSize: '14px', fontWeight: 700 }"
            @click="clearAll"
          >Reset</button>
          <button
            class="btn tap"
            :style="{
              flex: 2,
              padding: '14px 0',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 700,
              background: 'var(--grad-primary)',
              color: '#0B0F22',
            }"
            @click="applyFilters"
          >Apply · {{ filteredChunks.length }} chunks</button>
        </div>
      </div>
    </AppSheet>

    <ChunkFormSheet :open="formOpen" :initial="editingChunk" @close="formOpen = false" />
  </div>
</template>

<style scoped>
.library-view {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.library-top {
  flex: 0 0 auto;
  padding-top: 56px;
  background: linear-gradient(
    180deg,
    color-mix(in oklch, var(--color-bg-0) 92%, transparent) 0%,
    color-mix(in oklch, var(--color-bg-0) 92%, transparent) 88%,
    transparent 100%
  );
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  padding-bottom: 14px;
  z-index: 2;
}
.library-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px calc(120px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
