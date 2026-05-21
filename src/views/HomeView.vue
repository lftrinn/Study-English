<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useUiStore } from '@/stores/uiStore';
import { playlistService } from '@/services/playlistService';
import type { Chunk } from '@/types/chunk';

import AppCard from '@/components/common/AppCard.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import ChunkRow from '@/components/chunk/ChunkRow.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import Icon from '@/components/common/Icon.vue';
import EmptyState from '@/components/common/EmptyState.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const ui = useUiStore();

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
});

const goalProgress = computed(() => {
  const today = progress.todayListenCount;
  const goal = Math.max(1, settings.dailyGoal);
  return Math.min(1, today / goal);
});

const continueChunk = computed<Chunk | undefined>(() => {
  const recent = progress.recentLogs[0];
  if (recent) return chunks.byId(recent.chunkId);
  return chunks.chunks[0];
});

const dueReviewChunks = computed<Chunk[]>(() =>
  progress.dueReviewChunkIds
    .map((id) => chunks.byId(id))
    .filter((c): c is Chunk => Boolean(c))
    .slice(0, 4),
);

const topTopics = computed(() =>
  chunks.topicWithCounts
    .filter((t) => (t.count ?? 0) > 0)
    .slice(0, 6)
    .map((t) => ({
      ...t,
      listened: progress.topicListenCount(t.id),
      total: t.count ?? 0,
    })),
);

function gotoPlayer(queue: Chunk[], mode: 'normal' | 'shuffle' | 'topic' | 'review' | 'passive' = 'normal') {
  if (queue.length === 0) {
    router.push('/library');
    return;
  }
  player.setQueue(queue, { mode });
  void player.play();
  router.push('/player');
}

function continueLearning() {
  if (!continueChunk.value) return;
  gotoPlayer([continueChunk.value], 'normal');
}

function startPassive() {
  const list = playlistService.buildLowListen(chunks.chunks, progress.progressMap, {
    threshold: 5,
    limit: 30,
  });
  const queue = list.length > 0 ? list : chunks.chunks.slice(0, 20);
  player.setShuffle(true);
  gotoPlayer(queue, 'passive');
}

function reviewWeak() {
  router.push({ path: '/study/learn', query: { source: 'mistakes' } });
}

function reviewDue() {
  router.push({ path: '/study/learn', query: { source: 'review' } });
}

function interviewPractice() {
  const list = playlistService.build(chunks.chunks, progress.progressMap, {
    source: 'interview',
    limit: 20,
  });
  gotoPlayer(list, 'topic');
}

function toeicMini() {
  const list = playlistService.build(chunks.chunks, progress.progressMap, {
    source: 'toeic',
    limit: 15,
  });
  gotoPlayer(list, 'topic');
}

function startFlashcards() {
  const list = playlistService.buildStarred(chunks.chunks, progress.progressMap);
  const queue = list.length > 0 ? list : chunks.chunks.slice(0, 20);
  practice.start({ mode: 'flashcard', chunks: queue });
  router.push('/study/flashcard');
}

function startLearn() {
  router.push('/study/learn');
}

function startWrite() {
  const list = playlistService.buildStarred(chunks.chunks, progress.progressMap);
  const queue = list.length > 0 ? list : chunks.chunks.slice(0, 12);
  practice.start({ mode: 'write', chunks: queue });
  router.push('/study/write');
}

function startDictation() {
  const list = playlistService.buildStarred(chunks.chunks, progress.progressMap);
  const queue = list.length > 0 ? list : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'dictation', chunks: queue });
  router.push('/study/dictation');
}

function startTest() {
  router.push('/study/test');
}

function startMatch() {
  router.push('/study/match');
}

function startSpeaking() {
  const list = playlistService.buildStarred(chunks.chunks, progress.progressMap);
  const queue = list.length > 0 ? list : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'speaking', chunks: queue });
  router.push('/study/speaking');
}

