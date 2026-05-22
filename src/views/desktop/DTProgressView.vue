<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const player = usePlayerStore();
const ui = useUiStore();

function gotoTopic(id: string) {
  chunks.setTopic(id);
  router.push('/library');
}
function playChunk(id: string) {
  const c = chunks.byId(id);
  if (!c) return;
  player.setQueue([c], { mode: 'normal' });
  void player.play();
  router.push('/player');
}
function openChunkDetail(id: string) {
  ui.openChunkDetail(id);
}

const range = ref<'Week' | 'Month' | 'Year'>('Week');

const mastered = computed(() => progress.masteredCount);
const learning = computed(() => progress.learningCount);
const weak = computed(() => progress.weakChunkIds.length);
const minutes = computed(() => Math.max(0, Math.round(progress.totalListened * 0.45)));

const days28 = computed(() => {
  const today = new Date();
  const arr: Array<{ done: boolean; today: boolean }> = [];
  const counts = new Set(progress.recentLogs.map((l) => {
    const d = new Date(l.playedAt);
    return d.toISOString().slice(0, 10);
  }));
  for (let i = 27; i >= 0; i -= 1) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    arr.push({ done: counts.has(key) && i > 0, today: i === 0 });
  }
  return arr;
});

const weekly = computed(() => progress.weeklyStats.map((d) => d.listenCount));
const weeklyMax = computed(() => Math.max(1, ...weekly.value));
const weeklyTotal = computed(() => weekly.value.reduce((s, n) => s + n, 0));
const weeklyDelta = computed(() => {
  const prev = progress.previousWeekTotal;
  if (prev === 0) return weeklyTotal.value > 0 ? 100 : 0;
  return Math.round(((weeklyTotal.value - prev) / prev) * 100);
});

const topicRows = computed(() => chunks.topicWithCounts.map((t) => {
  const total = t.count ?? 0;
  const masteredCount = Array.from(progress.progressMap.values()).filter(
    (p) => p.status === 'mastered' && chunks.byId(p.chunkId)?.topic === t.id,
  ).length;
  const pct = total > 0 ? (masteredCount / total) * 100 : 0;
  return { ...t, total, mastered: masteredCount, pct };
}));

const top = computed(() => {
  return progress.topListenedChunkIds(8)
    .map((id) => chunks.byId(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ ...c, listens: progress.byId(c.id)?.listenCount ?? 0 }));
});

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
</script>

