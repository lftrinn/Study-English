<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import ChunkFormSheet from '@/components/chunk/ChunkFormSheet.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import type { Chunk, ChunkLevel, ChunkSource } from '@/types/chunk';
import type { LibraryTab } from '@/stores/chunkStore';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const ui = useUiStore();

const view = ref<'grid' | 'list'>('grid');
const filterOpen = ref(false);
const formOpen = ref(false);
const editingChunk = ref<Chunk | undefined>(undefined);
const menuOpenId = ref<string | null>(null);

const levelFilters = ref<ChunkLevel[]>([...chunks.selectedLevels]);
const sourceFilters = ref<ChunkSource[]>([...chunks.selectedSources]);

const LEVELS: ChunkLevel[] = ['A1', 'A2', 'B1'];
const SOURCES: Array<{ key: ChunkSource; label: string }> = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'interview', label: 'Interview' },
  { key: 'toeic', label: 'TOEIC' },
  { key: 'profile', label: 'Profile' },
  { key: 'angular', label: 'Angular' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'custom', label: 'Custom' },
];

const tabs = computed(() => {
  const all = chunks.chunks;
  // Single pass — was 5 separate filter() calls over the full chunk list,
  // re-running on every progress update.
  let starred = 0;
  let learning = 0;
  let mastered = 0;
  let unheard = 0;
  for (const c of all) {
    const p = progress.byId(c.id);
    if (p?.starred) starred += 1;
    if (p?.status === 'learning' || p?.status === 'familiar') learning += 1;
    if (p?.status === 'mastered') mastered += 1;
    if (!p || p.listenCount === 0) unheard += 1;
  }
  return [
    { id: 'all' as LibraryTab, label: 'All', count: all.length },
    { id: 'starred' as LibraryTab, label: 'Starred', count: starred },
    { id: 'learning' as LibraryTab, label: 'Learning', count: learning },
    { id: 'mastered' as LibraryTab, label: 'Mastered', count: mastered },
    { id: 'unheard' as LibraryTab, label: 'Unheard', count: unheard },
  ];
});

const filtered = computed(() => chunks.filtered);
const selectedId = computed(() => ui.selectedChunkId);

function setTopic(id: string) { chunks.setTopic(id); }
function setTab(id: LibraryTab) { chunks.setTab(id); }
function select(c: Chunk) { ui.selectChunk(c.id); }
function openDetail(c: Chunk) { ui.openChunkDetail(c.id); }

function play(c: Chunk) {
  const i = filtered.value.findIndex((x) => x.id === c.id);
  const queue = filtered.value.length > 0 ? filtered.value : [c];
  player.setQueue(queue, { startIndex: Math.max(0, i), mode: 'normal' });
  ui.selectChunk(c.id);
  void player.play();
  router.push('/player');
}

function playAll() {
  if (filtered.value.length === 0) return;
  player.setQueue([...filtered.value], { mode: 'normal' });
  void player.play();
  router.push('/player');
}

function openNewChunk() {
  editingChunk.value = undefined;
  formOpen.value = true;
}

function toggleLevel(l: ChunkLevel) {
  levelFilters.value = levelFilters.value.includes(l)
    ? levelFilters.value.filter((x) => x !== l)
    : [...levelFilters.value, l];
}
function toggleSource(s: ChunkSource) {
  sourceFilters.value = sourceFilters.value.includes(s)
    ? sourceFilters.value.filter((x) => x !== s)
    : [...sourceFilters.value, s];
}
function applyFilters() {
  chunks.setLevels(levelFilters.value);
  chunks.setSources(sourceFilters.value);
  filterOpen.value = false;
}
function resetFilters() {
  levelFilters.value = [];
  sourceFilters.value = [];
  chunks.setLevels([]);
  chunks.setSources([]);
  chunks.setSearch('');
  chunks.setTopic('all');
  chunks.setTab('all');
  filterOpen.value = false;
}
function openFilters() {
  levelFilters.value = [...chunks.selectedLevels];
  sourceFilters.value = [...chunks.selectedSources];
  filterOpen.value = true;
}

