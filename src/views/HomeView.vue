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

import ChunkRow from '@/components/chunk/ChunkRow.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import Icon from '@/components/common/Icon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import AppButton from '@/components/common/AppButton.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const ui = useUiStore();

const VI_DAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VI_MONTH = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const today = new Date();
const dateLabel = `${VI_DAY[today.getDay()]} · ${today.getDate()} ${VI_MONTH[today.getMonth()]}`;

const greetingHi = computed(() => {
  const h = today.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
});

const goalProgress = computed(() => {
  const t = progress.todayListenCount;
  const goal = Math.max(1, settings.dailyGoal);
  return Math.min(1, t / goal);
});

const continueChunk = computed<Chunk | undefined>(() => {
  const recent = progress.recentLogs[0];
  if (recent) return chunks.byId(recent.chunkId);
  return undefined;
});

const continueTopic = computed(() =>
  continueChunk.value ? chunks.topicById(continueChunk.value.topic) : undefined,
);

const dueReviewChunks = computed<Chunk[]>(() =>
  progress.dueReviewChunkIds
    .map((id) => chunks.byId(id))
    .filter((c): c is Chunk => Boolean(c))
    .slice(0, 3),
);

const topTopics = computed(() =>
  chunks.topicWithCounts
    .filter((t) => (t.count ?? 0) > 0)
    .slice(0, 6)
    .map((t) => {
      const total = t.count ?? 1;
      const mastered = Array.from(progress.progressMap.values()).filter(
        (p) => p.status === 'mastered' && chunks.byId(p.chunkId)?.topic === t.id,
      ).length;
      const pct = Math.round((mastered / total) * 100);
      return { ...t, total, mastered, pct };
    }),
);

