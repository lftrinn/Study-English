<script setup lang="ts">
/**
 * Mini Test — pick count + parts, drill through, show per-question result.
 * Tracks answers in local state; commits accuracy + mistakes to toeicStore.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import ProgressRing from '@/components/common/ProgressRing.vue';
import QuestionCard from '@/components/toeic/QuestionCard.vue';
import { TOEIC_PARTS, TOEIC_QUESTIONS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import type { TOEICQuestion } from '@/types/toeic';

type Phase = 'setup' | 'run' | 'result';

const router = useRouter();
const toeic = useToeicStore();

const phase = ref<Phase>('setup');
const count = ref<5 | 10 | 20>(10);
const parts = ref<number[]>([1, 2, 5]);
const qi = ref(0);
const answers = ref<Record<number, number | null>>({});
const multiAnswers = ref<Record<number, Array<number | null>>>({});
const current = ref<number | null>(null);
const currentMulti = ref<Array<number | null>>([]);

const questions = computed<Array<TOEICQuestion & { partId: number }>>(() => {
  const list: Array<TOEICQuestion & { partId: number }> = [];
  for (const p of parts.value) {
    for (const q of TOEIC_QUESTIONS[p] ?? []) {
      list.push({ ...q, partId: p });
    }
  }
  return list.slice(0, count.value);
});

function togglePart(id: number) {
  parts.value = parts.value.includes(id)
    ? parts.value.filter((x) => x !== id)
    : [...parts.value, id];
}

function presetFoundation() {
  parts.value = [1, 2, 5];
}

function isMultiQuestion(q: TOEICQuestion): boolean {
  return q.kind === 'cloze' || q.kind === 'passage';
}

function start() {
  qi.value = 0;
  answers.value = {};
  multiAnswers.value = {};
  current.value = null;
  currentMulti.value = [];
  phase.value = 'run';
}

function commit(skip = false) {
  const q = questions.value[qi.value];
  if (!q) return;

  if (isMultiQuestion(q)) {
    const picks = skip ? [] : [...currentMulti.value];
    multiAnswers.value = { ...multiAnswers.value, [qi.value]: picks };
    // Record per-sub-answer accuracy + create mistakes for wrong ones.
    if (!skip) {
      const subs =
        q.kind === 'cloze'
          ? q.blanks.map((b) => ({ correct: b.correct, options: b.options, explain: b.explain }))
          : q.kind === 'passage'
            ? q.questions.map((s) => ({ correct: s.correct, options: s.options, explain: s.explain }))
            : [];
      subs.forEach((s, i) => {
        const ans = picks[i];
        if (ans == null) return;
        const ok = ans === s.correct;
        toeic.recordAnswer(q.partId, ok);
        if (!ok) {
          toeic.addMistake({
            partId: q.partId,
            q: q.kind === 'cloze' ? `Cloze (${i + 1})` : q.questions[i].q,
            yourAnswer: s.options[ans] ?? '',
            correctAnswer: s.options[s.correct] ?? '',
            when: 'Mini Test vừa rồi',
            explain: s.explain ?? q.explain ?? '',
            chunk: q.tags?.[0] ?? '',
          });
        }
      });
    }
  } else {
    const ans = skip ? null : current.value;
    answers.value = { ...answers.value, [qi.value]: ans };

    if (ans !== null) {
      const correctIdx = 'correct' in q ? q.correct : 0;
      const isCorrect = ans === correctIdx;
      toeic.recordAnswer(q.partId, isCorrect);
      if (!isCorrect) {
        const correctText = 'options' in q ? q.options[correctIdx] : '';
        const yourText = 'options' in q ? q.options[ans] : '';
        toeic.addMistake({
          partId: q.partId,
          q: 'q' in q ? q.q : 'Câu hỏi',
          yourAnswer: yourText,
          correctAnswer: correctText,
          when: 'Mini Test vừa rồi',
          explain: q.explain ?? '',
          chunk: q.tags?.[0] ?? '',
        });
      }
    }
  }

  current.value = null;
  currentMulti.value = [];
  if (qi.value + 1 < questions.value.length) qi.value += 1;
  else phase.value = 'result';
}

const correctCount = computed(() =>
  questions.value.reduce((acc, q, i) => {
    if (isMultiQuestion(q)) {
      const picks = multiAnswers.value[i] ?? [];
      const subs =
        q.kind === 'cloze'
          ? q.blanks.map((b) => b.correct)
          : q.kind === 'passage'
            ? q.questions.map((s) => s.correct)
            : [];
      // Each sub-question scores independently; reduce sum of correct picks
      // across the whole question.
      const subCorrect = subs.reduce(
        (sum, c, idx) => sum + (picks[idx] === c ? 1 : 0),
        0,
      );
      return acc + subCorrect / Math.max(1, subs.length);
    }
    const correctIdx = 'correct' in q ? q.correct : 0;
    return acc + (answers.value[i] === correctIdx ? 1 : 0);
  }, 0),
);
const pct = computed(() =>
  questions.value.length === 0 ? 0 : Math.round((correctCount.value / questions.value.length) * 100),
);
const resultMessage = computed(() =>
  pct.value >= 80
    ? 'Excellent! Sẵn sàng cho Part khó hơn.'
    : pct.value >= 60
      ? 'Khá ổn — tiếp tục giữ nhịp.'
      : 'Còn rớt nhiều — review giải thích kỹ nhé.',
);

function againSetup() {
  phase.value = 'setup';
  answers.value = {};
  multiAnswers.value = {};
  current.value = null;
  currentMulti.value = [];
  qi.value = 0;
}

function onClose() {
  router.push('/toeic');
}

function getRow(i: number) {
  const q = questions.value[i];
  const part = TOEIC_PARTS.find((p) => p.id === q.partId)!;
  let ok = false;
  let skipped = false;
  if (isMultiQuestion(q)) {
    const picks = multiAnswers.value[i] ?? [];
    const subs =
      q.kind === 'cloze'
        ? q.blanks.map((b) => b.correct)
        : q.kind === 'passage'
          ? q.questions.map((s) => s.correct)
          : [];
    skipped = picks.length === 0;
    ok = !skipped && subs.every((c, idx) => picks[idx] === c);
  } else {
    const correctIdx = 'correct' in q ? q.correct : 0;
    const ans = answers.value[i];
    skipped = ans == null;
    ok = ans === correctIdx;
  }
  const preview =
    'q' in q ? q.q : 'options' in q ? q.options[0] : 'passage' in q ? q.passage.slice(0, 40) : '';
  return { part, ok, skipped, preview };
}

const ctaEnabled = computed(() => {
  const q = questions.value[qi.value];
  if (!q) return false;
  if (isMultiQuestion(q)) {
    const total = q.kind === 'cloze' ? q.blanks.length : q.kind === 'passage' ? q.questions.length : 0;
    return currentMulti.value.filter((v) => v != null).length === total;
  }
  return current.value != null;
});
</script>

<template>
  <ModeShell title="TOEIC · Mini Test" :subtitle="phase === 'setup' ? 'Cấu hình' : phase === 'run' ? 'Đang luyện' : 'Kết quả'" :on-close="onClose">
    <!-- Setup -->
    <div v-if="phase === 'setup'" class="tmini">
      <div class="tmini__intro">
        <div class="tmini__intro-title">Cấu hình Mini Test</div>
        <div class="tmini__intro-sub">Chọn nhanh – luyện ngắn – nhận kết quả tức thì</div>
      </div>

      <div class="tmini__group">
        <div class="tmini__group-lbl">Số câu</div>
        <div class="tmini__count-row">
          <button
            v-for="n in [5, 10, 20] as const"
            :key="n"
            class="btn tap tmini__count"
            :class="{ 'is-on': count === n }"
            @click="count = n"
          >{{ n }}</button>
        </div>
        <div class="tmini__group-hint">~{{ Math.round(count * 0.6) }} phút</div>
      </div>

      <div class="tmini__group">
        <div class="tmini__group-head">
          <div class="tmini__group-lbl">Part luyện</div>
          <button class="btn tap tmini__group-action" @click="presetFoundation">Foundation only</button>
        </div>
        <div class="tmini__parts">
          <button
            v-for="p in TOEIC_PARTS"
            :key="p.id"
            class="btn tap tmini__part"
            :class="{ 'is-on': parts.includes(p.id) }"
            :style="parts.includes(p.id) ? {
              background: `color-mix(in oklch, ${p.color} 14%, transparent)`,
              borderColor: `color-mix(in oklch, ${p.color} 45%, transparent)`,
              color: p.color,
            } : {}"
            @click="togglePart(p.id)"
          >
            <span class="mono tmini__part-id">P{{ p.id }}</span>
            <span class="tmini__part-name">{{ p.vi }}</span>
            <Icon v-if="parts.includes(p.id)" name="check" :size="14" :style="{ color: p.color }" />
          </button>
        </div>
      </div>

      <button class="btn tap tmini__start" :disabled="parts.length === 0 || questions.length === 0" @click="start">
        Bắt đầu · {{ Math.min(count, questions.length) }} câu →
      </button>
      <div v-if="parts.length > 0 && questions.length < count" class="tmini__warn">
        Pool hiện chỉ có {{ questions.length }} câu mẫu cho lựa chọn này. Import đề thật để tăng pool.
      </div>
    </div>

    <!-- Run -->
    <div v-else-if="phase === 'run'" class="tmini tmini--run">
      <div class="tmini__progress">
        <div class="tmini__progress-head">
          <span class="tmini__progress-eye">
            Câu <span class="mono">{{ qi + 1 }}</span> / {{ questions.length }}
          </span>
          <span class="mono tmini__progress-clock">02:43</span>
        </div>
        <ProgressBar :value="qi + 1" :max="questions.length" :height="4" />
      </div>

      <QuestionCard
        :key="`q-${qi}`"
        :q="questions[qi]"
        :part-id="questions[qi].partId"
        :q-index="qi"
        :total="questions.length"
        :selected="current"
        :selected-multi="currentMulti"
        @update:selected="(v) => (current = v)"
        @update:selected-multi="(v) => (currentMulti = v)"
      />

      <div class="tmini__cta">
        <button class="btn tap glass tmini__cta-skip" @click="commit(true)">Bỏ qua</button>
        <button class="btn tap tmini__cta-primary" :disabled="!ctaEnabled" @click="commit(false)">
          {{ qi + 1 < questions.length ? 'Câu tiếp →' : 'Hoàn thành' }}
        </button>
      </div>
    </div>

    <!-- Result -->
    <div v-else class="tmini">
      <div class="glass-strong tmini__result-hero">
        <ProgressRing
          :value="pct / 100"
          :size="120"
          :stroke="9"
          :color="pct >= 70 ? '#34D399' : pct >= 50 ? '#22D3EE' : '#FB7185'"
          :show-label="false"
        >
          <div class="tmini__result-ring-inner">
            <span class="mono tmini__result-ring-num">{{ pct }}<span class="tmini__result-ring-pct">%</span></span>
            <div class="tmini__result-ring-eye">Accuracy</div>
          </div>
        </ProgressRing>
        <div class="tmini__result-headline grad-text">{{ Math.round(correctCount * 10) / 10 }}/{{ questions.length }} đúng</div>
        <div class="tmini__result-msg">{{ resultMessage }}</div>
      </div>

      <div class="tmini__result-rows">
        <div
          v-for="(_, i) in questions"
          :key="i"
          class="glass tmini__result-row"
          :style="{ borderLeft: `3px solid ${
            getRow(i).ok ? 'var(--color-emerald)' : getRow(i).skipped ? 'var(--color-text-4)' : 'var(--color-rose)'
          }` }"
        >
          <span class="mono tmini__result-row-i">{{ i + 1 }}</span>
          <span class="mono tmini__result-row-p" :style="{
            color: getRow(i).part.color,
            background: `color-mix(in oklch, ${getRow(i).part.color} 18%, transparent)`,
          }">P{{ getRow(i).part.id }}</span>
          <span class="tmini__result-row-text">{{ getRow(i).preview }}</span>
          <Icon v-if="getRow(i).ok" name="check" :size="14" :style="{ color: 'var(--color-emerald)' }" />
          <Icon v-else-if="!getRow(i).skipped" name="x" :size="14" :style="{ color: 'var(--color-rose)' }" />
          <span v-else class="tmini__result-row-skip">skipped</span>
        </div>
      </div>

      <div class="tmini__result-actions">
        <button class="btn tap glass tmini__cta-skip" @click="againSetup">Test lại</button>
        <button class="btn tap tmini__cta-primary" @click="router.push('/toeic/mistakes')">Ôn lại lỗi sai</button>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tmini {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tmini--run { padding-bottom: 100px; }

.tmini__intro-title { font-size: 18px; font-weight: 700; }
.tmini__intro-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.tmini__group { }
.tmini__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.tmini__group-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.tmini__group-action {
  font-size: 11px;
  color: var(--color-cyan);
  font-weight: 600;
}
.tmini__group-hint { font-size: 11px; color: var(--color-text-3); margin-top: 6px; }

.tmini__count-row { display: flex; gap: 8px; }
.tmini__count {
  flex: 1;
  padding: 14px 0;
  border-radius: 12px;
  font-family: var(--font-mono);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 18px;
  font-weight: 700;
}
.tmini__count.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

.tmini__parts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.tmini__part {
  padding: 12px 10px;
  border-radius: 12px;
  text-align: left;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-2);
}
.tmini__part-id { font-size: 11px; font-weight: 700; flex-shrink: 0; color: var(--color-text-3); }
.tmini__part.is-on .tmini__part-id { color: inherit; }
.tmini__part-name { font-size: 12px; font-weight: 600; flex: 1; }

.tmini__start {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.42);
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
}
.tmini__start[disabled] {
  background: var(--color-surface-2);
  color: var(--color-text-3);
  opacity: 0.6;
  box-shadow: none;
}
.tmini__warn {
  font-size: 11px;
  color: var(--color-amber);
  text-align: center;
}

.tmini__progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.tmini__progress-eye {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tmini__progress-clock { font-size: 11px; color: var(--color-text-3); }

.tmini__cta { display: flex; gap: 8px; }
.tmini__cta-skip {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
}
.tmini__cta-primary {
  flex: 2;
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.42);
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
}
.tmini__cta-primary[disabled] {
  background: var(--color-surface-2);
  color: var(--color-text-3);
  opacity: 0.6;
  box-shadow: none;
}

/* Result */
.tmini__result-hero {
  padding: 22px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(52, 211, 153, 0.16), rgba(34, 211, 238, 0.06)),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 28%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.tmini__result-ring-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.tmini__result-ring-num { font-size: 30px; font-weight: 700; line-height: 1; }
.tmini__result-ring-pct { font-size: 14px; color: var(--color-text-3); }
.tmini__result-ring-eye {
  font-size: 9px;
  color: var(--color-text-3);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tmini__result-headline { font-size: 20px; font-weight: 700; }
.tmini__result-msg { font-size: 13px; color: var(--color-text-2); }

.tmini__result-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tmini__result-row {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.tmini__result-row-i { font-size: 11px; color: var(--color-text-3); width: 24px; }
.tmini__result-row-p {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}
.tmini__result-row-text {
  flex: 1;
  font-size: 12px;
  color: var(--color-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tmini__result-row-skip {
  font-size: 10px;
  color: var(--color-text-4);
}

.tmini__result-actions { display: flex; gap: 8px; }
.tmini__result-actions .tmini__cta-skip,
.tmini__result-actions .tmini__cta-primary {
  flex: 1;
}
</style>
