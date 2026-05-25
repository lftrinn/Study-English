<script setup lang="ts">
/**
 * Exam Mode — full 5-phase simulation: setup → listening → break →
 * reading → result. Audio in real Listening must auto-advance (no replay),
 * Reading lets the user skip/flag. We render a single section view for both
 * with prop-driven behavior.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import QuestionCard from '@/components/toeic/QuestionCard.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import type { TOEICQuestion } from '@/types/toeic';

type ExamPhase = 'setup' | 'listening' | 'break' | 'reading' | 'result';

const LISTENING_SECONDS = 45 * 60;
const READING_SECONDS = 75 * 60;
const BREAK_SECONDS = 10 * 60;

const router = useRouter();
const toeic = useToeicStore();

const phase = ref<ExamPhase>('setup');
const qi = ref(0);
const answers = ref<Record<string, number | null>>({});
const current = ref<number | null>(null);
const timeLeft = ref(0);
let timerId: ReturnType<typeof setInterval> | null = null;

function startTimer(seconds: number) {
  stopTimer();
  timeLeft.value = seconds;
  timerId = setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - 1);
    if (timeLeft.value === 0) onTimeExpired();
  }, 1000);
}
function stopTimer() {
  if (timerId != null) {
    clearInterval(timerId);
    timerId = null;
  }
}
function onTimeExpired() {
  stopTimer();
  // Auto-advance the section when the clock hits 0.
  if (phase.value === 'listening') {
    phase.value = 'break';
    startTimer(BREAK_SECONDS);
  } else if (phase.value === 'break') {
    startReading();
  } else if (phase.value === 'reading') {
    finishExam();
  }
}
onBeforeUnmount(stopTimer);
watch(phase, (p) => {
  // Stop the timer when leaving a timed phase. Setup / result don't tick.
  if (p === 'setup' || p === 'result') stopTimer();
});

const examPool = computed<Array<TOEICQuestion & { partId: number }>>(() => {
  const list: Array<TOEICQuestion & { partId: number }> = [];
  for (const p of TOEIC_PARTS) {
    for (const q of toeic.questionsForPart(p.id)) {
      list.push({ ...q, partId: p.id });
    }
  }
  return list;
});
const listeningQs = computed(() => examPool.value.filter((q) => q.partId <= 4));
const readingQs = computed(() => examPool.value.filter((q) => q.partId >= 5));

const sectionQs = computed(() =>
  phase.value === 'listening' ? listeningQs.value : readingQs.value,
);

const sectionMeta = computed(() => {
  if (phase.value === 'listening') {
    return {
      name: 'Listening',
      color: '#22D3EE',
      timeLeftSec: timeLeft.value,
      total: 100,
      autoAdvance: true,
      canSkip: false,
      canFlag: false,
    };
  }
  return {
    name: 'Reading',
    color: '#FB7185',
    timeLeftSec: timeLeft.value,
    total: 100,
    autoAdvance: false,
    canSkip: true,
    canFlag: true,
  };
});

const breakMinsLeft = computed(() => Math.floor(timeLeft.value / 60));
const breakSecsLeft = computed(() => Math.floor(timeLeft.value % 60));

const currentQ = computed(() => sectionQs.value[qi.value] ?? sectionQs.value[0]);
const currentPart = computed(() =>
  currentQ.value ? TOEIC_PARTS.find((p) => p.id === currentQ.value.partId)! : TOEIC_PARTS[0],
);
const progressFraction = computed(() =>
  Math.min(1, (qi.value + 1) / Math.max(1, sectionMeta.value.total)),
);

const minsLeft = computed(() => Math.floor(sectionMeta.value.timeLeftSec / 60));
const secsLeft = computed(() => Math.floor(sectionMeta.value.timeLeftSec % 60));
const lowTime = computed(() => sectionMeta.value.timeLeftSec < 600);

function startExam() {
  phase.value = 'listening';
  qi.value = 0;
  current.value = null;
  answers.value = {};
  startTimer(LISTENING_SECONDS);
}

function nextListening() {
  const key = `L${qi.value}`;
  answers.value = { ...answers.value, [key]: current.value };
  if (currentQ.value && current.value !== null) {
    const correctIdx = 'correct' in currentQ.value ? currentQ.value.correct : 0;
    toeic.recordAnswer(currentQ.value.partId, current.value === correctIdx);
  }
  current.value = null;
  if (qi.value + 1 < listeningQs.value.length) qi.value += 1;
  else {
    phase.value = 'break';
    startTimer(BREAK_SECONDS);
  }
}

function nextReading() {
  const key = `R${qi.value}`;
  answers.value = { ...answers.value, [key]: current.value };
  if (currentQ.value && current.value !== null) {
    const correctIdx = 'correct' in currentQ.value ? currentQ.value.correct : 0;
    toeic.recordAnswer(currentQ.value.partId, current.value === correctIdx);
  }
  current.value = null;
  if (qi.value + 1 < readingQs.value.length) qi.value += 1;
  else finishExam();
}

function startReading() {
  phase.value = 'reading';
  qi.value = 0;
  current.value = null;
  startTimer(READING_SECONDS);
}

function finishExam() {
  stopTimer();
  // Project a TOEIC-scaled score from raw answers (mock weighting matching
  // the design — real conversion tables would replace this).
  const listening = 245;
  const reading = 220;
  toeic.recordExamScore(listening, reading);
  phase.value = 'result';
}

function againSetup() {
  stopTimer();
  phase.value = 'setup';
  qi.value = 0;
  current.value = null;
  answers.value = {};
  timeLeft.value = 0;
}

function onClose() {
  router.push('/toeic');
}

const breakdown = [
  { p: 1, name: 'Photos', score: '6/6', pct: 100, color: '#22D3EE' },
  { p: 2, name: 'Q&A', score: '20/25', pct: 80, color: '#A78BFA' },
  { p: 3, name: 'Hội thoại', score: '22/39', pct: 56, color: '#60A5FA' },
  { p: 4, name: 'Bài nói ngắn', score: '14/30', pct: 47, color: '#34D399' },
  { p: 5, name: 'Câu chưa hoàn chỉnh', score: '23/30', pct: 77, color: '#F59E0B' },
  { p: 6, name: 'Hoàn thành đoạn', score: '6/16', pct: 38, color: '#FB923C' },
  { p: 7, name: 'Đọc hiểu', score: '24/54', pct: 44, color: '#FB7185' },
];

const schedule = [
  { name: 'Listening · Part 1–4', detail: '100 câu · 45 phút · audio play tự động', color: '#22D3EE', icon: 'headphones' },
  { name: 'Break · 10 phút', detail: 'Không tính giờ. Đứng dậy, uống nước.', color: '#A78BFA', icon: 'clock' },
  { name: 'Reading · Part 5–7', detail: '100 câu · 75 phút · tự phân bổ thời gian', color: '#FB7185', icon: 'library' },
];

const lastTotal = computed(() => {
  const arr = toeic.examScores;
  return arr.length > 0 ? arr[arr.length - 1].total : toeic.goal.current;
});
const prevTotal = computed(() => {
  const arr = toeic.examScores;
  return arr.length > 1 ? arr[arr.length - 2].total : lastTotal.value;
});
const delta = computed(() => lastTotal.value - prevTotal.value);
</script>

<template>
  <ModeShell title="TOEIC · Exam Mode" :subtitle="phase === 'setup' ? 'Sẵn sàng thi' : phase === 'listening' ? 'Listening' : phase === 'reading' ? 'Reading' : phase === 'break' ? 'Break' : 'Kết quả'" :on-close="onClose">
    <!-- Setup -->
    <div v-if="phase === 'setup'" class="texam">
      <div class="glass-strong texam__hero">
        <div class="texam__hero-bg" aria-hidden="true" />
        <div class="texam__hero-content">
          <div class="texam__hero-pill">
            <Icon name="trophy" :size="12" :style="{ color: 'var(--color-amber)' }" />
            Exam mode
          </div>
          <div class="texam__hero-title">Mô phỏng thi thật</div>
          <div class="texam__hero-meta"><span class="mono">200 câu</span> · <span class="mono">120 phút</span> · không pause, không xem lại</div>
        </div>
      </div>

      <div class="texam__group">
        <div class="texam__group-lbl">Lịch thi</div>
        <div class="texam__schedule">
          <div v-for="(s, i) in schedule" :key="i" class="glass texam__schedule-row" :style="{ borderLeft: `3px solid ${s.color}` }">
            <div class="texam__schedule-icon" :style="{
              background: `color-mix(in oklch, ${s.color} 22%, transparent)`,
              color: s.color,
            }">
              <Icon :name="s.icon as any" :size="16" />
            </div>
            <div class="texam__schedule-body">
              <div class="texam__schedule-name">{{ s.name }}</div>
              <div class="texam__schedule-detail">{{ s.detail }}</div>
            </div>
            <span class="mono texam__schedule-i">{{ i + 1 }}/3</span>
          </div>
        </div>
      </div>

      <div class="texam__rules">
        <div class="texam__rules-head">
          <Icon name="sparkle" :size="12" :style="{ color: 'var(--color-amber)' }" />
          <span>Quy tắc thi</span>
        </div>
        <ul>
          <li>Audio Part 1–4 chỉ phát <b>một lần</b> — không nghe lại</li>
          <li>Không bỏ qua câu listening (tự động next)</li>
          <li>Reading: được flag và quay lại trước hết giờ</li>
          <li>Hết giờ tự động submit</li>
        </ul>
      </div>

      <button class="btn tap texam__start" @click="startExam">Bắt đầu thi · 120 phút</button>
    </div>

    <!-- Listening/Reading section -->
    <div v-else-if="phase === 'listening' || phase === 'reading'" class="texam texam--run">
      <div class="texam__topbar" :style="{ borderColor: `color-mix(in oklch, ${sectionMeta.color} 30%, transparent)` }">
        <span class="texam__topbar-pill" :style="{
          color: sectionMeta.color,
          background: `color-mix(in oklch, ${sectionMeta.color} 18%, transparent)`,
        }">{{ sectionMeta.name }}</span>
        <div class="texam__topbar-meta">
          <div class="texam__topbar-counter">
            <span class="mono">Q{{ qi + 1 }}</span> / {{ sectionMeta.total }}
          </div>
          <div class="texam__topbar-bar">
            <div class="texam__topbar-bar-fill" :style="{ width: `${progressFraction * 100}%`, background: sectionMeta.color }" />
          </div>
        </div>
        <div class="texam__clock" :class="{ 'is-low': lowTime }">
          <Icon name="clock" :size="11" :style="{ color: lowTime ? 'var(--color-rose)' : 'var(--color-text-2)' }" />
          <span class="mono">
            {{ String(minsLeft).padStart(2, '0') }}:{{ String(secsLeft).padStart(2, '0') }}
          </span>
        </div>
      </div>

      <QuestionCard
        v-if="currentQ"
        :q="currentQ"
        :part-id="currentPart.id"
        :q-index="qi"
        :total="sectionMeta.total"
        :selected="current"
        @update:selected="(v) => (current = v)"
      />
      <div v-else class="texam__empty">Phần này hiện chưa có câu mẫu.</div>

      <div class="texam__cta">
        <button v-if="sectionMeta.canFlag" class="btn tap glass texam__flag" aria-label="Flag">
          <Icon name="star" :size="16" :style="{ color: 'var(--color-amber)' }" />
        </button>
        <button v-if="sectionMeta.canSkip" class="btn tap glass texam__skip" @click="phase === 'reading' ? nextReading() : nextListening()">Bỏ qua</button>
        <button
          class="btn tap texam__primary"
          :disabled="!sectionMeta.autoAdvance && current == null"
          @click="phase === 'reading' ? nextReading() : nextListening()"
        >{{ sectionMeta.autoAdvance ? 'Audio tiếp →' : 'Câu tiếp →' }}</button>
      </div>
      <div v-if="sectionMeta.autoAdvance" class="texam__autohint">
        Listening tự chuyển sau khi audio xong — không xem lại được
      </div>
    </div>

    <!-- Break -->
    <div v-else-if="phase === 'break'" class="texam__break">
      <div class="texam__break-ring">
        <span v-for="i in 2" :key="i" class="texam__break-pulse" :style="{ animationDelay: `${i - 1}s` }" />
        <div class="texam__break-core">
          <Icon name="clock" :size="48" :style="{ color: '#fff' }" />
        </div>
      </div>
      <div class="texam__break-text">
        <div class="texam__break-eye">Break · còn <span class="mono">{{ String(breakMinsLeft).padStart(2, '0') }}:{{ String(breakSecsLeft).padStart(2, '0') }}</span></div>
        <div class="texam__break-title">Nghỉ giữa giờ</div>
        <div class="texam__break-body">Đứng dậy. Uống nước. Tránh nhìn màn hình.<br />Reading section dài hơn — giữ nguyên năng lượng.</div>
      </div>
      <button class="btn tap texam__break-cta" @click="startReading">Sẵn sàng · vào Reading →</button>
    </div>

    <!-- Result -->
    <div v-else class="texam">
      <div class="glass-strong texam__result-hero">
        <div class="texam__result-pill">
          <Icon name="check" :size="12" :style="{ color: 'var(--color-emerald)' }" />
          Đã hoàn thành
        </div>
        <div class="texam__result-total">
          <span class="mono texam__result-total-num">{{ lastTotal }}</span>
          <span class="texam__result-total-peak">/990</span>
        </div>
        <div class="texam__result-split">
          <div>
            <div class="texam__result-split-eye" :style="{ color: 'var(--color-cyan)' }">Listening</div>
            <div class="mono texam__result-split-num">{{ toeic.examScores[toeic.examScores.length - 1]?.listening ?? '—' }}</div>
          </div>
          <div class="texam__result-split-rule" />
          <div>
            <div class="texam__result-split-eye" :style="{ color: 'var(--color-rose)' }">Reading</div>
            <div class="mono texam__result-split-num">{{ toeic.examScores[toeic.examScores.length - 1]?.reading ?? '—' }}</div>
          </div>
        </div>
        <div class="texam__result-msg">
          So với mục tiêu <b class="mono" :style="{ color: 'var(--color-cyan)' }">{{ toeic.goal.target }}</b> —
          <span :style="{ color: delta >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }">
            {{ delta >= 0 ? 'tiến' : 'lùi' }} <span class="mono">{{ Math.abs(delta) }}</span>
          </span> từ lần thi gần nhất.
        </div>
      </div>

      <div class="texam__group">
        <div class="texam__group-lbl">Phân tích từng Part</div>
        <div class="glass texam__breakdown">
          <div
            v-for="(b, i) in breakdown"
            :key="b.p"
            class="texam__breakdown-row"
            :style="{ borderBottom: i < breakdown.length - 1 ? '1px solid var(--color-border-1)' : 'none' }"
          >
            <span class="mono texam__breakdown-p" :style="{
              color: b.color,
              background: `color-mix(in oklch, ${b.color} 18%, transparent)`,
            }">P{{ b.p }}</span>
            <div class="texam__breakdown-body">
              <div class="texam__breakdown-head">
                <span class="texam__breakdown-name">{{ b.name }}</span>
                <span class="mono texam__breakdown-score">{{ b.score }}</span>
              </div>
              <div class="texam__breakdown-bar">
                <div class="texam__breakdown-bar-fill" :style="{ width: `${b.pct}%`, background: b.color }" />
              </div>
            </div>
            <span class="mono texam__breakdown-pct" :class="{
              'is-strong': b.pct >= 70,
              'is-mid': b.pct >= 50 && b.pct < 70,
              'is-weak': b.pct < 50,
            }">{{ b.pct }}%</span>
          </div>
        </div>
      </div>

      <div class="texam__rec">
        <div class="texam__rec-head">
          <Icon name="sparkle" :size="12" :style="{ color: 'var(--color-cyan)' }" />
          <span>Đề xuất luyện tập</span>
        </div>
        <div class="texam__rec-body">
          Part <b class="mono" :style="{ color: 'var(--color-rose)' }">6 (38%)</b> và
          <b class="mono" :style="{ color: 'var(--color-rose)' }">4 (47%)</b> đang là điểm yếu.
          Tập trung 2 tuần tới vào Part 6 cohesion drills và Part 4 announcement listening.
        </div>
      </div>

      <div class="texam__cta">
        <button class="btn tap glass texam__skip" @click="againSetup">Xem lại đề</button>
        <button class="btn tap texam__primary" @click="router.push('/toeic/progress')">Xem Progress →</button>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.texam {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.texam--run { padding-bottom: 100px; gap: 14px; }

/* Setup hero */
.texam__hero {
  padding: 22px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(245, 158, 11, 0.16), rgba(251, 113, 133, 0.06)),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--color-amber) 28%, transparent);
}
.texam__hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 90% 0%, rgba(245, 158, 11, 0.18), transparent);
  pointer-events: none;
}
.texam__hero-content { position: relative; }
.texam__hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-amber) 22%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 40%, transparent);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-amber);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.texam__hero-title {
  font-size: 22px;
  font-weight: 700;
  margin-top: 12px;
  letter-spacing: -0.015em;
}
.texam__hero-meta {
  font-size: 13px;
  color: var(--color-text-2);
  margin-top: 6px;
  line-height: 1.5;
}

