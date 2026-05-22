<script setup lang="ts">
/**
 * Progress by Part — weakest/strongest callouts, 28×7 calendar heatmap,
 * per-Part accuracy bars, projected score sparkline.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import ModeShell from '@/components/layout/ModeShell.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';

const router = useRouter();
const toeic = useToeicStore();

const weakest = computed(() => toeic.weakestPart);
const strongest = computed(() => toeic.strongestPart);

function partStat(id: number) {
  return toeic.partStats[id] ?? { practiced: 0, accuracy: 0 };
}
function pct(id: number) {
  return Math.round(partStat(id).accuracy * 100);
}
function classFor(p: number) {
  const v = pct(p);
  if (v >= 70) return 'is-strong';
  if (v >= 50) return 'is-mid';
  return 'is-weak';
}

function cellBg(partId: number, acc: number | undefined) {
  const color = TOEIC_PARTS.find((p) => p.id === partId)?.color ?? '#22D3EE';
  if (acc == null) return 'var(--color-surface-1)';
  if (acc >= 0.7) return `color-mix(in oklch, ${color} ${30 + acc * 50}%, transparent)`;
  if (acc >= 0.5) return `color-mix(in oklch, ${color} ${20 + acc * 35}%, transparent)`;
  return `color-mix(in oklch, ${color} ${10 + acc * 30}%, transparent)`;
}

const scores = computed(() => toeic.examScores.map((s) => s.total));
const minScore = 420;
const maxScore = 500;
function normY(v: number) {
  return (v - minScore) / (maxScore - minScore);
}
const sparkPoints = computed(() =>
  scores.value
    .map((v, i) => `${(i / Math.max(1, scores.value.length - 1)) * 200},${60 - normY(v) * 50}`)
    .join(' '),
);
const sparkPolygon = computed(() => {
  const pts = scores.value.map(
    (v, i) => `${(i / Math.max(1, scores.value.length - 1)) * 200},${60 - normY(v) * 50}`,
  );
  return [...pts, '200,60', '0,60'].join(' ');
});
const projectedFirst = computed(() => scores.value[0] ?? 0);
const projectedLast = computed(() => scores.value[scores.value.length - 1] ?? 0);
const projectedDelta = computed(() => projectedLast.value - projectedFirst.value);

function onClose() {
  router.push('/toeic');
}
</script>

<template>
  <ModeShell title="TOEIC · Progress" subtitle="28 ngày × 7 Part" :on-close="onClose">
    <div class="tprog">
      <!-- Weak / Strong -->
      <div class="tprog__callouts">
        <div class="glass tprog__callout" :style="{ borderLeft: '3px solid var(--color-rose)' }">
          <div class="tprog__callout-eye" :style="{ color: 'var(--color-rose)' }">Yếu nhất</div>
          <div class="tprog__callout-body">
            <span class="mono tprog__callout-p" :style="{ color: weakest.color }">P{{ weakest.id }}</span>
            <span class="tprog__callout-vi">{{ weakest.vi }}</span>
          </div>
          <div class="tprog__callout-meta">
            Accuracy <span class="mono is-weak">{{ pct(weakest.id) }}%</span>
          </div>
        </div>
        <div class="glass tprog__callout" :style="{ borderLeft: '3px solid var(--color-emerald)' }">
          <div class="tprog__callout-eye" :style="{ color: 'var(--color-emerald)' }">Mạnh nhất</div>
          <div class="tprog__callout-body">
            <span class="mono tprog__callout-p" :style="{ color: strongest.color }">P{{ strongest.id }}</span>
            <span class="tprog__callout-vi">{{ strongest.vi }}</span>
          </div>
          <div class="tprog__callout-meta">
            Accuracy <span class="mono is-strong">{{ pct(strongest.id) }}%</span>
          </div>
        </div>
      </div>

      <!-- Calendar heatmap -->
      <div class="glass tprog__heatmap">
        <div class="tprog__heatmap-head">
          <div>
            <div class="tprog__group-lbl">Heatmap 28 ngày</div>
            <div class="tprog__heatmap-sub">Mỗi ô = một câu đã làm</div>
          </div>
          <span class="mono tprog__heatmap-count">{{ toeic.dailyHeat.length }} ngày</span>
        </div>

        <div class="tprog__heatmap-grid" :style="{ gridTemplateColumns: `48px repeat(${toeic.dailyHeat.length}, 1fr)` }">
          <div />
          <div v-for="(_, i) in toeic.dailyHeat" :key="`h-${i}`" class="tprog__heatmap-colhead">
            <span v-if="i % 7 === 6">·</span>
          </div>

          <template v-for="p in TOEIC_PARTS" :key="p.id">
            <div class="tprog__heatmap-rowhead">P{{ p.id }}</div>
            <div
              v-for="(d, i) in toeic.dailyHeat"
              :key="`c-${p.id}-${i}`"
              class="tprog__heatmap-cell"
              :style="{
                background: cellBg(p.id, d.parts[p.id]),
                border: d.parts[p.id] == null ? '1px solid var(--color-border-1)' : '1px solid transparent',
              }"
              :title="d.parts[p.id] ? `${Math.round(d.parts[p.id] * 100)}%` : ''"
            />
          </template>
        </div>
      </div>

      <!-- Per-Part bars -->
      <div class="glass tprog__bars">
        <div class="tprog__group-lbl">Accuracy theo Part</div>
        <div
          v-for="(p, i) in TOEIC_PARTS"
          :key="p.id"
          class="tprog__bar-row"
          :style="{ borderBottom: i < TOEIC_PARTS.length - 1 ? '1px solid var(--color-border-1)' : 'none' }"
        >
          <span class="mono tprog__bar-p" :style="{
            color: p.color,
            background: `color-mix(in oklch, ${p.color} 18%, transparent)`,
          }">P{{ p.id }}</span>
          <div class="tprog__bar-body">
            <div class="tprog__bar-head">
              <span class="tprog__bar-name">{{ p.vi }}</span>
              <span class="mono tprog__bar-count">{{ partStat(p.id).practiced }} câu</span>
            </div>
            <div class="tprog__bar-track">
              <div class="tprog__bar-fill" :style="{ width: `${pct(p.id)}%`, background: p.color }" />
            </div>
          </div>
          <span class="mono tprog__bar-pct" :class="classFor(p.id)">{{ pct(p.id) }}%</span>
        </div>
      </div>

      <!-- Score trend -->
      <div class="glass tprog__spark">
        <div class="tprog__spark-head">
          <div>
            <div class="tprog__group-lbl">Điểm dự đoán 6 tuần gần</div>
            <div class="tprog__spark-num">
              <span class="mono">{{ projectedFirst }}</span>
              <span class="tprog__spark-arrow">→</span>
              <span class="mono" :style="{ color: 'var(--color-emerald)' }">{{ projectedLast }}</span>
            </div>
          </div>
          <span class="mono tprog__spark-delta" :style="{ color: projectedDelta >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }">
            {{ projectedDelta >= 0 ? '+' : '' }}{{ projectedDelta }}
          </span>
        </div>
        <svg viewBox="0 0 200 60" width="100%" height="60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-cyan)" stop-opacity="0.4" />
              <stop offset="100%" stop-color="var(--color-cyan)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#sparkFill)" stroke="none" :points="sparkPolygon" />
          <polyline fill="none" stroke="var(--color-cyan)" stroke-width="2" :points="sparkPoints" />
          <circle
            v-for="(v, i) in scores"
            :key="i"
            :cx="(i / Math.max(1, scores.length - 1)) * 200"
            :cy="60 - normY(v) * 50"
            :r="i === scores.length - 1 ? 4 : 2.5"
            :fill="i === scores.length - 1 ? '#fff' : 'var(--color-cyan)'"
            stroke="var(--color-cyan)"
            :stroke-width="i === scores.length - 1 ? 2 : 0"
          />
        </svg>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tprog {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tprog__group-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.tprog__callouts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tprog__callout { padding: 14px; }
.tprog__callout-eye {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tprog__callout-body { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.tprog__callout-p { font-size: 22px; font-weight: 700; }
.tprog__callout-vi { font-size: 13px; color: var(--color-text-2); }
.tprog__callout-meta { font-size: 11px; color: var(--color-text-3); margin-top: 4px; }
.is-strong { color: var(--color-emerald); font-weight: 700; }
.is-mid { color: var(--color-cyan); font-weight: 700; }
.is-weak { color: var(--color-rose); font-weight: 700; }

.tprog__heatmap { padding: 14px; overflow-x: auto; }
.tprog__heatmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.tprog__heatmap-sub { font-size: 11px; color: var(--color-text-4); margin-top: 2px; }
.tprog__heatmap-count { font-size: 11px; color: var(--color-text-3); }
.tprog__heatmap-grid { display: grid; gap: 2px; font-size: 9px; min-width: 360px; }
.tprog__heatmap-colhead {
  height: 14px;
  display: grid;
  place-items: center;
  color: var(--color-text-4);
  font-size: 8px;
}
.tprog__heatmap-rowhead {
  display: flex;
  align-items: center;
  padding-left: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
}
.tprog__heatmap-cell {
  aspect-ratio: 1;
  min-height: 16px;
  border-radius: 3px;
}

.tprog__bars { padding: 14px; }
.tprog__bar-row {
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tprog__bar-p {
  font-size: 11px;
  font-weight: 700;
  min-width: 28px;
  padding: 3px 6px;
  border-radius: 5px;
  text-align: center;
}
.tprog__bar-body { flex: 1; }
.tprog__bar-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.tprog__bar-name { font-size: 13px; font-weight: 600; }
.tprog__bar-count { font-size: 11px; color: var(--color-text-3); }
.tprog__bar-track {
  height: 4px;
  background: var(--color-surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.tprog__bar-fill { height: 100%; transition: width 0.4s; }
.tprog__bar-pct {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
}

.tprog__spark { padding: 14px; }
.tprog__spark-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tprog__spark-num { font-size: 18px; font-weight: 700; margin-top: 2px; display: inline-flex; align-items: baseline; gap: 6px; }
.tprog__spark-arrow { font-size: 12px; color: var(--color-text-3); }
.tprog__spark-delta { font-size: 11px; }
</style>
