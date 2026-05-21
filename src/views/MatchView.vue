<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import type { Chunk } from '@/types/chunk';

import AppCard from '@/components/common/AppCard.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const settings = useSettingsStore();
const progress = useProgressStore();

type Phase = 'setup' | 'playing' | 'finished';
const phase = ref<Phase>('setup');

const pairCount = ref<6 | 8 | 12>(8);
const PAIR_OPTIONS = [6, 8, 12] as const;

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

const bestTime = computed(() => settings.getBestMatchTime(pairCount.value));
const bestLabel = computed(() => (bestTime.value ? formatMs(bestTime.value) : null));
const newRecord = computed(
  () => bestTime.value && finishedAt.value - startedAt.value <= bestTime.value,
);

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
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
  const pool = shuffleArr(chunks.chunks).slice(0, pairCount.value);
  if (pool.length < 2) return;
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
  router.replace('/');
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
    if (matchedIds.value.size === pairs.value.length) {
      finishGame();
    }
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
  // Bump familiarity for all matched chunks
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

function enState(c: Chunk): 'idle' | 'selected' | 'matched' | 'wrong' {
  if (matchedIds.value.has(c.id)) return 'matched';
  if (wrongPair.value?.enId === c.id) return 'wrong';
  if (selectedEnId.value === c.id) return 'selected';
  return 'idle';
}

function viState(c: Chunk): 'idle' | 'selected' | 'matched' | 'wrong' {
  if (matchedIds.value.has(c.id)) return 'matched';
  if (wrongPair.value?.viId === c.id) return 'wrong';
  if (selectedViId.value === c.id) return 'selected';
  return 'idle';
}

onMounted(() => {
  if (chunks.chunks.length === 0) phase.value = 'setup';
});

onBeforeUnmount(() => stopTimer());
</script>

<template>
  <section class="mv">
    <header class="mv__head safe-pt">
      <button class="mv__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="mv__head-info">
        <p class="text-caption text-text-3">Match</p>
        <p v-if="phase === 'playing'" class="mv__counter">
          {{ matchedCount }} / {{ totalCount }}
        </p>
        <p v-else-if="phase === 'finished'" class="mv__counter mono">{{ finalLabel }}</p>
      </div>
      <span class="mv__icon mv__icon--ghost" aria-hidden="true">
        <Icon name="puzzle" :size="18" />
      </span>
    </header>

    <!-- Setup -->
    <template v-if="phase === 'setup'">
      <AppCard variant="glass-strong" padding="lg" class="mv__setup-card">
        <p class="text-caption text-text-3">Chọn số cặp</p>
        <div class="mv__count-row">
          <button
            v-for="n in PAIR_OPTIONS"
            :key="n"
            class="mv__count-btn tap"
            :class="{ 'is-active': pairCount === n }"
            @click="pairCount = n"
          >
            <span class="mv__count-num">{{ n }}</span>
            <span class="mv__count-sub">cặp</span>
          </button>
        </div>

        <p v-if="bestLabel" class="mv__best">
          <Icon name="trophy" :size="14" />
          Kỷ lục {{ pairCount }} cặp: <strong>{{ bestLabel }}</strong>
        </p>
      </AppCard>

      <AppButton
        variant="primary"
        size="lg"
        block
        :disabled="chunks.chunks.length < pairCount"
        @click="start"
      >
        <Icon name="play" :size="14" />
        Bắt đầu
      </AppButton>

      <EmptyState
        v-if="chunks.chunks.length === 0"
        icon="puzzle"
        title="Chưa có chunk để chơi"
        hint="Cần ít nhất 6 chunk trong thư viện."
      />
    </template>

    <!-- Playing -->
    <template v-else-if="phase === 'playing'">
      <div class="mv__stats">
        <span class="mv__stat-pill emerald">
          <Icon name="check" :size="12" /> {{ matchedCount }} / {{ totalCount }}
        </span>
        <span class="mv__stat-pill rose">
          <Icon name="x" :size="12" /> {{ mistakes }}
        </span>
        <span class="mv__stat-pill mono">{{ elapsedLabel }}</span>
      </div>

      <div class="mv__board">
        <div class="mv__col">
          <p class="mv__col-label">English</p>
          <button
            v-for="c in enColumn"
            :key="`en-${c.id}`"
            class="mv__tile tap"
            :class="`is-${enState(c)}`"
            :disabled="matchedIds.has(c.id)"
            @click="tapEn(c)"
          >
            {{ c.text }}
          </button>
        </div>

        <div class="mv__col">
          <p class="mv__col-label">Tiếng Việt</p>
          <button
            v-for="c in viColumn"
            :key="`vi-${c.id}`"
            class="mv__tile tap"
            :class="`is-${viState(c)}`"
            :disabled="matchedIds.has(c.id)"
            @click="tapVi(c)"
          >
            {{ c.meaning }}
          </button>
        </div>
      </div>
    </template>

    <!-- Finished -->
    <template v-else>
      <AppCard variant="glass-strong" padding="lg" class="mv__finish">
        <div class="mv__finish-ring">
          <Icon name="check" :size="48" />
        </div>
        <p class="text-caption text-text-3">Hoàn thành</p>
        <h2 class="text-title-2">{{ finalLabel }}</h2>

        <p v-if="newRecord" class="mv__new-record">
          <Icon name="trophy" :size="14" /> Kỷ lục mới của {{ pairCount }} cặp!
        </p>
        <p v-else-if="bestLabel" class="mv__best">
          Kỷ lục: <strong>{{ bestLabel }}</strong>
        </p>

        <div class="mv__finish-stats">
          <div>
            <p class="mv__finish-label">Số cặp</p>
            <p class="mv__finish-value">{{ pairCount }}</p>
          </div>
          <div>
            <p class="mv__finish-label">Sai</p>
            <p class="mv__finish-value rose">{{ mistakes }}</p>
          </div>
        </div>

        <div class="mv__finish-actions">
          <AppButton variant="glass" size="md" block @click="newGame">
            <Icon name="shuffle" :size="14" />
            Chơi lại
          </AppButton>
          <AppButton variant="primary" size="md" block @click="exit">
            <Icon name="check" :size="14" />
            Xong
          </AppButton>
        </div>
      </AppCard>
    </template>
  </section>