function gotoPlayer(
  queue: Chunk[],
  mode: 'normal' | 'shuffle' | 'topic' | 'review' | 'passive' = 'normal',
) {
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

function reviewWeakFlashcard() {
  const list = playlistService.buildMistakes(chunks.chunks, progress.progressMap, { limit: 20 });
  const queue = list.length > 0 ? list : playlistService.buildLowListen(chunks.chunks, progress.progressMap, { limit: 20 });
  practice.start({ mode: 'flashcard', chunks: queue });
  router.push('/study/flashcard');
}

function interviewPractice() {
  router.push('/study/learn');
}

function toeicMini() {
  router.push('/study/test');
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
function gotoTopic(id: string) {
  chunks.setTopic(id);
  router.push('/library');
}

const quickActions = [
  {
    id: 'passive',
    label: 'Passive Listening',
    sub: 'Nghe khi rảnh',
    icon: 'headphones',
    grad: 'linear-gradient(135deg,#22D3EE,#3B82F6)',
    run: startPassive,
  },
  {
    id: 'flashcard',
    label: 'Review chunk yếu',
    sub: () => `${progress.weakChunkIds.length} cần ôn`,
    icon: 'refresh',
    grad: 'linear-gradient(135deg,#A78BFA,#EC4899)',
    run: reviewWeakFlashcard,
  },
  {
    id: 'learn',
    label: 'Interview Practice',
    sub: 'Hỗn hợp câu hỏi',
    icon: 'brain',
    grad: 'linear-gradient(135deg,#F59E0B,#FB7185)',
    run: interviewPractice,
  },
  {
    id: 'test',
    label: 'TOEIC Mini Test',
    sub: 'Test cấu hình nhanh',
    icon: 'target',
    grad: 'linear-gradient(135deg,#34D399,#22D3EE)',
    run: toeicMini,
  },
] as const;
</script>

<template>
  <div class="home">
    <!-- Greeting -->
    <header class="home__greet safe-pt">
      <p class="home__date">{{ dateLabel }}</p>
      <h1 class="home__title">
        {{ greetingHi }}, <span class="grad-text">Bạn</span>
      </h1>
      <p class="home__lead">
        Hãy đạt mục tiêu
        <strong>{{ settings.dailyGoal }} chunks</strong>
        hôm nay nhé.
      </p>
    </header>

    <!-- Today stat strip -->
    <div class="home__strip glass-strong">
      <span class="home__strip-glow" aria-hidden="true" />

      <div class="home__strip-cell">
        <p class="home__strip-label">Today</p>
        <div class="home__strip-num-row">
          <span class="home__strip-num mono">{{ progress.todayListenCount }}</span>
          <span class="home__strip-num-sub">/ {{ settings.dailyGoal }}</span>
        </div>
        <div class="home__strip-bar">
          <div class="home__strip-bar-fill" :style="{ width: `${goalProgress * 100}%` }" />
        </div>
      </div>

      <div class="home__strip-cell home__strip-cell--bordered">
        <p class="home__strip-label">Streak</p>
        <div class="home__strip-streak-row">
          <Icon name="flame" :size="20" />
          <span class="home__strip-num mono">{{ progress.streakDays }}</span>
        </div>
        <p class="home__strip-sub">ngày liên tiếp</p>
      </div>

      <div class="home__strip-cell home__strip-cell--bordered">
        <p class="home__strip-label">Total</p>
        <span class="home__strip-num mono">{{ progress.totalListened }}</span>
        <p class="home__strip-sub">chunks đã nghe</p>
      </div>
    </div>

    <!-- Continue learning -->
    <button
      v-if="continueChunk"
      class="home__continue tap"
      :aria-label="`Tiếp tục: ${continueChunk.text}`"
      @click="continueLearning"
    >
      <span class="home__continue-play">
        <Icon name="play" :size="26" />
      </span>
      <span class="home__continue-text">
        <span class="home__continue-eyebrow">
          Tiếp tục · {{ continueTopic?.name ?? 'Listening' }}
        </span>
        <span class="home__continue-title">{{ continueChunk.text }}</span>
        <span class="home__continue-meta">
          <span class="home__continue-waves" aria-hidden="true">
            <span class="home__bar-idle" />
            <span class="home__bar-idle" />
            <span class="home__bar-idle" />
            <span class="home__bar-idle" />
          </span>
          <span>
            <span class="mono">{{ progress.todayListenCount }}</span>
            /
            <span class="mono">{{ settings.dailyGoal }}</span>
            chunks
          </span>
        </span>
      </span>
    </button>

    <!-- Quick actions -->
    <section class="home__section">
      <header class="home__section-head">
        <div>
          <h2 class="home__section-title">Bắt đầu nhanh</h2>
          <p class="home__section-sub">Một lab 5 phút</p>
        </div>
      </header>
      <div class="home__quick">
        <button
          v-for="a in quickActions"
          :key="a.id"
          class="home__quick-card glass tap"
          @click="a.run"
        >
          <span class="home__quick-icon" :style="{ background: a.grad }">
            <Icon :name="a.icon" :size="18" />
          </span>
          <div class="home__quick-text">
            <p class="home__quick-label">{{ a.label }}</p>
            <p class="home__quick-sub">
              {{ typeof a.sub === 'function' ? a.sub() : a.sub }}
            </p>
          </div>
        </button>
      </div>
    </section>

    <!-- Topic progress horizontal scroll -->
    <section class="home__section">
      <header class="home__section-head">
        <div>
          <h2 class="home__section-title">Chủ đề</h2>
          <p class="home__section-sub">Các track đang học</p>
        </div>
        <button class="home__section-link tap" @click="router.push('/library')">
          Xem tất cả
        </button>
      </header>
      <div class="home__topics no-scrollbar">
        <button
          v-for="t in topTopics"
          :key="t.id"
          class="home__topic glass tap"
          @click="gotoTopic(t.id)"
        >
          <div class="home__topic-head">
            <span
              class="home__topic-icon"
              :style="{
                background: `color-mix(in oklch, ${t.color} 20%, transparent)`,
                borderColor: `color-mix(in oklch, ${t.color} 30%, transparent)`,
                color: t.color,
              }"
            >
              <TopicIcon :name="t.id" :size="18" />
            </span>
            <div class="home__topic-ring">
              <ProgressRing
                :value="t.pct / 100"
                :size="36"
                :stroke="4"
                :color="t.color"
                :show-label="false"
              />
              <span class="home__topic-pct" :style="{ color: t.color }">{{ t.pct }}%</span>
            </div>
          </div>
          <p class="home__topic-name">{{ t.name }}</p>
          <p class="home__topic-meta">
            <span class="mono">{{ t.mastered }}</span> /
            <span class="mono">{{ t.total }}</span> mastered
          </p>
        </button>
      </div>
    </section>

    <!-- Due for review -->
    <section class="home__section">
      <header class="home__section-head">
        <div>
          <h2 class="home__section-title">Đến hạn ôn</h2>
          <p class="home__section-sub">
            {{ dueReviewChunks.length }} chunks sẵn sàng ôn
          </p>
        </div>
      </header>

      <div class="home__due">
        <article
          v-for="c in dueReviewChunks"
          :key="c.id"
          class="home__due-row glass tap"
          :style="{
            '--c': chunks.topicById(c.topic)?.color ?? '#22D3EE',
          }"
          @click="openDetail(c)"
        >
          <button
            class="home__due-play tap"
            :aria-label="`Phát: ${c.text}`"
            @click.stop="playChunk(c)"
          >
            <Icon name="play" :size="14" />
          </button>
          <div class="home__due-text">
            <p class="home__due-en">{{ c.text }}</p>
            <p class="home__due-status">
              <span class="dot" :class="`dot-${progress.byId(c.id)?.status ?? 'new'}`" />
              {{ progress.byId(c.id)?.status ?? 'new' }} ·
              <span class="mono">{{ progress.byId(c.id)?.listenCount ?? 0 }}</span> listens
            </p>
          </div>
          <LevelPill :level="c.level" />
        </article>

        <EmptyState
          v-if="dueReviewChunks.length === 0"
          icon="sparkles"
          title="Chưa có chunk đến hạn ôn"
          hint="Cứ nghe đều, app sẽ nhắc khi tới hạn."
          tone="emerald"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding: 56px 0 0;
}

