<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { speechService } from '@/services/speechService';
import { speechRecognitionService, type RecognitionHandle } from '@/services/speechRecognitionService';
import { answerCheckService } from '@/services/answerCheckService';
import type { Chunk } from '@/types/chunk';
import type { AnswerCheckResult } from '@/types/practice';

import AppCard from '@/components/common/AppCard.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const practice = usePracticeStore();

type Phase = 'idle' | 'recording' | 'result';
const phase = ref<Phase>('idle');

const supported = computed(() => speechRecognitionService.isSupported());

const recognized = ref('');
const result = ref<AnswerCheckResult | null>(null);
const errorMsg = ref('');

const elapsedMs = ref(0);
let recHandle: RecognitionHandle | null = null;
let elapsedTimer: number | null = null;
let recStartedAt = 0;

const WAVE_BARS = 28;

const current = computed<Chunk | undefined>(() => practice.current);
const accent = computed(() => chunks.topicById(current.value?.topic ?? '')?.color ?? '#22D3EE');

const progressPct = computed(() => practice.progressPct);

const elapsedLabel = computed(() => {
  const s = elapsedMs.value / 1000;
  return s.toFixed(1);
});

const overallScore = computed(() => {
  if (!result.value) return 0;
  return Math.round(result.value.score * 100);
});

const scoreColor = computed(() => {
  const s = overallScore.value;
  if (s >= 85) return 'var(--color-emerald)';
  if (s >= 70) return 'var(--color-amber)';
  return 'var(--color-rose)';
});

function startSession() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'speaking', chunks: list });
}

function exit() {
  abort();
  practice.reset();
  router.replace('/');
}