<template>
  <div class="scrollarea dt-pg">
    <h1 class="dt-pg__title">Progress</h1>
    <div class="dt-pg__sub">The shape of your listening lab over time.</div>

    <div class="dt-pg__row">
      <!-- Streak hero -->
      <div class="glass-strong dt-pg__streak">
        <div class="dt-pg__streak-halo" />
        <div class="dt-pg__streak-row">
          <div class="dt-pg__streak-ic">
            <Icon name="flame" :size="38" :style="{ color: '#fff' }" />
          </div>
          <div class="dt-pg__streak-meta">
            <div class="dt-pg__lbl">Current streak</div>
            <div class="dt-pg__streak-num">
              <span class="mono">{{ progress.streakDays }}</span>
              <span class="dt-pg__streak-suf">days</span>
            </div>
            <div class="dt-pg__streak-hint">
              Best: <span class="mono">{{ progress.bestStreak }}</span> · listen
              <span class="mono">{{ Math.max(0, settings.dailyGoal - progress.todayListenCount) }}</span>
              today to extend
            </div>
          </div>
        </div>
        <div class="dt-pg__strip">
          <div
            v-for="(d, i) in days28"
            :key="i"
            class="dt-pg__strip-cell"
            :class="{ 'is-done': d.done, 'is-today': d.today }"
          >
            <Icon v-if="d.done" name="check" :size="10" :style="{ color: '#fff' }" />
            <span v-else-if="d.today" class="dt-pg__today-dot" />
          </div>
        </div>
      </div>

      <!-- Stats 2x2 -->
      <div class="dt-pg__stats">
        <div class="glass dt-pg__stat" :style="{ '--c': '#34D399' } as any">
          <IconBlock icon="trophy" color="#34D399" :size="36" />
          <div class="dt-pg__stat-val"><span class="mono">{{ mastered }}</span></div>
          <div class="dt-pg__stat-lbl">Mastered</div>
        </div>
        <div class="glass dt-pg__stat">
          <IconBlock icon="brain" color="#F59E0B" :size="36" />
          <div class="dt-pg__stat-val"><span class="mono">{{ learning }}</span></div>
          <div class="dt-pg__stat-lbl">Learning</div>
        </div>
        <div class="glass dt-pg__stat">
          <IconBlock icon="wave" color="#FB7185" :size="36" />
          <div class="dt-pg__stat-val"><span class="mono">{{ weak }}</span></div>
          <div class="dt-pg__stat-lbl">Weak</div>
        </div>
        <div class="glass dt-pg__stat">
          <IconBlock icon="clock" color="#22D3EE" :size="36" />
          <div class="dt-pg__stat-val"><span class="mono">{{ minutes }}</span></div>
          <div class="dt-pg__stat-lbl">Minutes</div>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="glass dt-pg__chart">
      <div class="dt-pg__chart-head">
        <div>
          <div class="dt-pg__lbl">This week</div>
          <div class="dt-pg__chart-num">
            <span class="mono">{{ weeklyTotal }}</span>
            <span class="dt-pg__chart-suf">chunks heard</span>
            <span class="dt-pg__delta" :class="weeklyDelta >= 0 ? 'is-up' : 'is-down'">
              {{ weeklyDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(weeklyDelta) }}%
            </span>
          </div>
        </div>
        <div class="dt-pg__chart-tabs">
          <button
            v-for="l in ['Week','Month','Year']"
            :key="l"
            class="btn tap dt-pg__chart-tab"
            :class="{ 'is-on': range === l }"
            @click="range = l as any"
          >{{ l }}</button>
        </div>
      </div>
      <div class="dt-pg__bars">
        <div v-for="(v, i) in weekly" :key="i" class="dt-pg__bar-col">
          <div
            class="dt-pg__bar"
            :class="{ 'is-today': i === weekly.length - 1 }"
            :style="{ height: `${Math.max(6, (v / weeklyMax) * 160)}px` }"
          />
          <span class="mono dt-pg__bar-num">{{ v }}</span>
          <span class="dt-pg__bar-day">{{ days[i] }}</span>
        </div>
      </div>
    </div>

    <!-- Two-column: by topic + most listened -->
    <div class="dt-pg__row2">
      <div class="glass dt-pg__panel">
        <div class="dt-pg__lbl">By topic</div>
        <div
          v-for="(t, i) in topicRows"
          :key="t.id"
          class="dt-pg__topic-row tap"
          :class="{ 'is-last': i === topicRows.length - 1 }"
          @click="gotoTopic(t.id)"
        >
          <div
            class="dt-pg__topic-ic"
            :style="{ background: `color-mix(in oklch, ${t.color} 20%, transparent)`, color: t.color }"
          >
            <TopicIcon :name="t.id" :size="14" />
          </div>
          <div class="dt-pg__topic-body">
            <div class="dt-pg__topic-line">
              <span class="dt-pg__topic-name">{{ t.name }}</span>
              <span class="mono dt-pg__topic-cnt">{{ t.mastered }}/{{ t.total }}</span>
            </div>
            <ProgressBar :value="t.pct" :max="100" :height="3" :color="t.color" />
          </div>
        </div>
      </div>

      <div class="glass dt-pg__panel">
        <div class="dt-pg__lbl">Most listened</div>
        <div class="dt-pg__top">
          <div
            v-for="(c, i) in top"
            :key="c.id"
            class="dt-pg__top-row tap"
            @click="openChunkDetail(c.id)"
          >
            <span class="mono dt-pg__top-rank">{{ i + 1 }}</span>
            <div
              class="dt-pg__top-ic"
              :style="{ background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`, color: chunks.topicById(c.topic)?.color ?? '#22D3EE' }"
            >
              <TopicIcon :name="c.topic" :size="12" />
            </div>
            <div class="dt-pg__top-text">{{ c.text }}</div>
            <button
              class="btn tap dt-pg__top-play"
              :style="{
                background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`,
                color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
              }"
              @click.stop="playChunk(c.id)"
              aria-label="Play"
            >
              <Icon name="play" :size="11" :style="{ marginLeft: '1px' }" />
            </button>
            <span class="dt-pg__top-listens">
              <Icon name="headphones" :size="11" :style="{ color: 'var(--color-text-3)' }" />
              <span class="mono">{{ c.listens }}</span>
            </span>
          </div>
          <div v-if="top.length === 0" class="dt-pg__empty">
            Chưa có dữ liệu — bắt đầu nghe để xem bảng xếp hạng.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-pg { padding: 28px; }
.dt-pg__title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
.dt-pg__sub { font-size: 13px; color: var(--color-text-3); margin-top: 2px; margin-bottom: 22px; }
.dt-pg__lbl {
  font-size: 11px; font-weight: 700; color: var(--color-text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
}

.dt-pg__row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }

.dt-pg__streak { padding: 22px; position: relative; overflow: hidden; }
.dt-pg__streak-halo {
  position: absolute; inset: 0;
  background: radial-gradient(60% 50% at 90% 0%, rgba(251,146,60,0.18), transparent);
  pointer-events: none;
}
.dt-pg__streak-row { position: relative; display: flex; align-items: center; gap: 18px; }
.dt-pg__streak-ic {
  width: 76px; height: 76px; border-radius: 22px;
  background: linear-gradient(135deg, #F59E0B, #FB7185);
  display: grid; place-items: center;
  box-shadow: 0 12px 30px rgba(251,146,60,0.35);
  flex-shrink: 0;
}
.dt-pg__streak-meta { flex: 1; }
.dt-pg__streak-num { display: flex; align-items: baseline; gap: 8px; }
.dt-pg__streak-num .mono { font-size: 44px; font-weight: 700; }
.dt-pg__streak-suf { font-size: 16px; color: var(--color-text-2); }
.dt-pg__streak-hint { font-size: 12px; color: var(--color-text-3); }
.dt-pg__streak-hint .mono { color: var(--color-text-1); }

.dt-pg__strip { display: flex; gap: 5px; margin-top: 16px; position: relative; }
.dt-pg__strip-cell {
  flex: 1; height: 26px; border-radius: 6px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: grid; place-items: center;
}
.dt-pg__strip-cell.is-done {
  background: linear-gradient(135deg, #F59E0B, #FB7185);
  border-color: transparent;
}
.dt-pg__strip-cell.is-today {
  background: var(--color-surface-3);
  border: 1px dashed var(--color-cyan);
}
.dt-pg__today-dot { width: 4px; height: 4px; border-radius: 2px; background: var(--color-cyan); }

.dt-pg__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dt-pg__stat {
  padding: 16px; display: flex; flex-direction: column; gap: 8px;
  position: relative; overflow: hidden;
}
.dt-pg__stat-val .mono { font-size: 28px; font-weight: 700; }
.dt-pg__stat-lbl {
  font-size: 11px; font-weight: 700; color: var(--color-text-3);
  text-transform: uppercase; letter-spacing: 0.04em;
}

.dt-pg__chart { padding: 22px; margin-top: 18px; }
.dt-pg__chart-head {
  display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px;
}
.dt-pg__chart-num {
  font-size: 28px; font-weight: 700; margin-top: 2px;
  display: flex; align-items: baseline; gap: 8px;
}
.dt-pg__chart-suf { font-size: 14px; color: var(--color-text-3); }
.dt-pg__delta { font-size: 12px; font-weight: 700; }
.dt-pg__delta.is-up { color: var(--color-emerald); }
.dt-pg__delta.is-down { color: var(--color-rose); }
.dt-pg__chart-tabs { display: flex; gap: 6px; }
.dt-pg__chart-tab {
  padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
  border: 1px solid transparent; color: var(--color-text-3);
}
.dt-pg__chart-tab.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-border-2);
  color: var(--color-text-1);
}
.dt-pg__bars {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 8px; align-items: end; padding-top: 12px; min-height: 200px;
}
.dt-pg__bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.dt-pg__bar {
  width: 100%; max-width: 48px;
  background: var(--color-surface-3);
  border-radius: 8px 8px 4px 4px;
}
.dt-pg__bar.is-today { background: var(--grad-primary); }
.dt-pg__bar-num { font-size: 11px; font-weight: 700; color: var(--color-text-2); }
.dt-pg__bar-day { font-size: 10px; color: var(--color-text-3); }

.dt-pg__row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
.dt-pg__panel { padding: 18px; }
.dt-pg__topic-row {
  padding: 10px 0; display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--color-border-1);
}
.dt-pg__topic-row.is-last { border-bottom: 0; }
.dt-pg__topic-row.tap { cursor: pointer; }
.dt-pg__topic-row.tap:hover { background: var(--color-surface-1); border-radius: 8px; padding-left: 6px; padding-right: 6px; margin: 0 -6px; }
.dt-pg__topic-ic {
  width: 30px; height: 30px; border-radius: 9px;
  display: grid; place-items: center; flex-shrink: 0;
}
.dt-pg__topic-body { flex: 1; }
.dt-pg__topic-line {
  display: flex; justify-content: space-between; margin-bottom: 3px;
}
.dt-pg__topic-name { font-size: 13px; font-weight: 600; }
.dt-pg__topic-cnt { font-size: 11px; color: var(--color-text-3); }

.dt-pg__top { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.dt-pg__top-row {
  padding: 8px 10px; border-radius: 10px;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
  display: flex; align-items: center; gap: 10px;
}
.dt-pg__top-rank { font-size: 12px; font-weight: 700; color: var(--color-text-3); width: 18px; text-align: right; }
.dt-pg__top-ic {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center; flex-shrink: 0;
}
.dt-pg__top-text {
  flex: 1; min-width: 0; font-size: 12px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-pg__top-listens {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--color-text-2);
}
.dt-pg__top-row.tap { cursor: pointer; }
.dt-pg__top-row.tap:hover { background: var(--color-surface-2); }
.dt-pg__top-play {
  width: 24px; height: 24px; border-radius: 7px;
  display: grid; place-items: center;
}
.dt-pg__empty {
  padding: 24px; text-align: center; font-size: 12px; color: var(--color-text-3);
  border: 1px dashed var(--color-border-1); border-radius: 12px;
}
</style>