function toggleMenu(id: string, e: MouseEvent) {
  e.stopPropagation();
  menuOpenId.value = menuOpenId.value === id ? null : id;
}
function editChunk(c: Chunk) {
  editingChunk.value = c;
  formOpen.value = true;
  menuOpenId.value = null;
}
async function deleteChunk(c: Chunk) {
  menuOpenId.value = null;
  if (c.source !== 'custom') {
    window.alert('Chỉ chunk custom mới xoá được. Bỏ sao để ẩn khỏi danh sách.');
    return;
  }
  if (!window.confirm(`Xoá "${c.text}"?`)) return;
  await chunks.deleteCustomChunkById(c.id);
}

const filterActiveCount = computed(
  () => chunks.selectedLevels.length + chunks.selectedSources.length,
);
</script>

<template>
  <div class="scrollarea dt-lib" @click="menuOpenId = null">
    <!-- Header -->
    <div class="dt-lib__head">
      <div>
        <h1 class="dt-lib__title">
          Library <span class="dt-lib__title-sub">· {{ chunks.chunks.length }} chunks</span>
        </h1>
        <div class="dt-lib__sub">
          Đang hiển thị <span class="mono">{{ filtered.length }}</span> · qua
          <span class="mono">{{ chunks.topics.length }}</span> topics
        </div>
      </div>
      <div class="dt-lib__actions">
        <div class="dt-lib__view">
          <button
            class="btn tap dt-lib__view-btn"
            :class="{ 'is-active': view === 'list' }"
            :title="'Hiển thị dạng list'"
            @click="view = 'list'"
          >
            <Icon name="list" :size="14" :style="{ color: view === 'list' ? 'var(--color-cyan)' : 'var(--color-text-3)' }" />
          </button>
          <button
            class="btn tap dt-lib__view-btn"
            :class="{ 'is-active': view === 'grid' }"
            :title="'Hiển thị dạng grid'"
            @click="view = 'grid'"
          >
            <Icon name="grid" :size="14" :style="{ color: view === 'grid' ? 'var(--color-cyan)' : 'var(--color-text-3)' }" />
          </button>
        </div>
        <button class="btn tap glass dt-lib__btn-secondary" @click="playAll" title="Phát toàn bộ kết quả">
          <Icon name="play" :size="13" :style="{ color: 'var(--color-text-2)' }" />
          Play all
        </button>
        <button
          class="btn tap glass dt-lib__btn-secondary"
          :class="{ 'has-badge': filterActiveCount > 0 }"
          @click="openFilters"
        >
          <Icon name="filter" :size="13" :style="{ color: 'var(--color-text-2)' }" />
          Filters
          <span v-if="filterActiveCount > 0" class="mono dt-lib__btn-badge">{{ filterActiveCount }}</span>
        </button>
        <button class="btn tap dt-lib__add" @click="openNewChunk">
          <span class="dt-lib__add-shine" aria-hidden="true" />
          <Icon name="plus" :size="13" :style="{ color: '#fff', position: 'relative' }" />
          <span style="position: relative">Add chunk</span>
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="dt-lib__tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="btn tap dt-lib__tab"
        :class="{ 'is-active': chunks.activeTab === t.id }"
        @click="setTab(t.id)"
      >
        {{ t.label }}<span class="mono dt-lib__tab-cnt">{{ t.count }}</span>
      </button>
    </div>

    <!-- Topic chip scroller -->
    <div class="dt-lib__topics">
      <button
        class="btn tap dt-lib__chip"
        :class="{ 'is-active-all': chunks.selectedTopic === 'all' }"
        @click="setTopic('all')"
      >All topics</button>
      <button
        v-for="t in chunks.topicWithCounts"
        :key="t.id"
        class="btn tap dt-lib__chip"
        :style="chunks.selectedTopic === t.id ? {
          background: `color-mix(in oklch, ${t.color} 28%, transparent)`,
          color: t.color,
          border: `1px solid color-mix(in oklch, ${t.color} 55%, var(--color-border-1))`,
        } : {}"
        @click="setTopic(t.id)"
      >
        <TopicIcon :name="t.id" :size="12" :style="{ color: chunks.selectedTopic === t.id ? t.color : 'var(--color-text-3)' }" />
        {{ t.name }}
      </button>
    </div>

    <!-- Grid view -->
    <div v-if="view === 'grid'" class="dt-lib__grid">
      <div
        v-for="c in filtered"
        :key="c.id"
        class="tap dt-lib__card"
        :class="{ 'is-active': selectedId === c.id }"
        :style="selectedId === c.id ? {
          background: `linear-gradient(160deg, color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 16%, var(--color-surface-2)), var(--color-surface-2))`,
          border: `1px solid ${chunks.topicById(c.topic)?.color ?? '#22D3EE'}`,
        } : {}"
        :title="'Click chọn · Double-click xem chi tiết'"
        @click="select(c)"
        @dblclick="openDetail(c)"
      >
        <div class="dt-lib__card-top">
          <TopicChip :topic-id="c.topic" size="sm" />
          <div class="dt-lib__card-tools">
            <button class="btn tap dt-lib__star" aria-label="Star" @click.stop="progress.toggleStarred(c.id)">
              <Icon
                :name="progress.byId(c.id)?.starred ? 'star-filled' : 'star'"
                :size="14"
                :style="{ color: progress.byId(c.id)?.starred ? '#F59E0B' : 'var(--color-text-3)' }"
              />
            </button>
            <button class="btn tap dt-lib__star" aria-label="Detail" title="Xem chi tiết" @click.stop="openDetail(c)">
              <Icon name="more" :size="14" :style="{ color: 'var(--color-text-3)' }" />
            </button>
          </div>
        </div>
        <div class="dt-lib__card-body">
          <div class="dt-lib__card-en">{{ c.text }}</div>
          <div v-if="c.phonetic" class="dt-lib__card-ipa">
            /{{ c.phonetic.replace(/^\/|\/$/g, '') }}/
          </div>
          <div class="dt-lib__card-vi">{{ c.meaning }}</div>
        </div>
        <div class="dt-lib__card-foot">
          <LevelPill :level="c.level" />
          <StatusDot :status="progress.byId(c.id)?.status ?? 'new'" />
          <span class="dt-lib__card-listens">
            <Icon name="headphones" :size="11" :style="{ color: 'var(--color-text-3)' }" />
            <span class="mono">{{ progress.byId(c.id)?.listenCount ?? 0 }}</span>
          </span>
          <button
            class="btn tap dt-lib__card-play"
            :style="{
              background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`,
              color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
            }"
            @click.stop="play(c)"
            aria-label="Play"
          >
            <Icon name="play" :size="12" :style="{ marginLeft: '1px' }" />
          </button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="dt-lib__empty">
        Không có chunk khớp bộ lọc — <button class="dt-lib__reset" @click="resetFilters">reset filters</button>.
      </div>
    </div>

    <!-- List view -->
    <div v-else class="dt-lib__list">
      <div class="dt-lib__list-head">
        <span /><span>Chunk</span><span>Topic</span><span>Level</span><span>Status</span><span>Heard</span><span />
      </div>
      <div
        v-for="c in filtered"
        :key="c.id"
        class="tap dt-lib__row"
        :class="{ 'is-active': selectedId === c.id }"
        @click="select(c)"
        @dblclick="openDetail(c)"
      >
        <button
          class="btn tap dt-lib__row-play"
          :style="{
            background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 20%, transparent)`,
            color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
          }"
          @click.stop="play(c)"
        >
          <Icon name="play" :size="12" :style="{ marginLeft: '1px' }" />
        </button>
        <div class="dt-lib__row-text">
          <div class="dt-lib__row-en">{{ c.text }}</div>
          <div v-if="c.phonetic" class="dt-lib__row-ipa">
            /{{ c.phonetic.replace(/^\/|\/$/g, '') }}/
          </div>
          <div class="dt-lib__row-vi">{{ c.meaning }}</div>
        </div>
        <TopicChip :topic-id="c.topic" size="sm" />
        <LevelPill :level="c.level" />
        <StatusDot :status="progress.byId(c.id)?.status ?? 'new'" with-label />
        <span class="dt-lib__row-listens">
          <Icon name="headphones" :size="11" :style="{ color: 'var(--color-text-3)' }" />
          <span class="mono">{{ progress.byId(c.id)?.listenCount ?? 0 }}</span>
        </span>
        <div class="dt-lib__row-menu-wrap">
          <button class="btn tap dt-lib__row-more" @click="toggleMenu(c.id, $event)" aria-label="Menu">
            <Icon name="more" :size="13" :style="{ color: 'var(--color-text-3)' }" />
          </button>
          <div v-if="menuOpenId === c.id" class="dt-lib__row-menu glass-strong" @click.stop>
            <button class="btn tap dt-lib__menu-item" @click="openDetail(c)">
              <Icon name="eye" :size="13" /> Xem chi tiết
            </button>
            <button class="btn tap dt-lib__menu-item" @click="play(c)">
              <Icon name="play" :size="13" /> Phát ngay
            </button>
            <button class="btn tap dt-lib__menu-item" @click="progress.toggleStarred(c.id)">
              <Icon :name="progress.byId(c.id)?.starred ? 'star-filled' : 'star'" :size="13" />
              {{ progress.byId(c.id)?.starred ? 'Bỏ sao' : 'Đánh sao' }}
            </button>
            <button class="btn tap dt-lib__menu-item" @click="editChunk(c)">
              <Icon name="edit" :size="13" /> Chỉnh sửa
            </button>
            <button class="btn tap dt-lib__menu-item is-danger" @click="deleteChunk(c)">
              <Icon name="trash" :size="13" /> Xoá
            </button>
          </div>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="dt-lib__empty">
        Không có chunk khớp bộ lọc — <button class="dt-lib__reset" @click="resetFilters">reset filters</button>.
      </div>
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
            :style="{ flex: 1, padding: '14px 0', fontSize: '14px', fontWeight: 700, borderRadius: '14px' }"
            @click="resetFilters"
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
          >Apply</button>
        </div>
      </div>
    </AppSheet>

    <ChunkFormSheet :open="formOpen" :initial="editingChunk" @close="formOpen = false" />
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-lib { padding: 24px 28px 28px; }