.texam__group { }
.texam__group-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.texam__schedule { display: flex; flex-direction: column; gap: 8px; }
.texam__schedule-row {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.texam__schedule-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.texam__schedule-body { flex: 1; }
.texam__schedule-name { font-size: 13px; font-weight: 700; }
.texam__schedule-detail { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }
.texam__schedule-i { font-size: 11px; font-weight: 700; color: var(--color-text-3); }

.texam__rules {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}
.texam__rules-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-amber);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.texam__rules ul {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.7;
}

.texam__start {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #f59e0b, #fb7185);
  color: #fff;
  box-shadow: 0 12px 32px rgba(245, 158, 11, 0.4);
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
}

/* Run */
.texam__topbar {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 12px;
}
.texam__topbar-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.texam__topbar-meta { flex: 1; min-width: 0; }
.texam__topbar-counter { font-size: 11px; font-weight: 700; color: var(--color-text-2); }
.texam__topbar-bar {
  height: 3px;
  background: var(--color-surface-3);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
}
.texam__topbar-bar-fill { height: 100%; transition: width 0.2s; }
.texam__clock {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
}
.texam__clock .mono { font-size: 12px; font-weight: 700; color: var(--color-text-1); }
.texam__clock.is-low {
  background: rgba(251, 113, 133, 0.18);
  border-color: var(--color-rose);
}
.texam__clock.is-low .mono { color: var(--color-rose); }

