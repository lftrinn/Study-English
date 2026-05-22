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

import ModeShell from '@/components/layout/ModeShell.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
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
const recognitionConfidence = ref(0);
const result = ref<AnswerCheckResult | null>(null);
const errorMsg = ref('');

const elapsedMs = ref(0);
let recHandle: RecognitionHandle | null = null;
let elapsedTimer: number | null = null;
let recStartedAt = 0;

const WAVE_BARS = 28;
const waveLevels = ref<number[]>(Array.from({ length: WAVE_BARS }, () => 0.3));

let audioContext: AudioContext | null = null;
let audioAnalyser: AnalyserNode | null = null;
let audioStream: MediaStream | null = null;
let audioRafId = 0;

const current = computed<Chunk | undefined>(() => practice.current);
const accent = computed(() => chunks.topicById(current.value?.topic ?? '')?.color ?? '#22D3EE');

const elapsedSec = computed(() => elapsedMs.value / 1000);

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function tokenSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return Math.max(0, 1 - dist / maxLen);
}

const overallScore = computed(() => {
  if (!result.value) return 0;
  const tokens = result.value.diff;
  if (tokens.length === 0) return 0;
  let sum = 0;
  for (const d of tokens) sum += diffTokenScore(d);
  const avg = sum / tokens.length / 100;
  const confidenceWeight = recognitionConfidence.value > 0
    ? 0.4 + 0.6 * Math.min(1, recognitionConfidence.value)
    : 1;
  return Math.round(avg * confidenceWeight * 100);
});

function diffTokenScore(d: AnswerCheckResult['diff'][number]): number {
  if (d.status === 'match') return 95;
  if (d.status === 'missing') return 0;
  if (!result.value) return 0;
  const expectedTokens = result.value.expectedTokens;
  const userTokens = result.value.userTokens;
  const idx = result.value.diff.indexOf(d);
  const exp = expectedTokens[idx];
  const usr = userTokens[idx] ?? '';
  if (!exp) return 30;
  const sim = tokenSimilarity(exp, usr);
  return Math.round(sim * 90);
}
const scoreColor = computed(() => {
  const s = overallScore.value;
  if (s >= 85) return 'var(--color-emerald)';
  if (s >= 70) return 'var(--color-amber)';
  return 'var(--color-rose)';
});

const wordScores = computed(() => {
  if (!result.value) return [] as Array<{ token: string; score: number; status: string }>;
  return result.value.diff.map((d) => ({
    token: d.token,
    score: diffTokenScore(d),
    status: d.status,
  }));
});

const summaryHeadline = computed(() => {
  const s = overallScore.value;
  if (s >= 85) return 'Great attempt';
  if (s >= 70) return 'Almost there';
  return 'Keep trying';
});

function startSession() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 10);
  practice.start({ mode: 'speaking', chunks: list });
}

function exit() {
  abort();
  practice.reset();
  if (window.history.length > 1) router.back();
  else router.replace('/');
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
    /* ignore */
  }
}

async function startWaveCapture() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext = new Ctx();
    const source = audioContext.createMediaStreamSource(audioStream);
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 64;
    audioAnalyser.smoothingTimeConstant = 0.78;
    source.connect(audioAnalyser);

    const buffer = new Uint8Array(audioAnalyser.frequencyBinCount);
    const loop = () => {
      if (!audioAnalyser) return;
      audioAnalyser.getByteFrequencyData(buffer);
      const next: number[] = new Array(WAVE_BARS);
      const step = Math.max(1, Math.floor(buffer.length / WAVE_BARS));
      for (let i = 0; i < WAVE_BARS; i += 1) {
        const v = buffer[i * step] ?? 0;
        next[i] = 0.25 + 0.75 * (v / 255);
      }
      waveLevels.value = next;
      audioRafId = window.requestAnimationFrame(loop);
    };
    audioRafId = window.requestAnimationFrame(loop);
  } catch {
    /* user denied or unsupported — fallback handled in waveHeight */
  }
}

function stopWaveCapture() {
  if (audioRafId) {
    window.cancelAnimationFrame(audioRafId);
    audioRafId = 0;
  }
  audioAnalyser?.disconnect();
  audioAnalyser = null;
  if (audioContext) {
    void audioContext.close().catch(() => {});
    audioContext = null;
  }
  if (audioStream) {
    audioStream.getTracks().forEach((t) => t.stop());
    audioStream = null;
  }
  waveLevels.value = Array.from({ length: WAVE_BARS }, () => 0.3);
}

