<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import type { Chunk } from '@/types/chunk';

import ModeShell from '@/components/layout/ModeShell.vue';
import ResultStat from '@/components/common/ResultStat.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const settings = useSettingsStore();
const progress = useProgressStore();

type Phase = 'setup' | 'playing' | 'finished';
const phase = ref<Phase>('setup');

const PAIR_OPTIONS = [5, 10, 15, 20] as const;
type PairCount = (typeof PAIR_OPTIONS)[number];
const pairCount = ref<PairCount>(5);

const pairs = ref<Chunk[]>([]);
const enColumn = ref<Chunk[]>([]);
const viColumn = ref<Chunk[]>([]);
const matchedIds = ref<Set<string>>(new Set());
const selectedEnId = ref<string | null>(null);
const selectedViId = ref<string | null>(null);
const wrongPair = ref<{ enId: string; viId: string } | null>(null);
const mistakes = ref(0);
const startedAt = ref(0);
const finishedAt = ref(0);
const elapsedMs = ref(0);
let timer: number | null = null;

const matchedCount = computed(() => matchedIds.value.size);
const totalCount = computed(() => pairs.value.length);

const elapsedLabel = computed(() => formatMs(elapsedMs.value));
const finalLabel = computed(() => formatMs(finishedAt.value - startedAt.value));

const bestTimeMs = computed(() => settings.getBestMatchTime(pairCount.value));
const bestLabel = computed(() => (bestTimeMs.value ? formatMs(bestTimeMs.value) : '—'));
const newRecord = computed(
  () =>
    bestTimeMs.value !== undefined &&
    finishedAt.value > 0 &&
    finishedAt.value - startedAt.value <= bestTimeMs.value,
);

const eligibleChunks = computed(() => chunks.chunks.length);

function formatMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(1, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function start() {
  const requested = Math.min(pairCount.value, chunks.chunks.length);
  if (requested < 2) return;
  const pool = shuffleArr(chunks.chunks).slice(0, requested);
  pairs.value = pool;
  enColumn.value = shuffleArr(pool);
  viColumn.value = shuffleArr(pool);
  matchedIds.value = new Set();
  selectedEnId.value = null;
  selectedViId.value = null;
  wrongPair.value = null;
  mistakes.value = 0;
  startedAt.value = Date.now();
  finishedAt.value = 0;
  elapsedMs.value = 0;
  timer = window.setInterval(() => {
    elapsedMs.value = Date.now() - startedAt.value;
  }, 250) as unknown as number;
  phase.value = 'playing';
}

function stopTimer() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function exit() {
  stopTimer();
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function newGame() {
  stopTimer();
  phase.value = 'setup';
}

function checkMatch() {
  const enId = selectedEnId.value;
  const viId = selectedViId.value;
  if (!enId || !viId) return;
  if (enId === viId) {
    matchedIds.value = new Set(matchedIds.value).add(enId);
    selectedEnId.value = null;
    selectedViId.value = null;
    if (matchedIds.value.size === pairs.value.length) finishGame();
    return;
  }
  mistakes.value += 1;
  wrongPair.value = { enId, viId };
  window.setTimeout(() => {
    wrongPair.value = null;
    selectedEnId.value = null;
    selectedViId.value = null;
  }, 600);
}

function finishGame() {
  stopTimer();
  finishedAt.value = Date.now();
  settings.recordMatchTime(pairCount.value, finishedAt.value - startedAt.value);
  for (const c of pairs.value) {
    void progress.recordAnswer(c.id, true);
  }
  phase.value = 'finished';
}

function tapEn(c: Chunk) {
  if (matchedIds.value.has(c.id) || wrongPair.value) return;
  selectedEnId.value = selectedEnId.value === c.id ? null : c.id;
  if (selectedEnId.value && selectedViId.value) checkMatch();
}

function tapVi(c: Chunk) {
  if (matchedIds.value.has(c.id) || wrongPair.value) return;
  selectedViId.value = selectedViId.value === c.id ? null : c.id;
  if (selectedEnId.value && selectedViId.value) checkMatch();
}

type TileState = 'idle' | 'selected' | 'matched' | 'wrong';
function enState(c: Chunk): TileState {
  if (matchedIds.value.has(c.id)) return 'matched';
  if (wrongPair.value?.enId === c.id) return 'wrong';
  if (selectedEnId.value === c.id) return 'selected';
  return 'idle';
}
function viState(c: Chunk): TileState {
  if (matchedIds.value.has(c.id)) return 'matched';
  if (wrongPair.value?.viId === c.id) return 'wrong';
  if (selectedViId.value === c.id) return 'selected';
  return 'idle';
}

onMounted(() => {
  if (chunks.chunks.length === 0) phase.value = 'setup';
});

onBeforeUnmount(() => stopTimer());

const headerSubtitle = computed(() => {
  if (phase.value === 'setup') return 'Tap pairs';
  if (phase.value === 'playing') return `${matchedCount.value} / ${totalCount.value}`;
  return finalLabel.value;
});
</script>

<template>
  <ModeShell title="Match" :subtitle="headerSubtitle" :on-close="exit">
    <!-- Setup -->
    <template v-if="phase === 'setup'">
      <div class="mv__pad">
        <p class="mv__section-label">Number of pairs</p>
        <div class="mv__count-row">
          <button
            v-for="n in PAIR_OPTIONS"
            :key="n"
            class="mv__count-btn tap mono"
            :class="{ 'is-active': pairCount === n }"
            @click="pairCount = n"
          >{{ n }}</button>
        </div>

        <p class="mv__hint">
          <strong class="mono">{{ Math.min(pairCount, eligibleChunks) }}</strong>
          cặp · pairs are shuffled across two columns.
        </p>

        <button
          class="mv__cta tap"
          :disabled="eligibleChunks < 2"
          @click="start"
        >
          <Icon name="play" :size="14" /> Start match · {{ Math.min(pairCount, eligibleChunks) }} cặp
        </button>

        <EmptyState
          v-if="eligibleChunks === 0"
          icon="puzzle"
          title="Chưa có chunk để chơi"
          hint="Cần ít nhất 2 chunk trong thư viện."
        />
      </div>
    </template>

    <!-- Playing -->
    <template v-else-if="phase === 'playing'">
      <div class="mv__stats">
        <ResultStat label="Time" :value="elapsedLabel" color="#22D3EE" mono />
        <ResultStat label="Matches" :value="`${matchedCount}/${totalCount}`" color="#A78BFA" />
        <ResultStat label="Best" :value="bestLabel" color="#34D399" mono />
      </div>

      <div class="mv__pad">
        <div class="mv__col-labels">
          <span>English</span>
          <span>Vietnamese</span>
        </div>

        <!-- Single 2-col grid where each row holds an interleaved
             (en[i], vi[i]) pair so both columns auto-align to the
             tallest tile in that row. -->
        <div class="mv__grid">
          <template
            v-for="(p, i) in enColumn"
            :key="`row-${i}-${p.id}`"
          >
            <button
              class="mv__tile tap"
              :class="`is-${enState(p)}`"
              :disabled="matchedIds.has(p.id)"
              @click="tapEn(p)"
            >{{ p.text }}</button>
            <button
              v-if="viColumn[i]"
              class="mv__tile tap"
              :class="`is-${viState(viColumn[i])}`"
              :disabled="matchedIds.has(viColumn[i].id)"
              @click="tapVi(viColumn[i])"
            >{{ viColumn[i].meaning }}</button>
          </template>
        </div>

        <p class="mv__mistakes-line">
          <Icon name="x" :size="12" /> <span class="mono">{{ mistakes }}</span> sai
        </p>
      </div>
    </template>

    <!-- Cleared -->
    <template v-else>
      <div class="mv__clear">
        <div class="mv__clear-ring">
          <Icon name="check" :size="48" />
        </div>
        <div class="mv__clear-title">
          <span class="grad-text">Cleared!</span>
        </div>
        <p class="mv__clear-sub">
          <span class="mono">{{ totalCount }}/{{ totalCount }}</span> matched in
          <span class="mono mv__clear-time">{{ finalLabel }}</span>
        </p>
        <p v-if="newRecord" class="mv__record">
          <Icon name="trophy" :size="14" /> Kỷ lục mới cho {{ pairCount }} cặp!
        </p>
        <p v-else-if="bestTimeMs" class="mv__best">
          Kỷ lục: <strong class="mono">{{ formatMs(bestTimeMs) }}</strong>
        </p>
        <p class="mv__clear-tip">Your fastest yet on this set. Try a harder topic next?</p>

        <div class="mv__clear-actions">
          <button class="mv__cta-secondary tap" @click="exit">
            <Icon name="check" :size="14" /> Xong
          </button>
          <button class="mv__cta tap" @click="newGame">
            <Icon name="shuffle" :size="14" /> Try another set
          </button>
        </div>
      </div>
    </template>
  </ModeShell>
</template>

<style scoped>
.mv__pad {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mv__section-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.mv__count-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.mv__count-btn {
  padding: 12px 0;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 16px;
  font-weight: 700;
}
.mv__count-btn.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

.mv__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: center;
}
.mv__hint strong {
  color: var(--color-text-1);
}

.mv__cta {
  padding: 16px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow:
    0 10px 28px rgba(34, 211, 238, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}
.mv__cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mv__cta-secondary {
  padding: 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Playing */
.mv__stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 0 20px 14px;
}

.mv__col-labels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 10px;
}
.mv__col-labels span {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mv__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mv__tile {
  padding: 12px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  text-align: left;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  min-height: 60px;
  transition:
    background 0.15s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1)),
    border-color 0.15s,
    color 0.15s;
}
.mv__tile.is-selected {
  background: rgba(34, 211, 238, 0.18);
  border-color: var(--color-cyan);
}
.mv__tile.is-matched {
  background: rgba(52, 211, 153, 0.08);
  border-color: color-mix(in oklch, var(--color-emerald) 50%, transparent);
  color: color-mix(in oklch, var(--color-emerald) 80%, white);
  opacity: 0.55;
  cursor: default;
}
.mv__tile.is-wrong {
  background: rgba(251, 113, 133, 0.18);
  border-color: var(--color-rose);
  color: var(--color-rose);
  animation: mvShake 0.4s ease-in-out;
}
@keyframes mvShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.mv__mistakes-line {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}

/* Cleared */
.mv__clear {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px 24px;
  text-align: center;
}
.mv__clear-ring {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--grad-emerald);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 20px 60px rgba(52, 211, 153, 0.5);
}
.mv__clear-title {
  font-size: 28px;
  font-weight: 700;
  margin-top: 24px;
  letter-spacing: -0.015em;
}
.mv__clear-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--color-text-2);
}
.mv__clear-time {
  color: var(--color-cyan);
  font-weight: 700;
}
.mv__record {
  margin: 12px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-amber) 22%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 45%, transparent);
  color: var(--color-amber);
  font-size: 12px;
  font-weight: 700;
}
.mv__best {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.mv__best strong {
  color: var(--color-text-1);
}
.mv__clear-tip {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.5;
  max-width: 280px;
}
.mv__clear-actions {
  margin-top: 28px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
}
</style>
