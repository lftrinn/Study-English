<script setup lang="ts">
/**
 * Part Practice — pick a Part, drill questions one-by-one with explanation.
 * `?part=N` query param skips the picker and jumps into Part N.
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import QuestionCard from '@/components/toeic/QuestionCard.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import type { TOEICPart } from '@/types/toeic';

const route = useRoute();
const router = useRouter();
const toeic = useToeicStore();

const initialPart = (() => {
  const raw = Number(route.query.part);
  return Number.isFinite(raw) && TOEIC_PARTS.find((p) => p.id === raw) ? raw : null;
})();

const selectedPartId = ref<number | null>(initialPart);
const answer = ref<number | null>(null);
const multiAnswer = ref<Array<number | null>>([]);
const showExplain = ref(false);
const qi = ref(0);

const part = computed<TOEICPart | undefined>(() =>
  selectedPartId.value ? TOEIC_PARTS.find((p) => p.id === selectedPartId.value) : undefined,
);
const partQs = computed(() => (selectedPartId.value ? toeic.questionsForPart(selectedPartId.value) : []));
const current = computed(() => partQs.value[qi.value] ?? partQs.value[0]);

const isMulti = computed(() => {
  if (!current.value) return false;
  return current.value.kind === 'cloze' || current.value.kind === 'passage';
});

const ctaEnabled = computed(() => {
  if (!current.value) return false;
  if (isMulti.value) {
    const total =
      current.value.kind === 'cloze'
        ? current.value.blanks.length
        : current.value.kind === 'passage'
          ? current.value.questions.length
          : 0;
    return multiAnswer.value.filter((v) => v != null).length === total;
  }
  return answer.value != null;
});

watch(selectedPartId, (val) => {
  // Reflect picker selection in URL so deep-link works on refresh.
  if (val == null) router.replace({ query: {} });
  else router.replace({ query: { part: String(val) } });
  answer.value = null;
  multiAnswer.value = [];
  showExplain.value = false;
  qi.value = 0;
});

function pickPart(id: number) {
  selectedPartId.value = id;
}

function checkAnswer() {
  if (!current.value || !part.value) return;
  if (isMulti.value) {
    const q = current.value;
    const subs =
      q.kind === 'cloze'
        ? q.blanks.map((b) => ({ correct: b.correct, options: b.options, explain: b.explain }))
        : q.kind === 'passage'
          ? q.questions.map((s) => ({ correct: s.correct, options: s.options, explain: s.explain }))
          : [];
    subs.forEach((s, i) => {
      const ans = multiAnswer.value[i];
      if (ans == null) return;
      const ok = ans === s.correct;
      toeic.recordAnswer(part.value!.id, ok);
      if (!ok) {
        toeic.addMistake({
          partId: part.value!.id,
          q: q.kind === 'cloze' ? `Cloze (${i + 1})` : q.kind === 'passage' ? q.questions[i].q : 'Câu hỏi',
          yourAnswer: s.options[ans] ?? '',
          correctAnswer: s.options[s.correct] ?? '',
          when: 'Vừa xong',
          explain: s.explain ?? q.explain ?? '',
          chunk: q.tags?.[0] ?? '',
        });
      }
    });
  } else {
    if (answer.value == null) return;
    const correctIdx = 'correct' in current.value ? current.value.correct : 0;
    const isCorrect = answer.value === correctIdx;
    toeic.recordAnswer(part.value.id, isCorrect);
    if (!isCorrect) {
      const correctText =
        'options' in current.value ? current.value.options[correctIdx] : '';
      const yourText =
        'options' in current.value ? current.value.options[answer.value] : '';
      toeic.addMistake({
        partId: part.value.id,
        q: 'q' in current.value ? current.value.q : 'Câu hỏi',
        yourAnswer: yourText,
        correctAnswer: correctText,
        when: 'Vừa xong',
        explain: current.value.explain ?? '',
        chunk: current.value.tags?.[0] ?? '',
      });
    }
  }
  showExplain.value = true;
}

function next() {
  answer.value = null;
  multiAnswer.value = [];
  showExplain.value = false;
  qi.value = partQs.value.length > 0 ? (qi.value + 1) % partQs.value.length : 0;
}

function backToPicker() {
  selectedPartId.value = null;
}

function onClose() {
  router.push('/toeic');
}

const skillCells = computed(() => {
  if (!part.value) return [];
  return toeic.skillMatrix[part.value.id] ?? [];
});
</script>

<template>
  <ModeShell title="TOEIC · Part Practice" :subtitle="part ? part.name + ' · ' + part.vi : 'Chọn Part'" :on-close="onClose">
    <!-- Picker -->
    <div v-if="!part" class="tpart tpart--picker">
      <div class="tpart__intro">
        <div class="tpart__intro-title">Chọn Part để luyện</div>
        <div class="tpart__intro-sub">Đề xuất Phase Foundation: Part 1, 2, 5</div>
      </div>

      <div class="tpart__picker">
        <button
          v-for="p in TOEIC_PARTS"
          :key="p.id"
          class="btn tap glass tpart__pick"
          :style="{ borderLeft: `3px solid ${p.color}` }"
          @click="pickPart(p.id)"
        >
          <div class="tpart__pick-badge" :style="{
            background: `color-mix(in oklch, ${p.color} 22%, transparent)`,
            color: p.color,
          }">
            <span class="mono">{{ p.id }}</span>
          </div>
          <div class="tpart__pick-body">
            <div class="tpart__pick-name">
              <span>{{ p.name }}</span>
              <span class="tpart__pick-vi">· {{ p.vi }}</span>
              <span v-if="p.phase === 'foundation'" class="tpart__pick-foundation">Foundation</span>
            </div>
            <div class="tpart__pick-desc">{{ p.desc }}</div>
            <div class="tpart__pick-stats">
              <span><span class="mono">{{ toeic.partStats[p.id]?.practiced ?? 0 }}</span> câu</span>
              <span :class="{
                'is-strong': (toeic.partStats[p.id]?.accuracy ?? 0) >= 0.7,
                'is-mid': (toeic.partStats[p.id]?.accuracy ?? 0) >= 0.5 && (toeic.partStats[p.id]?.accuracy ?? 0) < 0.7,
                'is-weak': (toeic.partStats[p.id]?.accuracy ?? 0) < 0.5,
              }">
                <span class="mono">{{ Math.round((toeic.partStats[p.id]?.accuracy ?? 0) * 100) }}%</span> accuracy
              </span>
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-3)' }" />
        </button>
      </div>
    </div>

    <!-- Drill -->
    <div v-else class="tpart">
      <!-- Part hero -->
      <div class="tpart__hero" :style="{
        background: `linear-gradient(135deg, color-mix(in oklch, ${part.color} 16%, transparent), color-mix(in oklch, ${part.color} 4%, transparent)), var(--color-surface-2)`,
        borderColor: `color-mix(in oklch, ${part.color} 28%, transparent)`,
      }">
        <div class="tpart__hero-badge" :style="{
          background: `color-mix(in oklch, ${part.color} 28%, transparent)`,
          color: part.color,
        }">
          <span class="mono">P{{ part.id }}</span>
        </div>
        <div class="tpart__hero-body">
          <div class="tpart__hero-eye" :style="{ color: part.color }">
            {{ part.section === 'listening' ? 'Listening' : 'Reading' }}
          </div>
          <div class="tpart__hero-name">{{ part.name }} · {{ part.vi }}</div>
          <div class="tpart__hero-meta">{{ part.count }} câu thi thật · {{ part.time }}</div>
        </div>
        <button class="btn tap tpart__hero-back" @click="backToPicker" aria-label="Đổi Part">
          <Icon name="refresh" :size="14" :style="{ color: 'var(--color-text-2)' }" />
        </button>
      </div>

      <!-- Skills row -->
      <div class="tpart__skills">
        <span v-for="(skill, i) in part.skills" :key="skill" class="tpart__skill">
          {{ skill }}
          <span
            class="mono tpart__skill-acc"
            :class="{
              'is-strong': (skillCells[i]?.accuracy ?? 0) >= 0.7,
              'is-mid': (skillCells[i]?.accuracy ?? 0) >= 0.5 && (skillCells[i]?.accuracy ?? 0) < 0.7,
              'is-weak': (skillCells[i]?.accuracy ?? 0) < 0.5,
            }"
          >{{ Math.round((skillCells[i]?.accuracy ?? 0) * 100) }}%</span>
        </span>
      </div>

      <!-- Question -->
      <QuestionCard
        v-if="current"
        :key="`q-${qi}`"
        :q="current"
        :part-id="part.id"
        :q-index="qi"
        :total="partQs.length"
        :selected="answer"
        :selected-multi="multiAnswer"
        :show-explain="showExplain"
        @update:selected="(v) => (answer = v)"
        @update:selected-multi="(v) => (multiAnswer = v)"
      />
      <div v-else class="tpart__empty">
        Phần này chưa có câu mẫu. Import đề thật vào <code>src/data/toeic.ts</code>.
      </div>

      <!-- Bottom CTA -->
      <div v-if="current" class="tpart__cta">
        <template v-if="!showExplain">
          <button class="btn tap glass tpart__cta-skip" @click="next">Bỏ qua</button>
          <button
            class="btn tap tpart__cta-primary"
            :disabled="!ctaEnabled"
            @click="checkAnswer"
          >Kiểm tra</button>
        </template>
        <button v-else class="btn tap tpart__cta-primary tpart__cta-primary--wide" @click="next">
          Câu tiếp →
        </button>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tpart {
  padding: 0 20px 100px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tpart--picker { padding: 0 20px 40px; }

.tpart__intro { margin-bottom: 4px; }
.tpart__intro-title { font-size: 18px; font-weight: 700; }
.tpart__intro-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.tpart__picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tpart__pick {
  padding: 14px;
  border-radius: 16px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tpart__pick-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.tpart__pick-badge .mono { font-size: 14px; font-weight: 700; }
.tpart__pick-body { flex: 1; min-width: 0; }
.tpart__pick-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  flex-wrap: wrap;
}
.tpart__pick-vi { font-size: 12px; color: var(--color-text-3); font-weight: 500; }
.tpart__pick-foundation {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-cyan);
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tpart__pick-desc {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
  line-height: 1.4;
}
.tpart__pick-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-text-3);
}
.is-strong { color: var(--color-emerald); }
.is-mid { color: var(--color-cyan); }
.is-weak { color: var(--color-rose); }

.tpart__hero {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 14px;
}
.tpart__hero-badge {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.tpart__hero-badge .mono { font-size: 18px; font-weight: 700; }
.tpart__hero-body { flex: 1; }
.tpart__hero-eye {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tpart__hero-name { font-size: 17px; font-weight: 700; margin-top: 2px; }
.tpart__hero-meta { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }
.tpart__hero-back {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.tpart__skills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tpart__skill {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-1);
}
.tpart__skill-acc {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface-3);
}
.tpart__skill-acc.is-strong { background: color-mix(in oklch, var(--color-emerald) 26%, transparent); }
.tpart__skill-acc.is-mid { background: color-mix(in oklch, var(--color-cyan) 26%, transparent); }
.tpart__skill-acc.is-weak { background: color-mix(in oklch, var(--color-rose) 26%, transparent); }

.tpart__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}
.tpart__empty code {
  font-family: var(--font-mono);
  background: var(--color-surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.tpart__cta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.tpart__cta-skip {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
}
.tpart__cta-primary {
  flex: 2;
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.21);
}
.tpart__cta-primary[disabled] {
  background: var(--color-surface-2);
  color: var(--color-text-3);
  opacity: 0.6;
  box-shadow: none;
  cursor: not-allowed;
}
.tpart__cta-primary--wide { flex: 1; }
</style>
