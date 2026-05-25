<script setup lang="ts">
/**
 * Skill Practice — list all 28 skills (4 per Part × 7 Parts) ordered
 * weakest-first, drill 1 sample question from the chosen skill's Part.
 * (Skill-filtered question pool is future work — wire when more samples
 * exist per Part.)
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import QuestionCard from '@/components/toeic/QuestionCard.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';

interface SkillEntry {
  skill: string;
  partId: number;
  partName: string;
  color: string;
  accuracy: number;
  count: number;
}

const router = useRouter();
const toeic = useToeicStore();

const allSkills = computed<SkillEntry[]>(() => {
  const out: SkillEntry[] = [];
  for (const p of TOEIC_PARTS) {
    p.skills.forEach((s, i) => {
      const cell = toeic.skillMatrix[p.id]?.[i];
      out.push({
        skill: s,
        partId: p.id,
        partName: p.name,
        color: p.color,
        accuracy: cell?.accuracy ?? 0,
        count: cell?.count ?? 0,
      });
    });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy);
});

const selectedSkill = ref<SkillEntry | null>(null);
const answer = ref<number | null>(null);
const showExplain = ref(false);
const drillIdx = ref(0);

// Pool: prefer questions tagged with the chosen skill; fall back to all
// questions in that Part. With more sample data the tag filter will narrow
// further; for now it still cycles a varied set.
const drillPool = computed(() => {
  if (!selectedSkill.value) return [];
  const all = toeic.questionsForPart(selectedSkill.value.partId);
  const skillName = selectedSkill.value.skill.toLowerCase();
  const tagged = all.filter((q) =>
    q.tags?.some((t) => t.toLowerCase() === skillName),
  );
  return tagged.length > 0 ? tagged : all;
});
const drillQuestion = computed(() => drillPool.value[drillIdx.value % Math.max(1, drillPool.value.length)]);

function pickSkill(s: SkillEntry) {
  selectedSkill.value = s;
  answer.value = null;
  showExplain.value = false;
  drillIdx.value = 0;
}

function backToList() {
  selectedSkill.value = null;
}

function onClose() {
  router.push('/toeic');
}

function check() {
  if (answer.value == null || !drillQuestion.value || !selectedSkill.value) return;
  const correct = 'correct' in drillQuestion.value ? drillQuestion.value.correct : 0;
  toeic.recordAnswer(selectedSkill.value.partId, answer.value === correct);
  showExplain.value = true;
}

function next() {
  answer.value = null;
  showExplain.value = false;
  if (drillPool.value.length > 0) {
    drillIdx.value = (drillIdx.value + 1) % drillPool.value.length;
  }
}

function classFor(acc: number) {
  if (acc >= 0.7) return 'is-strong';
  if (acc >= 0.5) return 'is-mid';
  return 'is-weak';
}
</script>

<template>
  <ModeShell
    title="TOEIC · Skill Practice"
    :subtitle="selectedSkill ? selectedSkill.partName + ' · drill' : 'Yếu nhất trước'"
    :on-close="onClose"
  >
    <div v-if="!selectedSkill" class="tskill">
      <div class="tskill__intro">
        <div class="tskill__intro-title">Luyện theo kỹ năng</div>
        <div class="tskill__intro-sub">Sắp xếp từ yếu nhất → mạnh nhất.</div>
      </div>

      <div class="glass tskill__list">
        <div class="tskill__list-eye">{{ allSkills.length }} kỹ năng · {{ TOEIC_PARTS.length }} Part</div>
        <div class="tskill__list-body">
          <button
            v-for="(s, i) in allSkills"
            :key="i"
            class="btn tap tskill__row"
            @click="pickSkill(s)"
          >
            <div class="tskill__row-badge" :style="{
              background: `color-mix(in oklch, ${s.color} 24%, transparent)`,
              color: s.color,
            }">
              <span class="mono">P{{ s.partId }}</span>
            </div>
            <div class="tskill__row-body">
              <div class="tskill__row-name">{{ s.skill }}</div>
              <div class="tskill__row-meta"><span class="mono">{{ s.count }}</span> câu đã luyện</div>
            </div>
            <div class="tskill__row-bar">
              <div class="tskill__row-bar-track">
                <div class="tskill__row-bar-fill" :class="classFor(s.accuracy)" :style="{ width: `${Math.round(s.accuracy * 100)}%` }" />
              </div>
              <span class="mono tskill__row-acc" :class="classFor(s.accuracy)">{{ Math.round(s.accuracy * 100) }}%</span>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="tskill__drill">
      <button class="btn tap tskill__back" @click="backToList">
        <Icon name="chevron-left" :size="12" /> Đổi kỹ năng
      </button>

      <div class="tskill__drill-hero" :style="{
        background: `linear-gradient(135deg, color-mix(in oklch, ${selectedSkill.color} 16%, transparent), color-mix(in oklch, ${selectedSkill.color} 4%, transparent))`,
        borderColor: `color-mix(in oklch, ${selectedSkill.color} 28%, transparent)`,
      }">
        <div class="tskill__drill-hero-eye" :style="{ color: selectedSkill.color }">
          {{ selectedSkill.partName }} · drill
        </div>
        <div class="tskill__drill-hero-name">{{ selectedSkill.skill }}</div>
        <div class="tskill__drill-hero-meta">Mỗi drill 5 câu cùng pattern. Tự nhận diện sai sót.</div>
      </div>

      <QuestionCard
        v-if="drillQuestion"
        :key="`d-${drillIdx}`"
        :q="drillQuestion"
        :part-id="selectedSkill.partId"
        :q-index="drillIdx"
        :total="drillPool.length"
        :selected="answer"
        :show-explain="showExplain"
        @update:selected="(v) => (answer = v)"
      />
      <div v-else class="tskill__empty">
        Phần này chưa có câu mẫu. Import đề thật vào <code>src/data/toeic.ts</code>.
      </div>

      <button
        v-if="drillQuestion"
        class="btn tap tskill__cta"
        :disabled="answer == null"
        @click="showExplain ? next() : check()"
      >{{ showExplain ? 'Câu tiếp →' : 'Kiểm tra' }}</button>
    </div>
  </ModeShell>
</template>

<style scoped>
.tskill {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tskill__intro-title { font-size: 18px; font-weight: 700; }
.tskill__intro-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.tskill__list { padding: 14px; }
.tskill__list-eye {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.tskill__list-body { display: flex; flex-direction: column; gap: 4px; }

.tskill__row {
  padding: 10px 12px;
  border-radius: 12px;
  text-align: left;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  gap: 10px;
}
.tskill__row-badge {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.tskill__row-badge .mono { font-size: 9px; font-weight: 700; }
.tskill__row-body { flex: 1; min-width: 0; }
.tskill__row-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tskill__row-meta { font-size: 11px; color: var(--color-text-3); margin-top: 1px; }
.tskill__row-bar { display: flex; align-items: center; gap: 8px; }
.tskill__row-bar-track {
  width: 50px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-surface-3);
  overflow: hidden;
}
.tskill__row-bar-fill { height: 100%; }
.tskill__row-bar-fill.is-strong { background: var(--color-emerald); }
.tskill__row-bar-fill.is-mid { background: var(--color-cyan); }
.tskill__row-bar-fill.is-weak { background: var(--color-rose); }
.tskill__row-acc {
  font-size: 11px;
  font-weight: 700;
  min-width: 32px;
  text-align: right;
}
.tskill__row-acc.is-strong { color: var(--color-emerald); }
.tskill__row-acc.is-mid { color: var(--color-cyan); }
.tskill__row-acc.is-weak { color: var(--color-rose); }

/* Drill */
.tskill__drill {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tskill__back {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  color: var(--color-text-1);
}
.tskill__drill-hero {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid;
}
.tskill__drill-hero-eye {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tskill__drill-hero-name { font-size: 18px; font-weight: 700; margin-top: 4px; }
.tskill__drill-hero-meta { font-size: 11px; color: var(--color-text-3); margin-top: 4px; }

.tskill__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}
.tskill__empty code {
  font-family: var(--font-mono);
  background: var(--color-surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.tskill__cta {
  padding: 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow: 0 10px 28px rgba(34, 211, 238, 0.42);
}
.tskill__cta[disabled] {
  background: var(--color-surface-2);
  color: var(--color-text-3);
  opacity: 0.6;
  box-shadow: none;
  cursor: not-allowed;
}
</style>