async function playTarget() {
  if (!current.value) return;
  try {
    await speechService.speak({
      text: current.value.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

function startRecording() {
  if (!current.value || !supported.value) return;
  errorMsg.value = '';
  recognized.value = '';
  result.value = null;
  recStartedAt = Date.now();
  elapsedMs.value = 0;
  phase.value = 'recording';

  elapsedTimer = window.setInterval(() => {
    elapsedMs.value = Date.now() - recStartedAt;
  }, 100) as unknown as number;

  recHandle = speechRecognitionService.recognize({
    lang: 'en-US',
    onResult: (r) => {
      recognized.value = r.transcript;
    },
    onError: (m) => {
      errorMsg.value = m;
    },
    onEnd: () => {
      stopElapsed();
      if (phase.value === 'recording') {
        evaluate();
      }
    },
  });

  if (!recHandle) {
    errorMsg.value = 'not-supported';
    stopElapsed();
    phase.value = 'idle';
  }
}

function stopRecording() {
  if (recHandle) {
    recHandle.abort();
    recHandle = null;
  }
  stopElapsed();
  if (recognized.value.trim().length > 0) {
    evaluate();
  } else if (phase.value === 'recording' && !errorMsg.value) {
    phase.value = 'idle';
  }
}

function abort() {
  if (recHandle) {
    recHandle.abort();
    recHandle = null;
  }
  stopElapsed();
}

function stopElapsed() {
  if (elapsedTimer !== null) {
    window.clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

function evaluate() {
  if (!current.value) return;
  const r = answerCheckService.check(current.value.text, recognized.value, {
    ignoreCase: true,
    ignorePunctuation: true,
  });
  result.value = r;
  phase.value = 'result';
}

async function commitResult() {
  if (!result.value || !current.value) return;
  await practice.submit({
    chunkId: current.value.id,
    prompt: current.value.text,
    expectedAnswer: current.value.text,
    userAnswer: recognized.value,
    isCorrect: result.value.isCorrect,
    score: result.value.score,
  });
  await progress.recordSpeakResult(current.value.id, result.value.isCorrect);
}

async function next() {
  await commitResult();
  practice.advance();
  if (practice.status === 'finished') {
    practice.reset();
    router.replace('/');
    return;
  }
  recognized.value = '';
  result.value = null;
  phase.value = 'idle';
}

function tryAgain() {
  recognized.value = '';
  result.value = null;
  phase.value = 'idle';
}

function waveHeight(i: number): number {
  if (phase.value !== 'recording') return 0.3;
  const sec = elapsedMs.value / 1000;
  // Simulated waveform based on time and bar index
  return 0.4 + 0.6 * Math.abs(Math.sin(sec * 5 + i * 0.6));
}

const wordScores = computed(() => {
  if (!result.value) return [];
  return result.value.diff.map((d) => {
    let score = 0;
    if (d.status === 'match') score = 95;
    else if (d.status === 'missing') score = 0;
    else score = 55;
    return { token: d.token, score, status: d.status };
  });
});

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    startSession();
  }
});

onBeforeUnmount(() => abort());

watch(
  () => current.value?.id,
  () => {
    if (phase.value === 'recording') abort();
    phase.value = 'idle';
    recognized.value = '';
    result.value = null;
  },
);
</script>

<template>
  <section class="sp">
    <header class="sp__head safe-pt">
      <button class="sp__icon tap" :aria-label="'Quay lại'" @click="exit">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="sp__head-info">
        <p class="text-caption text-text-3">Speaking</p>
        <p class="sp__counter">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
      </div>
      <button
        class="sp__icon tap"
        :aria-label="'Nghe mẫu'"
        :disabled="!current"
        @click="playTarget"
      >
        <Icon name="volume" :size="18" />
      </button>
    </header>

    <div class="sp__bar">
      <div class="sp__bar-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <template v-if="!supported">
      <EmptyState
        icon="mic"
        title="Trình duyệt không hỗ trợ Speech Recognition"
        hint="Hãy thử trên Chrome/Edge/Safari trên iOS để dùng Speaking mode. Bạn vẫn có thể nghe và lặp lại thủ công."
      >
        <AppButton variant="primary" size="md" @click="playTarget">
          <Icon name="volume" :size="14" />
          Nghe mẫu
        </AppButton>
      </EmptyState>
    </template>

    <template v-else-if="current">
      <AppCard variant="glass-strong" padding="lg" class="sp__chunk" :style="{ '--accent': accent }">
        <header class="sp__chunk-head">
          <TopicChip :topic-id="current.topic" :show-icon="true" />
          <LevelPill :level="current.level" />
        </header>
        <p class="sp__chunk-text">{{ current.text }}</p>
        <p class="sp__chunk-meaning">{{ current.meaning }}</p>
      </AppCard>

      <!-- Idle -->
      <div v-if="phase === 'idle'" class="sp__stage">
        <div class="sp__visual" :style="{ '--accent': accent }">
          <button
            class="sp__mic tap"
            :aria-label="'Bắt đầu ghi âm'"
            @click="startRecording"
          >
            <Icon name="mic" :size="34" />
          </button>
        </div>
        <p class="sp__hint">Tap để ghi âm — đọc to câu phía trên</p>
        <AppButton variant="glass" size="md" @click="playTarget">
          <Icon name="volume" :size="14" />
          Nghe mẫu trước
        </AppButton>
      </div>

      <!-- Recording -->
      <div v-else-if="phase === 'recording'" class="sp__stage">
        <div class="sp__rec-visual">
          <span class="sp__rec-ring" />
          <span class="sp__rec-ring" />
          <span class="sp__rec-ring" />
          <button class="sp__rec-mic tap" :aria-label="'Dừng ghi âm'" @click="stopRecording">
            <Icon name="mic" :size="34" />
          </button>
        </div>

        <div class="sp__wave">
          <span
            v-for="i in WAVE_BARS"
            :key="`bar-${i}`"
            class="sp__wave-bar"
            :style="{ height: `${waveHeight(i) * 100}%` }"
          />
        </div>

        <div class="sp__rec-meta">
          <span class="sp__rec-dot" />
          <span class="sp__rec-text">Đang ghi</span>
          <span class="sp__rec-timer mono">{{ elapsedLabel }}s</span>
        </div>

        <AppButton variant="danger" size="md" @click="stopRecording">
          <Icon name="stop" :size="14" />
          Dừng & kiểm tra
        </AppButton>
      </div>

      <!-- Result -->
      <div v-else class="sp__stage">
        <div class="sp__result-ring" :style="{ '--score-color': scoreColor }">
          <svg viewBox="0 0 110 110" class="sp__result-svg">
            <circle cx="55" cy="55" r="48" stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="none" />
            <circle
              cx="55"
              cy="55"
              r="48"
              :stroke="scoreColor"
              stroke-width="8"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="`${(overallScore / 100) * 2 * Math.PI * 48} ${2 * Math.PI * 48}`"
              transform="rotate(-90 55 55)"
              style="transition: stroke-dasharray 0.4s ease"
            />
          </svg>
          <div class="sp__result-inner">
            <span class="sp__result-pct">{{ overallScore }}%</span>
            <span class="sp__result-label">accuracy</span>
          </div>
        </div>

        <p class="sp__heard">
          <span class="sp__heard-label">Bạn đã nói</span>
          {{ recognized || '(không nhận diện được)' }}
        </p>

        <div v-if="wordScores.length > 0" class="sp__words">
          <span
            v-for="(w, idx) in wordScores"
            :key="`w-${idx}-${w.token}`"
            class="sp__word"
            :class="`is-${w.status}`"
          >
            {{ w.token }}
          </span>
        </div>

        <p
          v-if="overallScore < 70"
          class="sp__tip"
        >
          <Icon name="sparkles" :size="14" />
          Mẹo: nghe lại mẫu rồi đọc theo từng cụm nhỏ trước khi đọc cả câu.
        </p>

        <div class="sp__result-actions">
          <AppButton variant="glass" size="md" block @click="tryAgain">
            <Icon name="mic" :size="14" />
            Thử lại
          </AppButton>
          <AppButton variant="primary" size="md" block @click="next">
            <Icon name="arrow-right" :size="14" />
            Chunk tiếp theo
          </AppButton>
        </div>
      </div>

      <div v-if="errorMsg && supported" class="sp__err">
        Speech recognition lỗi: <strong>{{ errorMsg }}</strong>. Hãy thử lại.
      </div>
    </template>

    <EmptyState
      v-else
      icon="mic"
      title="Chưa có chunk để luyện nói"
      hint="Mở Library, lọc chủ đề rồi quay lại."
    >
      <AppButton variant="primary" size="md" @click="startSession">
        <Icon name="mic" :size="14" />
        Bắt đầu phiên Speaking
      </AppButton>
    </EmptyState>
  </section>
</template>

<style scoped>
.sp {
  padding: 12px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  min-height: 100dvh;
}
.sp__head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.sp__icon {
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
.sp__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sp__counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}
.sp__bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
}
.sp__bar-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}

/* Chunk card */
.sp__chunk {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
.sp__chunk::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 70% at 0% 0%, color-mix(in oklch, var(--accent) 22%, transparent), transparent 55%);
  pointer-events: none;
}
.sp__chunk > * {
  position: relative;
  z-index: 1;
}
.sp__chunk-head {
  display: flex;
  gap: 8px;
}
.sp__chunk-text {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: var(--color-text-1);
}
.sp__chunk-meaning {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

.sp__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

/* Idle visual */
.sp__visual {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background:
    radial-gradient(120% 70% at 30% 30%, color-mix(in oklch, var(--accent) 40%, transparent), transparent 60%),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--accent) 35%, transparent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sp__mic {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 36px -14px rgba(34, 211, 238, 0.6);
}
.sp__hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

/* Recording visual */
.sp__rec-visual {
  position: relative;
  width: 160px;
  height: 160px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sp__rec-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid color-mix(in oklch, var(--color-rose) 60%, transparent);
  animation: recPulse 2.2s ease-out infinite;
}
.sp__rec-ring:nth-child(2) {
  animation-delay: 0.6s;
}
.sp__rec-ring:nth-child(3) {
  animation-delay: 1.2s;
}
@keyframes recPulse {
  0% {
    opacity: 0.6;
    transform: scale(0.6);
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}
.sp__rec-mic {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-rose) 0%, #ef4444 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  box-shadow: 0 18px 40px -16px color-mix(in oklch, var(--color-rose) 60%, transparent);
}

.sp__wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 56px;
  width: 100%;
  max-width: 320px;
  justify-content: center;
}
.sp__wave-bar {
  display: inline-block;
  width: 4px;
  min-height: 6px;
  background: color-mix(in oklch, var(--color-cyan) 80%, white);
  border-radius: 4px;
  transition: height 0.12s ease;
}