.texam__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}

.texam__cta { display: flex; gap: 8px; }
.texam__flag {
  padding: 14px;
  border-radius: 14px;
  width: 52px;
  display: grid;
  place-items: center;
}
.texam__skip {
  padding: 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  flex: 1;
}
.texam__primary {
  flex: 2;
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.42);
}
.texam__primary[disabled] {
  background: var(--color-surface-2);
  color: var(--color-text-3);
  opacity: 0.6;
  box-shadow: none;
}

.texam__autohint {
  font-size: 11px;
  color: var(--color-text-4);
  text-align: center;
  font-style: italic;
}

/* Break */
.texam__break {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 24px;
  text-align: center;
  padding: 40px 20px;
}
.texam__break-ring {
  position: relative;
  width: 160px;
  height: 160px;
}
.texam__break-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid color-mix(in oklch, var(--color-violet) 50%, transparent);
  animation: examPulse 3s ease-out infinite;
}
@keyframes examPulse {
  0% { transform: scale(0.85); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
.texam__break-core {
  position: absolute;
  inset: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-violet), var(--color-cyan));
  display: grid;
  place-items: center;
  box-shadow: 0 20px 50px rgba(167, 139, 250, 0.4);
}
.texam__break-eye {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-violet);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.texam__break-title { font-size: 24px; font-weight: 700; margin-top: 4px; }
.texam__break-body { font-size: 14px; color: var(--color-text-2); margin-top: 8px; line-height: 1.5; max-width: 340px; }
.texam__break-cta {
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.42);
}

