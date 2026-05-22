<script setup lang="ts">
/**
 * Literal port of screens-main.jsx HomeScreen. Inline styles preserved
 * verbatim from the JSX; dynamic numbers wired to live stores.
 */
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

import TopicIcon from '@/components/chunk/TopicIcon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import Icon from '@/components/common/Icon.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import EmptyDue from '@/components/common/EmptyDue.vue';

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

const greetingHi = computed(() => {
  const h = today.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
});

const goalProgressPct = computed(() => {
  const t = progress.todayListenCount;
  const g = Math.max(1, settings.dailyGoal);
  return Math.min(100, (t / g) * 100);
});

const continueChunk = computed<Chunk | undefined>(() => {
  // Prefer the chunk the player is currently sitting on (live queue): this
  // keeps the "Tiếp tục" card in sync with MiniPlayer / PlayerView / Passive
  // Lab. recordListen only fires after a chunk finishes speaking, so falling
  // back to recentLogs[0] would always lag by one chunk while a playlist runs.
  if (player.current) return player.current;
  const recent = progress.recentLogs[0];
  if (recent) return chunks.byId(recent.chunkId);
  return undefined;
});
const continueTopic = computed(() =>
  continueChunk.value ? chunks.topicById(continueChunk.value.topic) : undefined,
);
const continueLabel = computed(() => {
  if (!player.current) return 'Tiếp tục';
  if (player.isPlaying && !player.isPaused) return 'Đang phát';
  if (player.isPaused) return 'Tạm dừng';
  return 'Tiếp tục';
});