const studyModes = [
  { key: 'flashcard', icon: 'flashcard', label: 'Flashcard', run: startFlashcards, color: 'var(--color-emerald)' },
  { key: 'learn', icon: 'sparkles', label: 'Learn', run: startLearn, color: 'var(--color-violet)' },
  { key: 'write', icon: 'pencil', label: 'Write', run: startWrite, color: 'var(--color-amber)' },
  { key: 'dictation', icon: 'ear', label: 'Dictation', run: startDictation, color: 'var(--color-cyan)' },
  { key: 'test', icon: 'trophy', label: 'Test', run: startTest, color: 'var(--color-rose)' },
  { key: 'match', icon: 'puzzle', label: 'Match', run: startMatch, color: 'var(--color-blue)' },
  { key: 'speaking', icon: 'mic', label: 'Speaking', run: startSpeaking, color: 'var(--color-orange)' },
] as const;

function gotoTopic(topicId: string) {
  chunks.setTopic(topicId);
  router.push('/library');
}

function openDetail(chunk: Chunk) {
  ui.openChunkDetail(chunk.id);
}
function playChunk(chunk: Chunk) {
  gotoPlayer([chunk], 'normal');
}
function toggleStar(chunk: Chunk) {
  void progress.toggleStarred(chunk.id);
}

const quickActions = [
  { key: 'passive', icon: 'ear', label: 'Passive', hint: 'Nghe khi rảnh', run: startPassive, color: 'var(--color-cyan)' },
  { key: 'review', icon: 'flame', label: 'Review yếu', hint: 'Ôn chunk hay sai', run: reviewWeak, color: 'var(--color-rose)' },
  { key: 'interview', icon: 'sparkles', label: 'Interview', hint: 'Luyện phỏng vấn', run: interviewPractice, color: 'var(--color-violet)' },
  { key: 'toeic', icon: 'trophy', label: 'TOEIC mini', hint: 'Test nhanh', run: toeicMini, color: 'var(--color-amber)' },
] as const;
</script>

<template>
  <section class="home">
    <header class="home__head safe-pt">
      <p class="text-caption text-text-3">{{ greeting }}</p>
      <h1 class="text-title-1">Hôm nay nghe gì? 👋</h1>
    </header>

    <!-- Daily goal + streak + total -->
    <div class="home__top">
      <AppCard variant="glass-strong" padding="md" class="home__goal">
        <ProgressRing :value="goalProgress" :size="72" :stroke="8" :show-label="false" />
        <div class="home__goal-info">
          <p class="text-caption text-text-3">Mục tiêu hôm nay</p>
          <p class="home__goal-count">
            <strong>{{ progress.todayListenCount }}</strong>
            <span>/ {{ settings.dailyGoal }} chunks</span>
          </p>
          <p class="text-small text-text-3">
            Còn {{ Math.max(0, settings.dailyGoal - progress.todayListenCount) }} chunk để đạt mục tiêu
          </p>
        </div>
      </AppCard>
      <div class="home__pair">
        <AppCard padding="md" class="home__mini">
          <Icon name="flame" :size="20" />
          <div>
            <p class="text-caption text-text-3">Streak</p>
            <p class="home__big">{{ progress.streakDays }}<span>ngày</span></p>
          </div>
        </AppCard>
        <AppCard padding="md" class="home__mini">
          <Icon name="ear" :size="20" />
          <div>
            <p class="text-caption text-text-3">Đã nghe</p>
            <p class="home__big">{{ progress.totalListened }}<span>lần</span></p>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Continue learning -->
    <AppCard
      v-if="continueChunk"
      variant="glass-strong"
      padding="lg"
      class="home__continue tap"
      @click="continueLearning"
    >
      <div class="home__continue-head">
        <p class="text-caption text-text-3">Tiếp tục học</p>
        <span class="home__continue-icon"><Icon name="play" :size="14" /></span>
      </div>
      <p class="home__continue-text">{{ continueChunk.text }}</p>
      <p class="home__continue-meaning">{{ continueChunk.meaning }}</p>
    </AppCard>

    <!-- Quick actions -->
    <div>
      <h2 class="home__section-title">Bắt đầu nhanh</h2>
      <div class="home__quick">
        <button
          v-for="a in quickActions"
          :key="a.key"
          class="home__action tap glass"
          :style="{ '--c': a.color }"
          @click="a.run"
        >
          <span class="home__action-icon"><Icon :name="a.icon" :size="20" /></span>
          <p class="home__action-label">{{ a.label }}</p>
          <p class="home__action-hint">{{ a.hint }}</p>
        </button>
      </div>
    </div>

    <!-- Study modes -->
    <div>
      <h2 class="home__section-title">Học cụm</h2>
      <div class="home__modes">
        <button
          v-for="m in studyModes"
          :key="m.key"
          class="home__mode tap glass"
          :style="{ '--c': m.color }"
          @click="m.run"
        >
          <span class="home__mode-icon"><Icon :name="m.icon" :size="18" /></span>
          <span class="home__mode-label">{{ m.label }}</span>
        </button>
      </div>
    </div>

    <!-- Topic progress -->
    <div>
      <h2 class="home__section-title">Chủ đề</h2>
      <div class="home__topics">
        <button
          v-for="t in topTopics"
          :key="t.id"
          class="home__topic tap glass"
          :style="{ '--c': t.color }"
          @click="gotoTopic(t.id)"
        >
          <span class="home__topic-icon"><TopicIcon :name="t.id" :size="20" /></span>
          <span class="home__topic-name">{{ t.name }}</span>
          <span class="home__topic-count">{{ t.listened }} / {{ t.total }}</span>
        </button>
      </div>
    </div>

    <!-- Due for review -->
    <div>
      <header class="home__section-row">
        <h2 class="home__section-title">Đến hạn ôn</h2>
        <button v-if="dueReviewChunks.length > 0" class="home__section-link tap" @click="reviewDue">
          Ôn ngay <Icon name="arrow-right" :size="12" />
        </button>
      </header>
      <div class="home__due">
        <ChunkRow
          v-for="c in dueReviewChunks"
          :key="c.id"
          :chunk="c"
          @open="openDetail"
          @play="playChunk"
          @toggle-star="toggleStar"
        />
        <EmptyState
          v-if="dueReviewChunks.length === 0"
          icon="sparkles"
          title="Chưa có chunk nào đến hạn ôn"
          hint="Cứ nghe đều, app sẽ nhắc khi tới hạn."
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.home {
  padding: 16px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: max(env(safe-area-inset-top), 12px);
}