.dt-lib__head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; gap: 16px; }
.dt-lib__title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
.dt-lib__title-sub { color: var(--color-text-3); font-weight: 500; }
.dt-lib__sub { font-size: 13px; color: var(--color-text-3); margin-top: 2px; }

.dt-lib__actions { display: flex; gap: 8px; align-items: center; }
.dt-lib__view {
  display: flex; padding: 3px;
  background: var(--color-surface-1);
  border-radius: 10px; border: 1px solid var(--color-border-1);
}
.dt-lib__view-btn {
  width: 30px; height: 28px; border-radius: 7px;
  display: grid; place-items: center;
  background: transparent;
}
.dt-lib__view-btn.is-active { background: var(--color-surface-3); }

.dt-lib__btn-secondary {
  padding: 0 14px; height: 34px; font-size: 12px; font-weight: 700;
  color: var(--color-text-2);
  display: inline-flex; align-items: center; gap: 6px; border-radius: 10px;
}
.dt-lib__btn-secondary.has-badge { color: var(--color-cyan); border-color: color-mix(in oklch, var(--color-cyan) 40%, var(--color-border-1)); }
.dt-lib__btn-badge {
  background: var(--color-cyan); color: #0b0f22;
  padding: 1px 6px; border-radius: 99px; font-size: 10px;
}
.dt-lib__add {
  position: relative; overflow: hidden;
  padding: 0 14px; height: 34px; font-size: 12px; font-weight: 700; border-radius: 10px;
  background: var(--grad-primary); color: #fff;
  display: inline-flex; align-items: center; gap: 6px;
  box-shadow: 0 8px 22px rgba(34,211,238,0.4), 0 1px 0 rgba(255,255,255,0.3) inset;
  text-shadow: 0 1px 1.5px rgba(0,0,0,0.18);
}
.dt-lib__add-shine {
  position: absolute; inset: 1px; border-radius: 9px; pointer-events: none;
  background: radial-gradient(80% 100% at 30% 0%, rgba(255,255,255,0.3), transparent 65%);
}

