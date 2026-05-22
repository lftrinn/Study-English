<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import WaveBars from '@/components/common/WaveBars.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useUiStore } from '@/stores/uiStore';
import { playlistService } from '@/services/playlistService';
import type { Chunk } from '@/types/chunk';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const ui = useUiStore();

const VI_DAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VI_MONTH = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const today = new Date();
const dateLabel = `${VI_DAY[today.getDay()]} · ${today.getDate()} ${VI_MONTH[today.getMonth()]}`;

const greeting = computed(() => {
  const h = today.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
});

const minutesListened = computed(() =>
  Math.max(1, Math.round(progress.recentLogs.length * 0.45)),
);
const goalRemaining = computed(() =>
  Math.max(0, settings.dailyGoal - progress.todayListenCount),
);

const continueChunk = computed<Chunk | undefined>(() => {
  if (player.current) return player.current;
  const recent = progress.recentLogs[0];
  if (recent) return chunks.byId(recent.chunkId);
  return chunks.chunks[0];
});
const continueTopic = computed(() =>
  continueChunk.value ? chunks.topicById(continueChunk.value.topic) : undefined,
);

const dueChunks = computed<Chunk[]>(() => {
  const due = progress.dueReviewChunkIds.map((id) => chunks.byId(id)).filter((c): c is Chunk => Boolean(c));
  if (due.length > 0) return due.slice(0, 5);
  return chunks.chunks
    .filter((c) => {
      const p = progress.byId(c.id);
      return p && (p.status === 'learning' || (p.status === 'familiar' && p.listenCount < 10));
    })
    .slice(0, 5);
});

const topicCards = computed(() =>
  chunks.topicWithCounts
    .filter((t) => (t.count ?? 0) > 0)
    .slice(0, 6)
    .map((t) => {
      const total = t.count ?? 0;
      const mastered = Array.from(progress.progressMap.values()).filter(
        (p) => p.status === 'mastered' && chunks.byId(p.chunkId)?.topic === t.id,
      ).length;
      const pct = total > 0 ? (mastered / total) * 100 : 0;
      return { ...t, total, mastered, pct };
    }),
);

const quickActions = computed(() => [
  { id: 'passive', label: 'Passive Listening', sub: 'Nghe rảnh tay', icon: 'headphones', color: '#22D3EE' },
  { id: 'flashcard', label: 'Ôn chunk yếu', sub: `${progress.weakChunkIds.length} cần ôn`, icon: 'refresh', color: '#A78BFA' },
  { id: 'learn', label: 'Luyện phỏng vấn', sub: 'Câu hỏi hỗn hợp', icon: 'brain', color: '#F59E0B' },
  { id: 'test', label: 'TOEIC Mini Test', sub: '10 câu hỏi', icon: 'target', color: '#34D399' },
]);

function continueLearning() {
  if (player.current) {
    if (!player.isPlaying || player.isPaused) void player.play();
    router.push('/player');
    return;
  }
  if (!continueChunk.value) {
    if (chunks.chunks.length === 0) {
      router.push('/library');
      return;
    }
    // Seed with first chunk so user always has something to play.
    player.setQueue(chunks.chunks.slice(0, 20), { mode: 'normal' });
    void player.play();
    router.push('/player');
    return;
  }
  player.setQueue([continueChunk.value], { mode: 'normal' });
  void player.play();
  router.push('/player');
}

function runAction(id: string) {
  if (chunks.chunks.length === 0) {
    router.push('/library');
    return;
  }
  if (id === 'passive') {
    const list = playlistService.buildLowListen(chunks.chunks, progress.progressMap, { threshold: 5, limit: 30 });
    const queue = list.length > 0 ? list : chunks.chunks.slice(0, 20);
    player.setShuffle(true);
    player.setQueue(queue, { mode: 'passive' });
    void player.play();
    router.push('/study/passive');
  } else if (id === 'flashcard') {
    const list = playlistService.buildMistakes(chunks.chunks, progress.progressMap, { limit: 20 });
    const queue = list.length > 0 ? list : chunks.chunks.slice(0, 20);
    practice.start({ mode: 'flashcard', chunks: queue });
    router.push('/study/flashcard');
  } else if (id === 'learn') {
    const queue = chunks.chunks.slice(0, 20);
    player.setQueue(queue, { mode: 'normal' });
    void player.play();
    router.push('/study/learn');
  } else if (id === 'test') {
    const queue = chunks.chunks.slice(0, 20);
    practice.start({ mode: 'test', chunks: queue });
    router.push('/study/test');
  }
}

function statusToLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function openDetail(c: Chunk) { ui.openChunkDetail(c.id); }
function playChunk(c: Chunk) {
  player.setQueue([c], { mode: 'normal' });
  void player.play();
  router.push('/player');
}
function gotoTopic(id: string) { chunks.setTopic(id); router.push('/library'); }
</script>

<template>
  <div class="scrollarea dt-home">
    <!-- Header row -->
    <div class="dt-home__head">
      <div>
        <div class="dt-home__eyebrow">{{ dateLabel }}</div>
        <h1 class="dt-home__title">
          {{ greeting }}, <span class="grad-text">{{ settings.displayName || 'Bạn' }}</span>
        </h1>
        <div class="dt-home__sub">
          Mục tiêu hôm nay <b>{{ settings.dailyGoal }} chunks</b> — còn
          <b>{{ goalRemaining }}</b>.
        </div>
      </div>
      <button class="btn tap dt-home__resume" @click="continueLearning">
        <span class="dt-home__resume-shine" aria-hidden="true" />
        <Icon name="play" :size="14" :style="{ color: '#fff', position: 'relative' }" />
        <span class="dt-home__resume-text">Tiếp tục nghe</span>
      </button>
    </div>

    <!-- Stat strip -->
    <div class="dt-home__stats">
      <div class="glass dt-home__stat" :style="{ '--c': '#22D3EE' } as any">
        <div class="dt-home__stat-halo" :style="{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 65%)' }" />
        <div class="dt-home__stat-row">
          <Icon name="target" :size="13" :style="{ color: '#22D3EE' }" />
          <span class="dt-home__stat-lbl">Today</span>
        </div>
        <div class="dt-home__stat-val">
          <span class="mono">{{ progress.todayListenCount }}</span>
          <span class="dt-home__stat-suf">/{{ settings.dailyGoal }}</span>
        </div>
        <ProgressBar :value="progress.todayListenCount" :max="settings.dailyGoal" :height="3" color="#22D3EE" />
      </div>
      <div class="glass dt-home__stat">
        <div class="dt-home__stat-halo" :style="{ background: 'radial-gradient(circle, rgba(251,113,133,0.22), transparent 65%)' }" />
        <div class="dt-home__stat-row">
          <Icon name="flame" :size="13" :style="{ color: '#FB7185' }" />
          <span class="dt-home__stat-lbl">Streak</span>
        </div>
        <div class="dt-home__stat-val">
          <span class="mono">{{ progress.streakDays }}</span>
          <span class="dt-home__stat-suf">d</span>
        </div>
        <div class="dt-home__stat-hint">Best <span class="mono">{{ progress.bestStreak }}</span> · keep going</div>
      </div>
      <div class="glass dt-home__stat">
        <div class="dt-home__stat-halo" :style="{ background: 'radial-gradient(circle, rgba(167,139,250,0.22), transparent 65%)' }" />
        <div class="dt-home__stat-row">
          <Icon name="headphones" :size="13" :style="{ color: '#A78BFA' }" />
          <span class="dt-home__stat-lbl">Total</span>
        </div>
        <div class="dt-home__stat-val">
          <span class="mono">{{ progress.totalListened.toLocaleString() }}</span>
        </div>
        <div class="dt-home__stat-hint">chunks heard</div>
      </div>
      <div class="glass dt-home__stat">
        <div class="dt-home__stat-halo" :style="{ background: 'radial-gradient(circle, rgba(52,211,153,0.22), transparent 65%)' }" />
        <div class="dt-home__stat-row">
          <Icon name="clock" :size="13" :style="{ color: '#34D399' }" />
          <span class="dt-home__stat-lbl">Minutes</span>
        </div>
        <div class="dt-home__stat-val">
          <span class="mono">{{ minutesListened }}</span>
        </div>
        <div class="dt-home__stat-hint">listened lately</div>
      </div>
    </div>

    <!-- Continue card -->
    <div v-if="continueChunk" class="tap dt-home__cont" @click="continueLearning">
      <div class="dt-home__cont-play">
        <span class="dt-home__cont-play-shine" aria-hidden="true" />
        <Icon name="play" :size="32" :style="{ color: '#fff', marginLeft: '3px' }" />
      </div>
      <div class="dt-home__cont-mid">
        <div class="dt-home__cont-eye">Tiếp tục · {{ continueTopic?.name ?? '' }}</div>
        <div class="dt-home__cont-en">{{ continueChunk.text }}</div>
        <div class="dt-home__cont-meta">
          <WaveBars :size="14" :playing="false" color="var(--color-text-3)" />
          <span>{{ progress.todayListenCount }} / {{ settings.dailyGoal }} chunks · {{ player.speed.toFixed(2) }}×</span>
        </div>
      </div>
      <div class="dt-home__cont-bar">
        <ProgressBar :value="progress.todayListenCount" :max="settings.dailyGoal" :height="4" color="var(--color-cyan)" />
        <div class="mono dt-home__cont-pct">
          {{ Math.round((progress.todayListenCount / Math.max(1, settings.dailyGoal)) * 100) }}% of goal
        </div>
      </div>
    </div>

    <!-- Quick start -->
    <div class="dt-home__sec">
      <div class="dt-home__sec-head">
        <div>
          <h2 class="dt-home__sec-title">Bắt đầu nhanh</h2>
          <div class="dt-home__sec-sub">Lab 5 phút</div>
        </div>
      </div>
      <div class="dt-home__qa">
        <button
          v-for="a in quickActions"
          :key="a.id"
          class="btn tap glass dt-home__qa-tile"
          @click="runAction(a.id)"
        >
          <IconBlock :icon="a.icon" :color="a.color" :size="44" />
          <div>
            <div class="dt-home__qa-label">{{ a.label }}</div>
            <div class="dt-home__qa-sub">{{ a.sub }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Two-column: topics + due -->
    <div class="dt-home__cols">
      <div>
        <div class="dt-home__sec-head">
          <div>
            <h2 class="dt-home__sec-title">Chủ đề</h2>
            <div class="dt-home__sec-sub">Các track đang học</div>
          </div>
          <button class="btn tap dt-home__see" @click="router.push('/library')">Xem tất cả</button>
        </div>
        <div class="dt-home__topics">
          <div
            v-for="t in topicCards"
            :key="t.id"
            class="glass tap dt-home__topic"
            @click="gotoTopic(t.id)"
          >
            <div class="dt-home__topic-head">
              <div
                class="dt-home__topic-ic"
                :style="{
                  background: `color-mix(in oklch, ${t.color} 22%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${t.color} 30%, transparent)`,
                  color: t.color,
                }"
              >
                <TopicIcon :name="t.id" :size="18" />
              </div>
              <div class="dt-home__topic-ring">
                <ProgressRing :value="t.pct / 100" :size="36" :stroke="4" :color="t.color" :show-label="false" />
                <span class="dt-home__topic-pct" :style="{ color: t.color }">{{ Math.round(t.pct) }}%</span>
              </div>
            </div>
            <div>
              <div class="dt-home__topic-name">{{ t.name }}</div>
              <div class="dt-home__topic-cnt">
                <span class="mono">{{ t.mastered }}</span> / <span class="mono">{{ t.total }}</span> mastered
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="dt-home__sec-head">
          <div>
            <h2 class="dt-home__sec-title">Đến hạn ôn</h2>
            <div class="dt-home__sec-sub">{{ dueChunks.length }} chunks sẵn sàng</div>
          </div>
        </div>
        <div class="dt-home__due">
          <div
            v-for="c in dueChunks"
            :key="c.id"
            class="glass tap dt-home__due-row"
            @click="openDetail(c)"
          >
            <button
              class="btn tap dt-home__due-play"
              :style="{
                background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 18%, transparent)`,
                color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
              }"
              @click.stop="playChunk(c)"
            >
              <Icon name="play" :size="12" :style="{ marginLeft: '1px' }" />
            </button>
            <div class="dt-home__due-mid">
              <div class="dt-home__due-en">{{ c.text }}</div>
              <div class="dt-home__due-meta">
                <StatusDot :status="progress.byId(c.id)?.status ?? 'new'" />
                <span>{{ statusToLabel(progress.byId(c.id)?.status ?? 'new') }}</span>
              </div>
            </div>
            <LevelPill :level="c.level" />
          </div>
          <div v-if="dueChunks.length === 0" class="dt-home__empty">
            Chưa có chunk nào đến hạn — chọn một topic để học mới.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-home { padding: 28px; }

.dt-home__head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; gap: 16px; }
.dt-home__eyebrow {
  font-size: 12px; color: var(--color-text-3); font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.dt-home__title { margin: 4px 0 0; font-size: 36px; font-weight: 700; letter-spacing: -0.025em; }
.dt-home__sub { font-size: 14px; color: var(--color-text-2); margin-top: 4px; }
.dt-home__sub b { color: var(--color-text-1); }

.dt-home__resume {
  position: relative; overflow: hidden;
  padding: 12px 20px; border-radius: 12px;
  background: var(--grad-primary);
  color: #fff; font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 10px 28px rgba(34,211,238,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset;
  text-shadow: 0 1px 1.5px rgba(0,0,0,0.18);
}
.dt-home__resume-shine {
  position: absolute; inset: 1px; border-radius: 11px; pointer-events: none;
  background: radial-gradient(70% 100% at 30% 0%, rgba(255,255,255,0.35), transparent 65%);
}
.dt-home__resume-text { position: relative; }

.dt-home__stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;
}
.dt-home__stat { padding: 16px; position: relative; overflow: hidden; }
.dt-home__stat-halo {
  position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%;
  pointer-events: none;
}
.dt-home__stat-row { display: flex; align-items: center; gap: 6px; }
.dt-home__stat-lbl {
  font-size: 11px; font-weight: 700; color: var(--color-text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.dt-home__stat-val { display: flex; align-items: baseline; gap: 4px; margin-top: 6px; }
.dt-home__stat-val .mono { font-size: 28px; font-weight: 700; }
.dt-home__stat-suf { font-size: 13px; color: var(--color-text-3); }
.dt-home__stat-hint { font-size: 11px; color: var(--color-text-3); margin-top: 6px; }

.dt-home__cont {
  padding: 22px; border-radius: 22px; margin-bottom: 26px; cursor: pointer;
  background: linear-gradient(135deg, rgba(34,211,238,0.16), rgba(167,139,250,0.16));
  border: 1px solid rgba(34,211,238,0.3);
  display: flex; align-items: center; gap: 18px;
}
.dt-home__cont-play {
  width: 76px; height: 76px; border-radius: 22px; background: var(--grad-primary);
  display: grid; place-items: center; flex-shrink: 0; position: relative; overflow: hidden;
  box-shadow: 0 14px 36px rgba(34,211,238,0.45), 0 1px 0 rgba(255,255,255,0.4) inset, 0 -1px 0 rgba(0,0,0,0.18) inset;
}
.dt-home__cont-play-shine {
  position: absolute; inset: 1px; border-radius: 21px; pointer-events: none;
  background: radial-gradient(60% 55% at 28% 20%, rgba(255,255,255,0.4), transparent 70%);
}
.dt-home__cont-mid { flex: 1; min-width: 0; }
.dt-home__cont-eye {
  font-size: 11px; font-weight: 700; color: var(--color-cyan);
  letter-spacing: 0.05em; text-transform: uppercase;
}
.dt-home__cont-en { font-size: 20px; font-weight: 700; margin-top: 4px; letter-spacing: -0.01em; }
.dt-home__cont-meta {
  font-size: 12px; color: var(--color-text-3); margin-top: 6px;
  display: flex; align-items: center; gap: 10px;
}
.dt-home__cont-bar { width: 200px; }
.dt-home__cont-pct { font-size: 11px; color: var(--color-text-3); margin-top: 6px; text-align: right; }

.dt-home__sec { margin-bottom: 26px; }
.dt-home__sec-head {
  display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 12px;
}
.dt-home__sec-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.dt-home__sec-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }
.dt-home__see { font-size: 12px; color: var(--color-cyan); font-weight: 700; }

.dt-home__qa { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.dt-home__qa-tile {
  padding: 16px; border-radius: 18px; text-align: left; min-height: 124px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.dt-home__qa-label { font-size: 14px; font-weight: 700; }
.dt-home__qa-sub { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }

.dt-home__cols { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
.dt-home__topics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dt-home__topic {
  padding: 14px; display: flex; flex-direction: column; gap: 10px; cursor: pointer;
}
.dt-home__topic-head { display: flex; align-items: center; justify-content: space-between; }
.dt-home__topic-ic {
  width: 36px; height: 36px; border-radius: 12px;
  display: grid; place-items: center;
}
.dt-home__topic-ring { position: relative; width: 36px; height: 36px; }
.dt-home__topic-pct {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 9px; font-weight: 700;
}
.dt-home__topic-name { font-size: 13px; font-weight: 700; }
.dt-home__topic-cnt { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }

.dt-home__due { display: flex; flex-direction: column; gap: 8px; }
.dt-home__due-row {
  padding: 10px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer;
}
.dt-home__due-play {
  width: 32px; height: 32px; border-radius: 10px;
  display: grid; place-items: center; flex-shrink: 0;
}
.dt-home__due-mid { flex: 1; min-width: 0; }
.dt-home__due-en {
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-home__due-meta {
  font-size: 11px; color: var(--color-text-3); margin-top: 1px;
  display: flex; align-items: center; gap: 5px;
}
.dt-home__empty {
  padding: 16px; text-align: center; font-size: 12px; color: var(--color-text-3);
  border: 1px dashed var(--color-border-1); border-radius: 12px;
}
</style>
