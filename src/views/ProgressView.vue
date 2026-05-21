<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { storageService } from '@/services/storageService';
import type { Chunk } from '@/types/chunk';

import AppCard from '@/components/common/AppCard.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import ChunkRow from '@/components/chunk/ChunkRow.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const ui = useUiStore();
const player = usePlayerStore();

const weekly = computed(() => progress.weeklyStats);
const weeklyMax = computed(() => Math.max(1, ...weekly.value.map((d) => d.listenCount)));

const dayLabel: Record<number, string> = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

const totalChunks = computed(() => chunks.chunks.length);
const masteredPct = computed(() =>
  totalChunks.value === 0 ? 0 : progress.masteredCount / totalChunks.value,
);

const topChunks = computed<Chunk[]>(() =>
  progress
    .topListenedChunkIds(5)
    .map((id) => chunks.byId(id))
    .filter((c): c is Chunk => Boolean(c)),
);

const neverListened = computed<Chunk[]>(() =>
  chunks.chunks
    .filter((c) => (progress.byId(c.id)?.listenCount ?? 0) === 0)
    .slice(0, 5),
);

const dueReview = computed<Chunk[]>(() =>
  progress.dueReviewChunkIds
    .map((id) => chunks.byId(id))
    .filter((c): c is Chunk => Boolean(c))
    .slice(0, 6),
);

const topicProgress = computed(() =>
  chunks.topicWithCounts
    .map((t) => ({
      ...t,
      listened: progress.topicListenCount(t.id),
    }))
    .filter((t) => (t.count ?? 0) > 0)
    .sort((a, b) => b.listened - a.listened)
    .slice(0, 6),
);