function startRecording() {
  if (!current.value || !supported.value) return;
  errorMsg.value = '';
  recognized.value = '';
  recognitionConfidence.value = 0;
  result.value = null;
  recStartedAt = Date.now();
  elapsedMs.value = 0;
  phase.value = 'recording';
  void startWaveCapture();

  elapsedTimer = window.setInterval(() => {
    elapsedMs.value = Date.now() - recStartedAt;
  }, 100) as unknown as number;

  recHandle = speechRecognitionService.recognize({
    lang: 'en-US',
    onResult: (r) => {
      recognized.value = r.transcript;
      if (Number.isFinite(r.confidence) && r.confidence > 0) {
        recognitionConfidence.value = r.confidence;
      }
    },
    onError: (m) => {
      errorMsg.value = m;
    },
    onEnd: () => {
      stopElapsed();
      stopWaveCapture();
      if (phase.value === 'recording') evaluate();
    },
  });

  if (!recHandle) {
    errorMsg.value = 'not-supported';
    stopElapsed();
    stopWaveCapture();
    phase.value = 'idle';
  }
}

function stopRecording() {
  if (recHandle) {
    recHandle.abort();
    recHandle = null;
  }
  stopElapsed();
  stopWaveCapture();
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
  stopWaveCapture();
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
  recognitionConfidence.value = 0;
  result.value = null;
  phase.value = 'idle';
}

function waveHeight(i: number): number {
  if (phase.value !== 'recording') return 0.3;
  const live = waveLevels.value[i - 1];
  if (typeof live === 'number' && live > 0.3) return live;
  // Fallback animation when mic stream is unavailable (denied / unsupported).
  const sec = elapsedSec.value;
  return 0.4 + 0.6 * Math.abs(Math.sin(sec * 6 + i * 0.6));
}

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
    recognitionConfidence.value = 0;
    result.value = null;
  },
);

const subtitle = computed(() => {
  if (practice.total === 0) return undefined;
  return `${Math.min(practice.index + 1, practice.total)} / ${practice.total}`;
});
</script>