const dueChunks = computed<Chunk[]>(() => {
  const all = progress.dueReviewChunkIds.map((id) => chunks.byId(id)).filter((c): c is Chunk => Boolean(c));
  if (all.length > 0) return all.slice(0, 3);
  return chunks.chunks
    .filter((c) => {
      const p = progress.byId(c.id);
      return p && (p.status === 'learning' || (p.status === 'familiar' && p.listenCount < 10));
    })
    .slice(0, 3);
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

function gotoPlayer(queue: Chunk[]) {
  if (queue.length === 0) {
    router.push('/library');
    return;
  }
  player.setQueue(queue, { mode: 'normal' });
  void player.play();
  router.push('/player');
}
function continueLearning() {
  // If the player already has a live queue, jump straight to it — don't
  // overwrite the queue with a single chunk and lose the rest of the playlist.
  if (player.current) {
    if (!player.isPlaying || player.isPaused) void player.play();
    router.push('/player');
    return;
  }
  if (!continueChunk.value) return;
  gotoPlayer([continueChunk.value]);
}
function runAction(id: string) {
  if (id === 'passive') {
    const list = playlistService.buildLowListen(chunks.chunks, progress.progressMap, { threshold: 5, limit: 30 });
    const queue = list.length > 0 ? list : chunks.chunks.slice(0, 20);
    if (queue.length === 0) {
      router.push('/library');
      return;
    }
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
    router.push('/study/learn');
  } else if (id === 'test') {
    router.push('/study/test');
  }
}
function gotoTopic(id: string) {
  chunks.setTopic(id);
  router.push('/library');
}
function openDetail(c: Chunk) {
  ui.openChunkDetail(c.id);
}
function playChunk(c: Chunk) {
  gotoPlayer([c]);
}

const quickActions = computed(() => [
  { id: 'passive', label: 'Passive Listening', sub: 'Nghe khi rảnh', icon: 'headphones', color: '#22D3EE' },
  { id: 'flashcard', label: 'Ôn chunk yếu', sub: `${progress.weakChunkIds.length} cần ôn`, icon: 'refresh', color: '#A78BFA' },
  { id: 'learn', label: 'Luyện phỏng vấn', sub: 'Câu hỏi hỗn hợp', icon: 'brain', color: '#F59E0B' },
  { id: 'test', label: 'TOEIC Mini Test', sub: '10 câu hỏi', icon: 'target', color: '#34D399' },
]);

const playerIsPlayingActive = computed(() => player.isPlaying && !player.isPaused);

function statusToLabel(s: string): string {
  switch (s) {
    case 'new':
      return 'New';
    case 'learning':
      return 'Learning';
    case 'familiar':
      return 'Familiar';
    case 'mastered':
      return 'Mastered';
    default:
      return s;
  }
}
</script>

<template>
  <div class="scrollarea" :style="{ paddingTop: '56px' }">
    <!-- Greeting -->
    <div :style="{ padding: '8px 20px 4px' }">
      <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', fontWeight: 600 }">
        {{ dateLabel }}
      </div>
      <h1 :style="{ margin: '2px 0 0', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }">
        {{ greetingHi }}, <span class="grad-text">Bạn</span>
      </h1>
      <div :style="{ fontSize: '14px', color: 'var(--color-text-2)', marginTop: '4px' }">
        Hôm nay đặt mục tiêu
        <b :style="{ color: 'var(--color-text-1)' }">{{ settings.dailyGoal }} chunks</b>.
      </div>
    </div>

    <!-- Today stat strip -->
    <div
      class="glass-strong"
      :style="{
        margin: '18px 20px 0',
        padding: '18px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        position: 'relative',
        overflow: 'hidden',
      }"
    >
      <div
        :style="{
          position: 'absolute',
          top: '-40px',
          right: '-30px',
          width: '160px',
          height: '160px',
          background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)',
          pointerEvents: 'none',
        }"
      />
      <div>
        <div
          :style="{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }"
        >Today</div>
        <div :style="{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }">
          <span class="mono" :style="{ fontSize: '26px', fontWeight: 700 }">{{ progress.todayListenCount }}</span>
          <span :style="{ fontSize: '12px', color: 'var(--color-text-3)' }">/{{ settings.dailyGoal }}</span>
        </div>
        <div :style="{ width: '100%', height: '4px', background: 'var(--color-surface-2)', borderRadius: '999px', overflow: 'hidden', marginTop: '8px' }">
          <div :style="{ width: `${goalProgressPct}%`, height: '100%', background: 'var(--grad-primary)', borderRadius: '999px', transition: 'width .35s ease' }" />
        </div>
      </div>
      <div :style="{ borderLeft: '1px solid var(--color-border-1)', paddingLeft: '14px' }">
        <div :style="{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">Streak</div>
        <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }">
          <span :style="{ color: '#FB923C', display: 'inline-flex' }"><Icon name="flame" :size="20" /></span>
          <span class="mono" :style="{ fontSize: '26px', fontWeight: 700 }">{{ progress.streakDays }}</span>
        </div>
        <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '4px' }">ngày liên tiếp</div>
      </div>
      <div :style="{ borderLeft: '1px solid var(--color-border-1)', paddingLeft: '14px' }">
        <div :style="{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">Total</div>
        <div :style="{ marginTop: '4px' }">
          <span class="mono" :style="{ fontSize: '26px', fontWeight: 700 }">{{ progress.totalListened.toLocaleString() }}</span>
        </div>
        <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '4px' }">đã nghe</div>
      </div>
    </div>

    <!-- Continue learning -->
    <div :style="{ margin: '20px 20px 0' }" v-if="continueChunk">
      <div
        class="tap"
        :style="{
          padding: '18px',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(34,211,238,0.16), rgba(167,139,250,0.16))',
          border: '1px solid rgba(34,211,238,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }"
        @click="continueLearning"
      >
        <PlayBtn :size="56" @click="continueLearning" />
        <div :style="{ flex: 1, minWidth: 0 }">
          <div
            :style="{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-cyan)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }"
          >
            {{ continueLabel }} · {{ continueTopic?.name ?? '' }}
          </div>
          <div
            :style="{
              fontSize: '15px',
              fontWeight: 600,
              marginTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--color-text-1)',
            }"
          >{{ continueChunk.text }}</div>
          <div
            :style="{
              fontSize: '12px',
              color: 'var(--color-text-3)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }"
          >
            <WaveBars color="var(--color-cyan)" :size="12" :playing="playerIsPlayingActive" />
            <span><span class="mono">{{ progress.todayListenCount }}</span> / <span class="mono">{{ settings.dailyGoal }}</span> chunks</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions grid -->
    <div :style="{ marginTop: '26px' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px', marginBottom: '12px' }">
        <div>
          <h2 :style="{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }">Bắt đầu nhanh</h2>
          <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }">Lab 5 phút</div>
        </div>
      </div>
      <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 20px' }">
        <button
          v-for="a in quickActions"
          :key="a.id"
          class="btn tap glass"
          :style="{
            padding: '14px',
            textAlign: 'left',
            borderRadius: '18px',
            minHeight: '110px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }"
          @click="runAction(a.id)"
        >
          <IconBlock :icon="a.icon" :color="a.color" :size="40" />
          <div>
            <div :style="{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }">{{ a.label }}</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">{{ a.sub }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Topic progress -->
    <div :style="{ marginTop: '28px' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px', marginBottom: '12px' }">
        <div>
          <h2 :style="{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }">Chủ đề</h2>
          <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }">Các track đang học</div>
        </div>
        <button
          class="btn tap"
          :style="{ fontSize: '12px', color: 'var(--color-cyan)', fontWeight: 600 }"
          @click="router.push('/library')"
        >Xem tất cả</button>
      </div>
      <div
        class="no-scrollbar"
        :style="{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          padding: '4px 20px',
          scrollSnapType: 'x mandatory',
        }"
      >
        <div
          v-for="t in topicCards"
          :key="t.id"
          class="glass tap"
          :style="{
            minWidth: '152px',
            padding: '14px',
            scrollSnapAlign: 'start',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            cursor: 'pointer',
            flexShrink: 0,
          }"
          @click="gotoTopic(t.id)"
        >
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
            <div
              :style="{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                background: `color-mix(in oklch, ${t.color} 20%, transparent)`,
                border: `1px solid color-mix(in oklch, ${t.color} 30%, transparent)`,
                color: t.color,
              }"
            >
              <TopicIcon :name="t.id" :size="18" />
            </div>
            <div :style="{ position: 'relative', width: '36px', height: '36px' }">
              <ProgressRing
                :value="t.pct / 100"
                :size="36"
                :stroke="4"
                :color="t.color"
                :show-label="false"
              />
              <span
                :style="{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: t.color,
                }"
              >{{ Math.round(t.pct) }}%</span>
            </div>
          </div>
          <div>
            <div :style="{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.005em' }">{{ t.name }}</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">{{ t.mastered }}</span> / <span class="mono">{{ t.total }}</span> mastered
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Due today preview -->
    <div :style="{ marginTop: '28px' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px', marginBottom: '12px' }">
        <div>
          <h2 :style="{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }">Đến hạn ôn</h2>
          <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }">
            {{ dueChunks.length }} chunks sẵn sàng
          </div>
        </div>
      </div>
      <div :style="{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }">
        <div
          v-for="c in dueChunks"
          :key="c.id"
          class="glass tap"
          :style="{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }"
          @click="openDetail(c)"
        >
          <button
            class="btn tap"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 18%, transparent)`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
            }"
            @click.stop="playChunk(c)"
          >
            <Icon name="play" :size="14" :style="{ marginLeft: '1px' }" />
          </button>
          <div :style="{ flex: 1, minWidth: 0 }">
            <div
              :style="{
                fontSize: '14px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }"
            >{{ c.text }}</div>
            <div
              :style="{
                fontSize: '12px',
                color: 'var(--color-text-3)',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }"
            >
              <StatusDot :status="progress.byId(c.id)?.status ?? 'new'" />
              <span>{{ statusToLabel(progress.byId(c.id)?.status ?? 'new') }} · <span class="mono">{{ progress.byId(c.id)?.listenCount ?? 0 }}</span> listens</span>
            </div>
          </div>
          <LevelPill :level="c.level" />
        </div>

        <EmptyDue
          v-if="dueChunks.length === 0"
          @passive="runAction('passive')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.scrollarea::-webkit-scrollbar {
  display: none;
}
</style>