async function exportBackup() {
  try {
    const data = await storageService.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `chunk-listening-lab-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
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
  <section class="prg">
    <header class="prg__head safe-pt">
      <p class="text-caption text-text-3">Tiến độ</p>
      <h1 class="text-title-1">Progress</h1>
    </header>

    <!-- Streak + summary -->
    <div class="prg__top">
      <AppCard variant="glass-strong" padding="md" class="prg__streak">
        <Icon name="flame" :size="24" />
        <div>
          <p class="text-caption text-text-3">Streak</p>
          <p class="prg__big">{{ progress.streakDays }}<span>ngày</span></p>
        </div>
      </AppCard>
      <AppCard variant="glass-strong" padding="md" class="prg__streak">
        <ProgressRing :value="masteredPct" :size="56" :stroke="6" />
        <div>
          <p class="text-caption text-text-3">Đã thuộc</p>
          <p class="prg__big">{{ progress.masteredCount }}<span>/ {{ totalChunks }}</span></p>
        </div>
      </AppCard>
    </div>

    <!-- Stat tiles -->
    <div class="prg__tiles">
      <AppCard padding="md" class="prg__tile">
        <p class="prg__tile-label">Đang học</p>
        <p class="prg__tile-value amber">{{ progress.learningCount }}</p>
      </AppCard>
      <AppCard padding="md" class="prg__tile">
        <p class="prg__tile-label">Yếu</p>
        <p class="prg__tile-value rose">{{ progress.weakChunkIds.length }}</p>
      </AppCard>
      <AppCard padding="md" class="prg__tile">
        <p class="prg__tile-label">Sao</p>
        <p class="prg__tile-value amber">{{ progress.starredCount }}</p>
      </AppCard>
      <AppCard padding="md" class="prg__tile">
        <p class="prg__tile-label">Đã nghe</p>
        <p class="prg__tile-value cyan">{{ progress.totalListened }}</p>
      </AppCard>
    </div>

    <!-- Weekly chart -->
    <AppCard variant="glass-strong" padding="lg" class="prg__chart">
      <header class="prg__section-head">
        <p class="text-caption text-text-3">Tuần này</p>
        <p class="prg__section-meta">Mục tiêu {{ settings.dailyGoal }}/ngày</p>
      </header>
      <div class="prg__chart-bars">
        <div v-for="d in weekly" :key="d.date" class="prg__bar">
          <div class="prg__bar-track">
            <div
              class="prg__bar-fill"
              :style="{ height: `${(d.listenCount / weeklyMax) * 100}%` }"
            />
          </div>
          <span class="prg__bar-count">{{ d.listenCount }}</span>
          <span class="prg__bar-label">{{ dayLabel[new Date(d.date).getDay()] }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Topic listen counts -->
    <div>
      <h2 class="prg__section-title">Theo chủ đề</h2>
      <div class="prg__topics">
        <div
          v-for="t in topicProgress"
          :key="t.id"
          class="prg__topic glass"
          :style="{ '--c': t.color }"
        >
          <span class="prg__topic-icon"><TopicIcon :name="t.id" :size="18" /></span>
          <div class="prg__topic-info">
            <p class="prg__topic-name">{{ t.name }}</p>
            <p class="prg__topic-count">{{ t.listened }} / {{ t.count }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Top listened -->
    <div>
      <h2 class="prg__section-title">Nghe nhiều nhất</h2>
      <div class="prg__list">
        <ChunkRow
          v-for="c in topChunks"
          :key="c.id"
          :chunk="c"
          @open="openDetail"
          @play="playChunk"
          @toggle-star="toggleStar"
        />
        <EmptyState
          v-if="topChunks.length === 0"
          icon="ear"
          title="Chưa có chunk nào được nghe"
          hint="Hãy mở Player và phát một playlist."
        />
      </div>
    </div>

    <!-- Due review -->
    <div>
      <h2 class="prg__section-title">Đến hạn ôn</h2>
      <div class="prg__list">
        <ChunkRow
          v-for="c in dueReview"
          :key="c.id"
          :chunk="c"
          @open="openDetail"
          @play="playChunk"
          @toggle-star="toggleStar"
        />
        <EmptyState
          v-if="dueReview.length === 0"
          icon="clock"
          title="Chưa có chunk nào đến hạn"
          hint="Spaced repetition sẽ nhắc khi tới hạn ôn."
        />
      </div>
    </div>

    <!-- Never listened -->
    <div>
      <h2 class="prg__section-title">Chưa nghe lần nào</h2>
      <div class="prg__list">
        <ChunkRow
          v-for="c in neverListened"
          :key="c.id"
          :chunk="c"
          @open="openDetail"
          @play="playChunk"
          @toggle-star="toggleStar"
        />
        <EmptyState
          v-if="neverListened.length === 0"
          icon="check"
          title="Đã nghe hết các chunk!"
          hint="Tuyệt vời. Hãy tập trung ôn các chunk yếu."
        />
      </div>
    </div>

    <!-- Export -->
    <div class="prg__export">
      <AppButton variant="glass" size="md" @click="exportBackup">
        <Icon name="download" :size="14" />
        Xuất tiến độ (JSON)
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.prg {
  padding: 16px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.prg__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: max(env(safe-area-inset-top), 12px);
}

.prg__section-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.prg__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.prg__section-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-3);
}

.prg__top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.prg__streak {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--color-text-2);
}
.prg__big {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.prg__big span {
  font-size: 12px;
  margin-left: 4px;
  color: var(--color-text-3);
}

.prg__tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.prg__tile {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}
.prg__tile-label {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.prg__tile-value {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-1);
}
.prg__tile-value.amber {
  color: var(--color-amber);
}
.prg__tile-value.rose {
  color: var(--color-rose);
}
.prg__tile-value.cyan {
  color: var(--color-cyan);
}

/* Chart */
.prg__chart-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  align-items: end;
  height: 120px;
}
.prg__bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}
.prg__bar-track {
  flex: 1;
  width: 100%;
  background: var(--color-surface-1);
  border-radius: 10px 10px 6px 6px;
  position: relative;
  overflow: hidden;
}
.prg__bar-fill {
  position: absolute;
  inset: auto 0 0 0;
  background: var(--grad-primary);
  border-radius: 10px 10px 6px 6px;
  transition: height 0.4s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
  min-height: 4px;
}
.prg__bar-count {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-2);
}
.prg__bar-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-text-3);
}

/* Topics */
.prg__topics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.prg__topic {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-color: color-mix(in oklch, var(--c) 24%, transparent);
}
.prg__topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--c) 18%, transparent);
  color: var(--c);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.prg__topic-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.prg__topic-name {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prg__topic-count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-3);
}

.prg__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prg__export {
  display: flex;
  justify-content: center;
}
</style>
