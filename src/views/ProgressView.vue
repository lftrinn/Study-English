<script setup lang="ts">
/**
 * Literal port of screens-player.jsx ProgressScreen (lines 257-396).
 * Inline styles copied verbatim; data hooks wired to live stores.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { storageService } from '@/services/storageService';
import type { Chunk } from '@/types/chunk';

import TopicIcon from '@/components/chunk/TopicIcon.vue';
import Icon from '@/components/common/Icon.vue';
import SectionHeader from '@/components/common/SectionHeader.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const ui = useUiStore();
const settings = useSettingsStore();

const totalChunks = computed(() => chunks.chunks.length);
const minutes = computed(() => Math.round((progress.totalListened * 3) / 60));

const lastWeekStats = computed(() => progress.weeklyStats);
const weekTotal = computed(() => lastWeekStats.value.reduce((s, d) => s + d.listenCount, 0));
const weekMax = computed(() => Math.max(1, ...lastWeekStats.value.map((d) => d.listenCount)));
const todayIndex = computed(() => lastWeekStats.value.length - 1);

const wowDelta = computed(() => {
  const prev = progress.previousWeekTotal;
  const cur = weekTotal.value;
  if (prev === 0) return cur === 0 ? null : 100;
  return Math.round(((cur - prev) / prev) * 100);
});
const remainingToExtend = computed(() => {
  if (progress.todayListenCount >= settings.dailyGoal) return 0;
  return Math.max(0, settings.dailyGoal - progress.todayListenCount);
});

const last14 = computed(() => {
  const out: { date: string; listened: boolean; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const has = progress.recentLogs.some((l) => l.playedAt.slice(0, 10) === key);
    out.push({ date: key, listened: has, isToday: i === 0 });
  }
  return out;
});

const topicRows = computed(() =>
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

const mostListened = computed<Chunk[]>(() =>
  progress
    .topListenedChunkIds(4)
    .map((id) => chunks.byId(id))
    .filter((c): c is Chunk => Boolean(c)),
);

const stats = computed(() => [
  {
    label: 'Mastered',
    value: progress.masteredCount,
    sub: 'chunks',
    color: '#34D399',
    icon: 'trophy' as const,
  },
  {
    label: 'Learning',
    value: progress.learningCount,
    sub: 'active',
    color: '#F59E0B',
    icon: 'brain' as const,
  },
  {
    label: 'Weak',
    value: progress.weakChunkIds.length,
    sub: 'cần ôn',
    color: '#FB7185',
    icon: 'wave' as const,
  },
  {
    label: 'Minutes',
    value: minutes.value,
    sub: 'đã nghe',
    color: '#22D3EE',
    icon: 'clock' as const,
  },
]);

const DAY_LABEL: Record<number, string> = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

async function exportProgress() {
  try {
    const data = await storageService.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunk-listening-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function playChunk(c: Chunk) {
  player.setQueue([c], { mode: 'normal' });
  void player.play();
  router.push('/player');
}
function openDetail(c: Chunk) {
  ui.openChunkDetail(c.id);
}
</script>

<template>
  <div class="scrollarea" :style="{ paddingTop: '56px' }">
    <div :style="{ padding: '8px 20px 14px' }">
      <h1 :style="{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }">Progress</h1>
      <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '2px' }">Hành trình listening lab của bạn</div>
    </div>

    <!-- Streak hero -->
    <div class="glass-strong" :style="{ margin: '0 20px', padding: '20px', position: 'relative', overflow: 'hidden' }">
      <div :style="{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 90% 0%, rgba(251,146,60,0.18), transparent)', pointerEvents: 'none' }" />
      <div :style="{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }">
        <div :style="{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #F59E0B, #FB7185)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px rgba(251,146,60,.35)', color: '#fff' }">
          <Icon name="flame" :size="32" />
        </div>
        <div :style="{ flex: 1 }">
          <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }">Streak hiện tại</div>
          <div :style="{ display: 'flex', alignItems: 'baseline', gap: '6px' }">
            <span class="mono" :style="{ fontSize: '36px', fontWeight: 700 }">{{ progress.streakDays }}</span>
            <span :style="{ fontSize: '14px', color: 'var(--color-text-2)' }">ngày</span>
          </div>
          <div :style="{ fontSize: '12px', color: 'var(--color-text-3)' }">
            Best: <span class="mono" :style="{ color: 'var(--color-text-1)' }">{{ progress.bestStreak }}</span>
            <template v-if="remainingToExtend > 0">
              · Nghe thêm <span class="mono" :style="{ color: 'var(--color-text-1)' }">{{ remainingToExtend }}</span> chunk để extend
            </template>
            <template v-else>
              · Đã đạt goal hôm nay
            </template>
          </div>
        </div>
      </div>
      <div :style="{ display: 'flex', gap: '6px', marginTop: '14px' }">
        <div
          v-for="(d, i) in last14"
          :key="i"
          :style="{
            flex: 1,
            height: '28px',
            borderRadius: '8px',
            background: d.listened
              ? 'linear-gradient(135deg, #F59E0B, #FB7185)'
              : d.isToday
                ? 'var(--color-surface-3)'
                : 'var(--color-surface-1)',
            border: d.isToday ? '1px dashed var(--color-cyan)' : '1px solid var(--color-border-1)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
          }"
        >
          <Icon v-if="d.listened" name="check" :size="12" />
          <span v-else-if="d.isToday" :style="{ width: '6px', height: '6px', borderRadius: '3px', background: 'var(--color-cyan)' }" />
        </div>
      </div>
    </div>

    <!-- Weekly chart -->
    <div class="glass" :style="{ margin: '14px 20px 0', padding: '18px' }">
      <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }">
        <div>
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }">Tuần này</div>
          <div :style="{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }">
            <span class="mono">{{ weekTotal }}</span>
            <span :style="{ fontSize: '13px', color: 'var(--color-text-3)' }"> chunks</span>
          </div>
        </div>
        <div v-if="wowDelta !== null" :style="{ textAlign: 'right' }">
          <div
            :style="{
              fontSize: '11px',
              color: wowDelta >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'flex-end',
            }"
          >
            <Icon :name="wowDelta >= 0 ? 'arrow-up' : 'arrow-down'" :size="12" />
            <span class="mono">{{ Math.abs(wowDelta) }}%</span>
          </div>
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">vs. tuần trước</div>
        </div>
      </div>
      <div :style="{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '0 4px' }">
        <div
          v-for="(d, i) in lastWeekStats"
          :key="d.date"
          :style="{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%' }"
        >
          <div
            :style="{
              width: '100%',
              height: `${(d.listenCount / weekMax) * (120 - 24)}px`,
              minHeight: '4px',
              background: i === todayIndex ? 'var(--grad-primary)' : 'var(--color-surface-3)',
              borderRadius: '6px',
              transition: 'height .4s ease',
              position: 'relative',
            }"
          >
            <div
              v-if="i === todayIndex"
              :style="{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 700, color: 'var(--color-cyan)' }"
            >{{ d.listenCount }}</div>
          </div>
          <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', fontWeight: 600 }">
            {{ DAY_LABEL[new Date(d.date).getDay()] }}
          </div>
        </div>
      </div>
    </div>

    <!-- Stats grid 2×2 -->
    <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '14px 20px 0' }">
      <div
        v-for="s in stats"
        :key="s.label"
        class="glass"
        :style="{ padding: '14px', position: 'relative', overflow: 'hidden' }"
      >
        <div
          :style="{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `radial-gradient(circle, color-mix(in oklch, ${s.color} 25%, transparent), transparent 65%)`,
          }"
        />
        <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: s.color }">
          <Icon :name="s.icon" :size="14" />
          <span :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }">{{ s.label }}</span>
        </div>
        <div class="mono" :style="{ fontSize: '24px', fontWeight: 700 }">{{ s.value.toLocaleString() }}</div>
        <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">{{ s.sub }}</div>
      </div>
    </div>

    <!-- Topic breakdown -->
    <div :style="{ marginTop: '22px' }">
      <SectionHeader title="Theo chủ đề" subtitle="Mastered / total" />
    </div>
    <div class="glass" :style="{ margin: '0 20px', padding: '6px 14px' }">
      <div
        v-for="(t, i) in topicRows"
        :key="t.id"
        :style="{
          padding: '12px 0',
          borderBottom: i < topicRows.length - 1 ? '1px solid var(--color-border-1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }"
      >
        <div
          :style="{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            background: `color-mix(in oklch, ${t.color} 20%, transparent)`,
            color: t.color,
          }"
        >
          <TopicIcon :name="t.id" :size="16" />
        </div>
        <div :style="{ flex: 1 }">
          <div :style="{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }">
            <span :style="{ fontSize: '13px', fontWeight: 600 }">{{ t.name }}</span>
            <span class="mono" :style="{ fontSize: '12px', color: 'var(--color-text-3)' }">
              {{ t.mastered }}/{{ t.total }}
            </span>
          </div>
          <ProgressBar :value="t.pct" :max="100" :height="4" :color="t.color" />
        </div>
      </div>
    </div>

    <!-- Most listened -->
    <div :style="{ marginTop: '24px' }">
      <SectionHeader title="Nghe nhiều nhất" subtitle="Top trong thư viện" />
    </div>
    <div :style="{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }">
      <div
        v-for="(c, i) in mostListened"
        :key="c.id"
        class="glass tap"
        :style="{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }"
        @click="openDetail(c)"
      >
        <span class="mono" :style="{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-3)', width: '22px' }">{{ i + 1 }}</span>
        <div :style="{ flex: 1, minWidth: 0 }">
          <div :style="{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.text }}</div>
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">{{ chunks.topicById(c.topic)?.name }}</div>
        </div>
        <button
          class="btn tap"
          :style="{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--color-text-2)',
          }"
          @click.stop="playChunk(c)"
        >
          <Icon name="headphones" :size="12" />
          <span class="mono" :style="{ fontWeight: 700 }">{{ progress.byId(c.id)?.listenCount ?? 0 }}</span>
        </button>
      </div>
      <div
        v-if="mostListened.length === 0"
        :style="{ padding: '24px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }"
      >Chưa có chunk nào được nghe</div>
    </div>

    <div :style="{ padding: '20px' }">
      <button
        class="btn tap glass"
        :style="{
          width: '100%',
          padding: '14px',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--color-text-2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }"
        @click="exportProgress"
      >
        <Icon name="download" :size="16" /> Xuất tiến độ
      </button>
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