/* Greeting */
.home__greet {
  padding: 8px 20px 4px;
}
.home__date {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
  font-weight: 600;
}
.home__title {
  margin: 2px 0 0;
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.home__lead {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-text-2);
}
.home__lead strong {
  color: var(--color-text-1);
  font-weight: 700;
}

/* Today stat strip */
.home__strip {
  position: relative;
  margin: 18px 20px 0;
  padding: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.home__strip-glow {
  position: absolute;
  top: -40px;
  right: -30px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.18), transparent 70%);
  pointer-events: none;
}
.home__strip-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.home__strip-cell--bordered {
  border-left: 1px solid var(--color-border-1);
  padding-left: 14px;
}
.home__strip-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.home__strip-num-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}
.home__strip-streak-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: #fb923c;
}
.home__strip-num {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-1);
}
.home__strip-num-sub {
  font-size: 12px;
  color: var(--color-text-3);
}
.home__strip-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-3);
}
.home__strip-bar {
  height: 4px;
  background: var(--color-surface-2);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 8px;
}
.home__strip-bar-fill {
  height: 100%;
  background: var(--grad-primary);
  border-radius: 999px;
  transition: width 0.35s ease;
}

/* Continue learning */
.home__continue {
  margin: 20px 20px 0;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(167, 139, 250, 0.16));
  border: 1px solid rgba(34, 211, 238, 0.3);
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  width: calc(100% - 40px);
}
.home__continue-play {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--grad-primary);
  display: grid;
  place-items: center;
  color: #0b0f22;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(34, 211, 238, 0.35);
}
.home__continue-play :deep(svg) {
  margin-left: 2px;
}
.home__continue-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.home__continue-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.home__continue-title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-1);
}
.home__continue-meta {
  font-size: 12px;
  color: var(--color-text-3);
  display: flex;
  align-items: center;
  gap: 8px;
}
.home__continue-waves {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  color: var(--color-cyan);
  height: 12px;
}
.home__bar-idle {
  display: inline-block;
  width: 3px;
  height: 5.4px;
  background: currentColor;
  border-radius: 2px;
  opacity: 0.4;
}

/* Sections */
.home__section {
  margin-top: 26px;
}
.home__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 20px;
  margin-bottom: 12px;
}
.home__section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.home__section-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.home__section-link {
  font-size: 12px;
  color: var(--color-cyan);
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  background: transparent;
}

/* Quick actions */
.home__quick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 20px;
}
.home__quick-card {
  padding: 14px;
  text-align: left;
  border-radius: 18px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
}
.home__quick-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #0b0f22;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.home__quick-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.home__quick-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.home__quick-sub {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
}

/* Topic progress horizontal cards */
.home__topics {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px 20px;
  scroll-snap-type: x mandatory;
}
.home__topics::-webkit-scrollbar {
  display: none;
}
.home__topic {
  min-width: 152px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  scroll-snap-align: start;
  flex-shrink: 0;
}
.home__topic-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.home__topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
}
.home__topic-ring {
  position: relative;
  width: 36px;
  height: 36px;
}
.home__topic-ring :deep(.ring) {
  width: 36px !important;
  height: 36px !important;
}
.home__topic-pct {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-ui);
  font-size: 9px;
  font-weight: 700;
}
.home__topic-name {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--color-text-1);
}
.home__topic-meta {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
}

/* Due review rows */
.home__due {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.home__due-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  text-align: left;
  width: 100%;
}
.home__due-play {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--c) 18%, transparent);
  color: var(--c);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.home__due-play :deep(svg) {
  margin-left: 1px;
}
.home__due-text {
  flex: 1;
  min-width: 0;
}
.home__due-en {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-1);
}
.home__due-status {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: capitalize;
}
</style>