.sp__rec-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.sp__rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-rose);
  animation: recDot 1.4s ease-in-out infinite;
}
@keyframes recDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.sp__rec-text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-cyan);
}
.sp__rec-timer {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-3);
  font-family: var(--font-mono);
}

/* Result */
.sp__result-ring {
  position: relative;
  width: 110px;
  height: 110px;
}
.sp__result-svg {
  width: 100%;
  height: 100%;
}
.sp__result-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.sp__result-pct {
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.sp__result-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}

.sp__heard {
  margin: 0;
  padding: 10px 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 14px;
  font-size: 15px;
  color: var(--color-text-1);
  font-weight: 600;
  text-align: center;
  width: 100%;
}
.sp__heard-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
  margin-bottom: 4px;
}

.sp__words {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  width: 100%;
}
.sp__word {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
.sp__word.is-match {
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  color: var(--color-emerald);
}
.sp__word.is-wrong {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  color: var(--color-rose);
}
.sp__word.is-missing {
  background: color-mix(in oklch, var(--color-amber) 18%, transparent);
  color: var(--color-amber);
  outline: 1px dashed color-mix(in oklch, var(--color-amber) 60%, transparent);
}

.sp__tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-amber) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 35%, transparent);
  color: var(--color-amber);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

.sp__result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.sp__err {
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-rose) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-rose) 35%, transparent);
  color: var(--color-rose);
  font-size: 12px;
}
</style>