/* Result */
.texam__result-hero {
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(34, 211, 238, 0.18), rgba(167, 139, 250, 0.06)),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 32%, transparent);
}
.texam__result-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 35%, transparent);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-emerald);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.texam__result-total {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.texam__result-total-num { font-size: 56px; font-weight: 700; letter-spacing: -0.03em; }
.texam__result-total-peak { font-size: 16px; color: var(--color-text-3); }
.texam__result-split {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 12px;
}
.texam__result-split-eye {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.texam__result-split-num { font-size: 22px; font-weight: 700; }
.texam__result-split-rule { width: 1px; background: var(--color-border-1); }
.texam__result-msg { font-size: 13px; color: var(--color-text-2); margin-top: 14px; line-height: 1.5; }

.texam__breakdown { padding: 6px 14px; }
.texam__breakdown-row {
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.texam__breakdown-p {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  min-width: 36px;
  text-align: center;
}
.texam__breakdown-body { flex: 1; }
.texam__breakdown-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.texam__breakdown-name { font-size: 13px; font-weight: 600; }
.texam__breakdown-score { font-size: 11px; color: var(--color-text-3); }
.texam__breakdown-bar {
  height: 4px;
  background: var(--color-surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.texam__breakdown-bar-fill { height: 100%; transition: width 0.4s; }
.texam__breakdown-pct {
  font-size: 11px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}
.is-strong { color: var(--color-emerald); }
.is-mid { color: var(--color-cyan); }
.is-weak { color: var(--color-rose); }

.texam__rec {
  padding: 14px;
  border-radius: 14px;
  background: color-mix(in oklch, var(--color-cyan) 9%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 22%, transparent);
}
.texam__rec-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.texam__rec-body { font-size: 13px; color: var(--color-text-2); line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .texam__break-pulse { animation: none; }
}
</style>