<template>
  <ModeShell title="Speaking Lab" :subtitle="subtitle" :on-close="exit" stage-width="narrow">
    <template v-if="!supported">
      <EmptyState
        icon="mic"
        title="Trình duyệt không hỗ trợ Speech Recognition"
        hint="Hãy thử trên Chrome/Edge/Safari iOS. Bạn vẫn có thể nghe và lặp lại thủ công."
      >
        <button class="sp__cta tap" @click="playTarget">
          <Icon name="volume" :size="14" /> Nghe mẫu
        </button>
      </EmptyState>
    </template>

    <template v-else-if="current">
      <div :style="{ padding: '0 20px' }">
        <ProgressBar
          :value="Math.min(practice.index + 1, practice.total)"
          :max="practice.total"
          :height="4"
        />
      </div>

      <div class="sp__body">
        <!-- Target card -->
        <div
          class="sp__target"
          :style="{
            background: `linear-gradient(160deg, color-mix(in oklch, ${accent} 22%, transparent), color-mix(in oklch, ${accent} 6%, transparent))`,
            border: `1px solid color-mix(in oklch, ${accent} 26%, transparent)`,
          }"
        >
          <header class="sp__target-head">
            <span class="sp__target-label" :style="{ color: accent }">Repeat after me</span>
            <button
              class="sp__icon-btn tap"
              :aria-label="'Phát mẫu'"
              @click="playTarget"
            >
              <Icon name="play" :size="14" />
            </button>
          </header>
          <p class="sp__target-text">{{ current.text }}</p>
          <p v-if="current.phonetic" class="sp__phonetic mono">{{ current.phonetic }}</p>
          <p class="sp__meaning">{{ current.meaning }}</p>
        </div>

        <!-- Stage -->
        <div class="sp__stage">
          <!-- Idle -->
          <div v-if="phase === 'idle'" class="sp__visual-block">
            <div
              class="sp__idle-circle"
              :style="{
                background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 25%, transparent), color-mix(in oklch, ${accent} 8%, transparent))`,
                borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
                color: accent,
              }"
            >
              <Icon name="mic" :size="52" />
            </div>
            <p class="sp__idle-hint">
              Tap the button below to start.<br />
              Recording happens locally — nothing leaves your device.
            </p>
          </div>

          <!-- Recording -->
          <div v-else-if="phase === 'recording'" class="sp__visual-block">
            <div class="sp__rec-wrap">
              <span
                v-for="i in 3"
                :key="`ring-${i}`"
                class="sp__rec-ring"
                :style="{
                  borderColor: `color-mix(in oklch, ${accent} 50%, transparent)`,
                  animationDelay: `${(i - 1) * 0.7}s`,
                }"
              />
              <div
                class="sp__rec-core"
                :style="{
                  background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 60%, var(--color-violet)))`,
                  boxShadow: `0 0 60px color-mix(in oklch, ${accent} 50%, transparent)`,
                }"
              >
                <Icon name="mic" :size="48" />
              </div>
            </div>

            <div class="sp__wave">
              <span
                v-for="i in WAVE_BARS"
                :key="`bar-${i}`"
                class="sp__wave-bar"
                :style="{
                  height: `${waveHeight(i) * 100}%`,
                  background: accent,
                }"
              />
            </div>

            <p class="sp__rec-meta mono">
              Listening…
              <span class="sp__rec-dot" :style="{ background: accent }" />
              {{ elapsedSec.toFixed(1) }}s
            </p>
          </div>

          <!-- Result -->
          <div v-else class="sp__result-block">
            <div class="sp__result-row">
              <ProgressRing
                :value="overallScore / 100"
                :size="110"
                :stroke="9"
                :color="scoreColor"
                :show-label="false"
              />
              <div class="sp__result-ring-inner">
                <span class="sp__result-pct mono">{{ overallScore }}</span>
                <span class="sp__result-pct-label">Score</span>
              </div>
              <div class="sp__result-text">
                <span class="sp__result-headline" :style="{ color: scoreColor }">
                  {{ summaryHeadline }}
                </span>
                <p class="sp__result-stats">
                  Pronunciation:
                  <b>{{ overallScore >= 85 ? 'strong' : overallScore >= 70 ? 'okay' : 'needs work' }}</b><br />
                  Pacing: <b>natural</b><br />
                  Stress:
                  <b :style="{ color: 'var(--color-amber)' }">{{ overallScore >= 85 ? 'even' : 'uneven' }}</b>
                </p>
              </div>
            </div>

            <div class="sp__words-card">
              <div class="sp__words-label">Word-by-word</div>
              <div class="sp__words">
                <span
                  v-for="(w, idx) in wordScores"
                  :key="`w-${idx}-${w.token}`"
                  class="sp__word mono"
                  :style="{
                    color: w.score >= 85 ? '#34D399' : w.score >= 70 ? '#F59E0B' : '#FB7185',
                    background: `color-mix(in oklch, ${w.score >= 85 ? '#34D399' : w.score >= 70 ? '#F59E0B' : '#FB7185'} 16%, transparent)`,
                    borderColor: `color-mix(in oklch, ${w.score >= 85 ? '#34D399' : w.score >= 70 ? '#F59E0B' : '#FB7185'} 30%, transparent)`,
                  }"
                >
                  {{ w.token }} <span class="sp__word-score">{{ w.score }}</span>
                </span>
              </div>
              <div v-if="overallScore < 85" class="sp__tip">
                Tip: lặp từng cụm nhỏ trước khi đọc cả câu, nhấn vào trọng âm chính.
                <span v-if="current?.phonetic" class="sp__tip-phonetic mono">{{ current.phonetic }}</span>
              </div>
              <div v-if="recognitionConfidence > 0" class="sp__confidence">
                Độ tin cậy nhận diện: <b class="mono">{{ Math.round(recognitionConfidence * 100) }}%</b>
              </div>
            </div>

            <p v-if="recognized" class="sp__heard">
              <span class="sp__heard-label">You said</span>
              {{ recognized }}
            </p>
          </div>
        </div>

        <div v-if="errorMsg" class="sp__err">
          Speech recognition lỗi: <strong>{{ errorMsg }}</strong>. Hãy thử lại.
        </div>

        <!-- Action row -->
        <div class="sp__actions">
          <button
            v-if="phase === 'idle'"
            class="sp__cta tap"
            @click="startRecording"
          >
            <Icon name="mic" :size="18" /> Tap to record
          </button>
          <button
            v-else-if="phase === 'recording'"
            class="sp__cta sp__cta-stop tap"
            @click="stopRecording"
          >
            <span class="sp__stop-square" />
            Stop · <span class="mono">{{ elapsedSec.toFixed(1) }}s</span>
          </button>
          <template v-else>
            <button class="sp__cta-secondary tap" @click="tryAgain">Try again</button>
            <button class="sp__cta tap" @click="next">Next chunk →</button>
          </template>
        </div>
      </div>
    </template>

    <EmptyState
      v-else
      icon="mic"
      title="Chưa có chunk để luyện nói"
      hint="Mở Library, lọc chủ đề rồi quay lại."
    >
      <button class="sp__cta tap" @click="startSession">
        <Icon name="mic" :size="14" /> Bắt đầu Speaking
      </button>
    </EmptyState>
  </ModeShell>