.dt-lib__tabs {
  display: flex; gap: 6px; margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border-1);
}
.dt-lib__tab {
  padding: 10px 14px; font-size: 13px; font-weight: 600;
  color: var(--color-text-3);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  display: flex; align-items: center; gap: 6px;
}
.dt-lib__tab.is-active { color: var(--color-text-1); border-bottom-color: var(--color-cyan); }
.dt-lib__tab-cnt { font-size: 11px; opacity: 0.7; }

.dt-lib__topics {
  display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;
}
.dt-lib__chip {
  padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
  background: var(--color-surface-2); color: var(--color-text-2);
  border: 1px solid var(--color-border-1);
  display: inline-flex; align-items: center; gap: 5px;
}
.dt-lib__chip.is-active-all { background: var(--grad-primary); color: #0b0f22; }

.dt-lib__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.dt-lib__card {
  padding: 14px; border-radius: 14px; cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  display: flex; flex-direction: column; gap: 10px;
  min-height: 200px;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.dt-lib__card-top { display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
.dt-lib__card-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; justify-content: center;
}
.dt-lib__card-tools { display: flex; gap: 4px; }
.dt-lib__star {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center;
}
.dt-lib__star:hover { background: var(--color-surface-3); }
.dt-lib__card-en {
  font-size: 14px; font-weight: 600; line-height: 1.35; letter-spacing: -0.005em;
}
.dt-lib__card-ipa {
  font-size: 12px; color: var(--color-text-3); margin-top: 3px;
  font-style: italic; letter-spacing: 0.01em; line-height: 1.3;
}
.dt-lib__card-vi { font-size: 12px; color: var(--color-text-3); margin-top: 4px; line-height: 1.4; }
.dt-lib__card-foot { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-top: auto; }
.dt-lib__card-listens {
  font-size: 11px; color: var(--color-text-3);
  display: inline-flex; align-items: center; gap: 4px; margin-left: auto;
}
.dt-lib__card-play {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center;
}

.dt-lib__list {
  display: flex; flex-direction: column;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 14px; overflow: hidden;
}
.dt-lib__list-head {
  display: grid;
  grid-template-columns: 40px 1fr 140px 80px 110px 80px 40px;
  padding: 8px 14px;
  font-size: 10px; font-weight: 700; color: var(--color-text-3);
  letter-spacing: 0.06em; text-transform: uppercase;
  border-bottom: 1px solid var(--color-border-1);
  gap: 12px;
}
.dt-lib__row {
  display: grid;
  grid-template-columns: 40px 1fr 140px 80px 110px 80px 40px;
  padding: 10px 14px; align-items: center; cursor: pointer;
  border-bottom: 1px solid var(--color-border-1);
  gap: 12px;
  position: relative;
}
.dt-lib__row:hover { background: var(--color-surface-1); }
.dt-lib__row.is-active { background: var(--color-surface-3); }
.dt-lib__row:last-child { border-bottom: 0; }
.dt-lib__row-play {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center;
}
.dt-lib__row-text { min-width: 0; }
.dt-lib__row-en {
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-lib__row-ipa {
  font-size: 11px; color: var(--color-text-3); margin-top: 2px;
  font-style: italic; letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-lib__row-vi {
  font-size: 11px; color: var(--color-text-3); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-lib__row-listens {
  font-size: 12px; color: var(--color-text-2);
  display: inline-flex; align-items: center; gap: 4px;
}
.dt-lib__row-menu-wrap { position: relative; }
.dt-lib__row-more {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center;
}
.dt-lib__row-more:hover { background: var(--color-surface-2); }
.dt-lib__row-menu {
  position: absolute;
  top: 32px; right: 0;
  min-width: 180px;
  padding: 6px;
  border-radius: 10px;
  display: flex; flex-direction: column;
  z-index: 20;
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
}
.dt-lib__menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 600; color: var(--color-text-2);
  text-align: left;
}
.dt-lib__menu-item:hover { background: var(--color-surface-2); }
.dt-lib__menu-item.is-danger { color: var(--color-rose); }

.dt-lib__empty {
  grid-column: 1 / -1;
  padding: 36px; text-align: center; font-size: 13px; color: var(--color-text-3);
  border: 1px dashed var(--color-border-1); border-radius: 14px;
}
.dt-lib__reset {
  color: var(--color-cyan); font-weight: 700; text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