.home__section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

/* Top row */
.home__top {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.home__goal {
  display: flex;
  align-items: center;
  gap: 16px;
}
.home__goal-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.home__goal-count {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 18px;
  font-weight: 700;
}
.home__goal-count strong {
  font-size: 26px;
  margin-right: 4px;
}
.home__pair {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.home__mini {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-2);
}
.home__big {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.home__big span {
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Continue */
.home__continue {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}
.home__continue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.home__continue-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px -8px rgba(34, 211, 238, 0.5);
}
.home__continue-text {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.home__continue-meaning {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--color-text-2);
}

/* Quick actions */
.home__quick {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.home__action {
  padding: 14px 14px 12px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  color: color-mix(in oklch, var(--c) 90%, white);
  border-color: color-mix(in oklch, var(--c) 28%, transparent);
}

/* Study modes row */
.home__modes {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.home__modes::-webkit-scrollbar {
  display: none;
}
.home__mode {
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border-color: color-mix(in oklch, var(--c) 28%, transparent);
  min-width: 78px;
  flex-shrink: 0;
}
.home__mode-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--c) 18%, transparent);
  color: var(--c);
}
.home__mode-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-1);
}

.home__section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.home__section-row .home__section-title {
  margin: 0;
}
.home__section-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 35%, transparent);
  color: var(--color-cyan);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.home__action-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--c) 18%, transparent);
  color: var(--c);
}
.home__action-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.home__action-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
}

/* Topics */
.home__topics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.home__topic {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  border-color: color-mix(in oklch, var(--c) 28%, transparent);
}
.home__topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--c) 20%, transparent);
  color: var(--c);
}
.home__topic-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-1);
  letter-spacing: 0.02em;
  text-align: center;
}
.home__topic-count {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-3);
}

.home__due {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 480px) {
  .home__top {
    grid-template-columns: 1fr 1fr;
  }
  .home__pair {
    grid-template-columns: 1fr;
  }
}
</style>