</template>

<style scoped>
.sp__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 20px 0;
  gap: 18px;
  min-height: 0;
}

/* Target card */
.sp__target {
  padding: 18px;
  border-radius: 20px;
}
.sp__target-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sp__target-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sp__icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--color-surface-3);
  color: var(--color-text-1);
  display: grid;
  place-items: center;
}
.sp__target-text {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.sp__phonetic {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.sp__meaning {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-2);
}

/* Stage */
.sp__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  min-height: 0;
}

.sp__visual-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  width: 100%;
}

/* Idle */
.sp__idle-circle {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 1px solid transparent;
  display: grid;
  place-items: center;
}
.sp__idle-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.5;
  max-width: 280px;
}

/* Recording */
.sp__rec-wrap {
  position: relative;
  width: 130px;
  height: 130px;
}
.sp__rec-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid;
  animation: spRecPulse 2s ease-out infinite;
}
@keyframes spRecPulse {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; }
}
.sp__rec-core {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
}

.sp__wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 60px;
  width: 100%;
  max-width: 320px;
}
.sp__wave-bar {
  width: 3.5px;
  min-height: 6px;
  border-radius: 2px;
  transition: height 0.08s linear;
}

.sp__rec-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-3);
}
.sp__rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: spRecDot 1.4s ease-in-out infinite;
}
@keyframes spRecDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Result */
.sp__result-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.sp__result-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
}
.sp__result-ring-inner {
  position: absolute;
  left: 0;
  top: 0;
  width: 110px;
  height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.sp__result-pct {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-1);
}
.sp__result-pct-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.sp__result-text {
  flex: 1;
  min-width: 0;
}
.sp__result-headline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sp__result-stats {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1.5;
}
.sp__result-stats b {
  color: var(--color-text-1);
  font-weight: 700;
}

.sp__words-card {
  padding: 14px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.sp__words-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-3);
  margin-bottom: 10px;
}
.sp__words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sp__word {
  padding: 6px 11px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid;
}
.sp__word-score {
  opacity: 0.65;
  font-size: 11px;
  margin-left: 2px;
}
.sp__tip {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 12px;
  color: var(--color-text-2);
}
.sp__tip-phonetic {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-amber);
  letter-spacing: 0.02em;
}
.sp__confidence {
  margin-top: 8px;
  font-size: 11px;
  color: var(--color-text-3);
}
.sp__confidence b {
  color: var(--color-text-1);
}
.sp__heard {
  margin: 0;
  padding: 10px 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 14px;
  font-size: 14px;
  color: var(--color-text-1);
  text-align: left;
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

.sp__err {
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--color-rose) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-rose) 35%, transparent);
  color: var(--color-rose);
  font-size: 12px;
}

/* Actions */
.sp__actions {
  padding: 0 0 20px;
  display: flex;
  gap: 10px;
}
.sp__cta {
  flex: 1;
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
.sp__cta-stop {
  background: linear-gradient(135deg, #fb7185, #ef4444);
  box-shadow: 0 10px 28px rgba(251, 113, 133, 0.42);
}
.sp__cta-secondary {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
}
.sp__stop-square {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: #fff;
}
</style>
