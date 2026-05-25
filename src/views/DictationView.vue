<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import { answerCheckService } from '@/services/answerCheckService';
import type { Chunk } from '@/types/chunk';

import ModeShell from '@/components/layout/ModeShell.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveTimeline from '@/components/common/WaveTimeline.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const practice = usePracticeStore();
const chunks = useChunkStore();
const settings = useSettingsStore();
const ui = useUiStore();

const value = ref('');
const checked = ref(false);
const showHint = ref(false);
const slow = ref(false);
const plays = ref(0);
const isPlaying = ref(false);
const progressPlay = ref(0);
let playTimer: number | null = null;

const current = computed<Chunk | undefined>(() => practice.current);
const progressPct = computed(() => practice.progressPct);

const speedValue = computed(() => (slow.value ? 0.7 : 1));

const targetTokens = computed(() => {
  if (!current.value) return [] as string[];
  return current.value.text.replace(/[.,?!]/g, '').split(/\s+/).filter(Boolean);
});

const inputTokens = computed(() =>
  value.value.replace(/[.,?!]/g, '').split(/\s+/).filter(Boolean),
);

const diff = computed(() => {
  if (!checked.value || !current.value) return [] as Array<{ word: string; state: 'correct' | 'wrong' | 'missing'; got?: string }>;
  return targetTokens.value.map((t, i) => {
    const got = inputTokens.value[i];
    if (!got) return { word: t, state: 'missing' as const };
    if (got.toLowerCase() === t.toLowerCase()) return { word: t, state: 'correct' as const };
    return { word: t, state: 'wrong' as const, got };
  });
});

const correctCount = computed(() => diff.value.filter((d) => d.state === 'correct').length);
const accuracy = computed(() => {
  if (targetTokens.value.length === 0) return 0;
  return Math.round((correctCount.value / targetTokens.value.length) * 100);
});

const hintPreview = computed(() => {
  if (!current.value) return '';
  const tokens = current.value.text.split(/\s+/);
  return tokens
    .map((t, i) => (i < 2 ? t : '___'))
    .join(' ');
});

function startWithFiltered() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'dictation', chunks: list });
}

function shuffleRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  practice.start({ mode: 'dictation', chunks: arr });
}

async function play() {
  if (!current.value) return;
  plays.value += 1;
  isPlaying.value = true;
  progressPlay.value = 0;
  const startedAt = Date.now();
  if (playTimer !== null) window.clearInterval(playTimer);
  const total = Math.max(800, current.value.text.length * 80 / speedValue.value);
  playTimer = window.setInterval(() => {
    const t = (Date.now() - startedAt) / total;
    progressPlay.value = Math.min(1, t);
    if (t >= 1) {
      if (playTimer !== null) window.clearInterval(playTimer);
      playTimer = null;
      isPlaying.value = false;
    }
  }, 60);
  try {
    await speechService.speak({
      text: current.value.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: speedValue.value,
    });
  } catch {
    // ignore
  } finally {
    if (playTimer !== null) window.clearInterval(playTimer);
    playTimer = null;
    isPlaying.value = false;
    progressPlay.value = 1;
  }
}

async function onCheck() {
  if (!current.value) return;
  checked.value = true;
  const r = answerCheckService.check(current.value.text, value.value, {
    ignoreCase: true,
    ignorePunctuation: true,
  });
  await practice.submit({
    chunkId: current.value.id,
    prompt: '[audio]',
    expectedAnswer: current.value.text,
    userAnswer: value.value,
    isCorrect: r.isCorrect,
    score: r.score,
  });
}
function skip() {
  practice.advance();
}
function nextChunk() {
  practice.advance();
}

function exit() {
  practice.reset();
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function openDetail() {
  if (current.value) ui.openChunkDetail(current.value.id);
}

watch(
  () => current.value?.id,
  () => {
    value.value = '';
    checked.value = false;
    showHint.value = false;
    plays.value = 0;
    progressPlay.value = 0;
  },
);

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    startWithFiltered();
  }
});
onBeforeUnmount(() => {
  if (playTimer !== null) window.clearInterval(playTimer);
});

const subtitle = computed(() => {
  if (practice.total === 0) return undefined;
  return `${Math.min(practice.index + 1, practice.total)} / ${practice.total}`;
});

const voiceLabel = computed(() => settings.selectedVoiceName ?? 'Aria · US');
</script>