</template>

<style scoped>
.mv {
  padding: 12px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
  min-height: 100dvh;
}
.mv__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.mv__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.mv__icon--ghost {
  color: var(--color-text-3);
}
.mv__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mv__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
.mv__counter.mono {
  font-family: var(--font-mono);
}

/* Setup */
.mv__setup-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.mv__count-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
.mv__count-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 8px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
}
.mv__count-btn.is-active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
.mv__count-num {
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.mv__count-sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mv__best {
  margin: 4px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-3);
}
.mv__best strong {
  color: var(--color-text-1);
  font-family: var(--font-mono);
}

/* Playing */
.mv__stats {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mv__stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 40%, transparent);
  color: var(--color-emerald);
  font-size: 12px;
  font-weight: 700;
}
.mv__stat-pill.rose {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-rose) 40%, transparent);
  color: var(--color-rose);
}
.mv__stat-pill.mono {
  background: var(--color-surface-2);
  border-color: var(--color-border-1);
  color: var(--color-text-2);
  font-family: var(--font-mono);
  margin-left: auto;
}

.mv__board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mv__col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mv__col-label {
  margin: 0 4px 4px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.mv__tile {
  padding: 12px 10px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  min-height: 60px;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.mv__tile.is-selected {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 50%, transparent);
  color: var(--color-cyan);
}
.mv__tile.is-matched {
  background: color-mix(in oklch, var(--color-emerald) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-emerald) 30%, transparent);
  color: var(--color-emerald);
  opacity: 0.55;
  cursor: default;
}
.mv__tile.is-wrong {
  background: color-mix(in oklch, var(--color-rose) 22%, transparent);
  border-color: color-mix(in oklch, var(--color-rose) 60%, transparent);
  color: var(--color-rose);
  animation: matchWrong 0.4s ease-in-out;
}
@keyframes matchWrong {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.mv__tile:disabled {
  cursor: default;
}

/* Finish */
.mv__finish {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  text-align: center;
}
.mv__finish-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--grad-emerald);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 40px -14px color-mix(in oklch, var(--color-emerald) 60%, transparent);
}
.mv__new-record {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-amber) 22%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 45%, transparent);
  color: var(--color-amber);
  font-size: 12px;
  font-weight: 700;
}
.mv__finish-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.mv__finish-label {
  margin: 0 0 2px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.mv__finish-value {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.mv__finish-value.rose {
  color: var(--color-rose);
}
.mv__finish-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}
</style>