<template>
  <ModeShell title="Dictation Lab" :subtitle="subtitle" :on-close="exit" :on-more="openDetail">
    <template v-if="practice.status === 'active' && current">
      <div :style="{ padding: '0 20px' }">
        <ProgressBar
          :value="Math.min(practice.index + 1, practice.total)"
          :max="practice.total"
          :height="4"
        />
      </div>

      <!-- Stats strip -->
      <div :style="{ padding: '14px 20px', display: 'flex', gap: '8px' }">
        <div class="dt-stat">
          <div class="dt-stat__label">Played</div>
          <div class="dt-stat__value mono" :style="{ color: '#22D3EE' }">{{ plays }}×</div>
        </div>
        <div class="dt-stat">
          <div class="dt-stat__label">Speed</div>
          <div class="dt-stat__value mono" :style="{ color: '#A78BFA' }">{{ speedValue.toFixed(2) }}×</div>
        </div>
        <div class="dt-stat">
          <div class="dt-stat__label">Accuracy</div>
          <div class="dt-stat__value mono" :style="{ color: '#34D399' }">{{ checked ? `${accuracy}%` : '—' }}</div>
        </div>
      </div>

      <!-- Player -->
      <div :style="{ padding: '0 20px' }">
        <div
          class="glass-strong"
          :style="{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }"
        >
          <div :style="{ display: 'flex', alignItems: 'center', gap: '12px' }">
            <PlayBtn :playing="isPlaying" :size="48" @click="play" />
            <WaveTimeline :progress="progressPlay" />
          </div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }"
          >
            <div
              :style="{
                fontSize: '11px',
                color: 'var(--color-text-3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
              }"
            >
              <Icon name="mic" :size="11" />
              <span :style="{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ voiceLabel }}</span>
              <span :style="{ width: '3px', height: '3px', borderRadius: '2px', background: 'var(--color-text-4)' }" />
              <span class="mono">{{ plays }}×</span>
            </div>
            <div :style="{ display: 'flex', gap: '6px', flexShrink: 0 }">
              <button
                class="btn tap"
                :style="{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: slow ? 'color-mix(in oklch, var(--color-violet) 16%, transparent)' : 'var(--color-surface-2)',
                  border: slow ? '1px solid var(--color-violet)' : '1px solid var(--color-border-1)',
                  color: slow ? 'var(--color-violet)' : 'var(--color-text-2)',
                }"
                @click="slow = !slow"
              >{{ speedValue.toFixed(2) }}×</button>
              <button
                class="btn tap"
                :style="{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: showHint ? 'rgba(245,158,11,0.18)' : 'var(--color-surface-2)',
                  border: showHint ? '1px solid var(--color-amber)' : '1px solid var(--color-border-1)',
                  color: showHint ? 'var(--color-amber)' : 'var(--color-text-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }"
                @click="showHint = !showHint"
              >
                <Icon name="sparkles" :size="11" /> Hint
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="showHint"
          :style="{
            marginTop: '10px',
            padding: '10px 12px',
            background: 'var(--color-surface-1)',
            borderRadius: '12px',
            border: '1px dashed var(--color-border-2)',
            fontSize: '12px',
            color: 'var(--color-text-2)',
          }"
        >
          <span :style="{ color: 'var(--color-text-3)' }">First 2 words:</span>
          <span class="mono" :style="{ color: 'var(--color-amber)', marginLeft: '6px' }">{{ hintPreview }}</span>
        </div>
      </div>

      <!-- Input -->
      <div :style="{ padding: '14px 20px 0' }">
        <textarea
          v-model="value"
          :placeholder="'Type what you heard…'"
          :style="{
            width: '100%',
            minHeight: '90px',
            padding: '14px',
            borderRadius: '16px',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-2)',
            color: 'var(--color-text-1)',
            fontSize: '16px',
            fontFamily: 'inherit',
            lineHeight: 1.45,
            outline: 'none',
            resize: 'none',
          }"
          @input="checked = false"
        />
      </div>

      <!-- Comparison -->
      <div v-if="checked" :style="{ padding: '4px 20px 0' }">
        <div class="glass" :style="{ padding: '14px' }">
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }"
          >
            <Icon name="check" :size="14" :style="{ color: 'var(--color-emerald)' }" />
            <span
              :style="{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                color: 'var(--color-text-3)',
              }"
            >Comparison</span>
            <span class="mono" :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">
              {{ correctCount }}/{{ diff.length }} correct
            </span>
          </div>
          <div
            :style="{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 6px',
              fontSize: '16px',
              fontFamily: 'var(--font-mono)',
            }"
          >
            <span
              v-for="(d, i) in diff"
              :key="i"
              :class="`dt-tok dt-tok--${d.state}`"
            >{{ d.word }}</span>
          </div>
          <div
            :style="{
              fontSize: '12px',
              color: 'var(--color-text-3)',
              marginTop: '10px',
              display: 'flex',
              gap: '14px',
            }"
          >
            <span class="dt-legend"><span class="dt-legend__dot" :style="{ background: '#34D399' }" /> correct</span>
            <span class="dt-legend"><span class="dt-legend__dot" :style="{ background: '#FB7185' }" /> wrong</span>
            <span class="dt-legend"><span class="dt-legend__dot" :style="{ background: '#F59E0B' }" /> missing</span>
          </div>
        </div>
        <div
          :style="{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'var(--color-surface-1)',
            borderRadius: '12px',
            border: '1px solid var(--color-border-1)',
            fontSize: '14px',
            color: 'var(--color-text-1)',
            fontWeight: 600,
          }"
        >
          <span
            :style="{
              display: 'inline-block',
              marginRight: '8px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-text-3)',
            }"
          >Đáp án</span>
          {{ current.text }}
          <span
            v-if="current.phonetic"
            class="mono"
            :style="{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--color-cyan)' }"
          >{{ current.phonetic }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div :style="{ padding: '14px 20px 20px', display: 'flex', gap: '10px' }">
        <button
          class="btn tap glass"
          :style="{ padding: '14px 0', flex: 1, fontSize: '13px', fontWeight: 700 }"
          @click="skip"
        >Skip</button>
        <button
          v-if="!checked"
          class="btn tap"
          :disabled="value.trim().length === 0"
          :style="{
            flex: 2,
            padding: '14px 0',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 700,
            background: 'var(--grad-primary)',
            color: '#fff',
            textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
            boxShadow: '0 10px 28px rgba(79, 70, 229,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
            opacity: value.trim().length === 0 ? 0.5 : 1,
          }"
          @click="onCheck"
        >Check answer</button>
        <button
          v-else
          class="btn tap"
          :style="{
            flex: 2,
            padding: '14px 0',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 700,
            background: 'var(--grad-primary)',
            color: '#fff',
            textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
            boxShadow: '0 10px 28px rgba(79, 70, 229,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
          }"
          @click="nextChunk"
        >Tiếp theo →</button>
      </div>
    </template>

    <template v-else-if="practice.status === 'finished'">
      <StudySessionSummary
        title="Phiên dictation xong"
        :total="practice.total"
        :correct-count="practice.correctCount"
        :wrong-count="practice.wrongCount"
        primary-label="Xong"
        secondary-label="Trộn và làm lại"
        @primary="exit"
        @secondary="shuffleRestart"
      />
    </template>

    <EmptyState
      v-else
      icon="ear"
      title="Chưa có chunk để luyện nghe"
      hint="Mở Library, lọc chủ đề rồi quay lại."
    >
      <button
        class="btn tap"
        :style="{
          padding: '12px 18px',
          borderRadius: '14px',
          background: 'var(--grad-primary)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 700,
          textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
          boxShadow: '0 10px 28px rgba(79, 70, 229,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
        }"
        @click="startWithFiltered"
      >Bắt đầu</button>
    </EmptyState>
  </ModeShell>
</template>

<style scoped>
.dt-stat {
  flex: 1;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.dt-stat__label {
  font-size: 10px;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}
.dt-stat__value {
  font-size: 18px;
  font-weight: 700;
}

.dt-tok {
  padding: 4px 9px;
  border-radius: 7px;
  line-height: 1.25;
}
.dt-tok--correct {
  background: rgba(52, 211, 153, 0.18);
  color: #86efac;
}
.dt-tok--wrong {
  background: rgba(251, 113, 133, 0.18);
  color: #fca5a5;
  text-decoration: line-through;
}
.dt-tok--missing {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
}

.dt-legend {
  display: flex;
  align-items: center;
  gap: 5px;
}
.dt-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>
