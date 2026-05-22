<script setup lang="ts">
/**
 * Mistake Notebook — Quizlet-style flip card stack. Tap card to flip,
 * "Ôn lại" increments review count, "Đã nắm" removes the entry.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';

type FilterKey = 'all' | 'listening' | 'reading';

const router = useRouter();
const toeic = useToeicStore();

const filter = ref<FilterKey>('all');
const idx = ref(0);
const flipped = ref(false);

const filtered = computed(() => {
  if (filter.value === 'listening') return toeic.mistakes.filter((m) => m.partId <= 4);
  if (filter.value === 'reading') return toeic.mistakes.filter((m) => m.partId >= 5);
  return toeic.mistakes;
});
const total = computed(() => filtered.value.length);
const item = computed(() => filtered.value[idx.value]);
const part = computed(() =>
  item.value ? TOEIC_PARTS.find((p) => p.id === item.value.partId)! : TOEIC_PARTS[0],
);

const counts = computed(() => ({
  all: toeic.mistakes.length,
  listening: toeic.mistakes.filter((m) => m.partId <= 4).length,
  reading: toeic.mistakes.filter((m) => m.partId >= 5).length,
}));

function setFilter(k: FilterKey) {
  filter.value = k;
  idx.value = 0;
  flipped.value = false;
}

function advance() {
  flipped.value = false;
  // Stay in place when list shrinks past current idx
  setTimeout(() => {
    if (idx.value >= total.value) idx.value = 0;
  }, 100);
}

function markReview() {
  if (!item.value) return;
  toeic.markMistakeReviewed(item.value.id);
  setTimeout(() => {
    idx.value = total.value > 0 ? (idx.value + 1) % total.value : 0;
    flipped.value = false;
  }, 120);
}

function markMastered() {
  if (!item.value) return;
  toeic.deleteMistake(item.value.id);
  advance();
}

function onClose() {
  router.push('/toeic');
}
</script>

<template>
  <ModeShell title="TOEIC · Mistake Notebook" subtitle="Quizlet-style review" :on-close="onClose">
    <div class="tmis">
      <div class="tmis__filter">
        <button
          v-for="opt in [{ k: 'all', l: 'Tất cả' }, { k: 'listening', l: 'Listening' }, { k: 'reading', l: 'Reading' }] as const"
          :key="opt.k"
          class="btn tap tmis__filter-btn"
          :class="{ 'is-on': filter === opt.k }"
          @click="setFilter(opt.k)"
        >
          {{ opt.l }} <span class="mono tmis__filter-count">{{ counts[opt.k] }}</span>
        </button>
      </div>

      <template v-if="item">
        <div class="tmis__head">
          <span class="tmis__head-eye">
            Lỗi <span class="mono">{{ idx + 1 }}</span> / {{ total }}
          </span>
          <span class="tmis__head-when">
            <Icon name="clock" :size="11" :style="{ color: 'var(--color-text-3)' }" />
            {{ item.when }}
          </span>
        </div>
        <ProgressBar :value="idx + 1" :max="total" :height="3" />

        <div class="tmis__stage">
          <div class="tmis__card-shell">
            <div class="tmis__card" :class="{ 'is-flipped': flipped }" @click="flipped = !flipped">
              <!-- Front -->
              <div
                class="tmis__face tmis__face--front"
                :style="{
                  background: `linear-gradient(160deg, color-mix(in oklch, ${part.color} 18%, transparent), color-mix(in oklch, ${part.color} 4%, transparent)), var(--color-surface-2)`,
                  borderColor: `color-mix(in oklch, ${part.color} 28%, transparent)`,
                }"
              >
                <div class="tmis__face-head">
                  <span class="tmis__face-chip" :style="{
                    color: part.color,
                    background: `color-mix(in oklch, ${part.color} 22%, transparent)`,
                    borderColor: `color-mix(in oklch, ${part.color} 40%, transparent)`,
                  }">{{ part.name }} · {{ part.vi }}</span>
                  <span class="mono tmis__face-hint">tap để xem giải thích</span>
                </div>
                <div class="tmis__face-body">
                  <div class="tmis__face-lbl">Câu hỏi</div>
                  <div class="tmis__face-q">{{ item.q }}</div>
                  <div class="tmis__face-yours">
                    <div class="tmis__face-yours-lbl">Bạn chọn</div>
                    <div class="tmis__face-yours-text">{{ item.yourAnswer }}</div>
                  </div>
                  <div class="tmis__face-correct">
                    <div class="tmis__face-correct-lbl">Đáp án đúng</div>
                    <div class="tmis__face-correct-text">{{ item.correctAnswer }}</div>
                  </div>
                </div>
                <div class="tmis__face-foot">
                  <span>Đã ôn <span class="mono">{{ item.reviewCount }}</span>×</span>
                  <span :style="{ color: 'var(--color-rose)' }">−<span class="mono">{{ item.xpLost }}</span> XP</span>
                </div>
              </div>

              <!-- Back -->
              <div class="tmis__face tmis__face--back">
                <div class="tmis__face-head">
                  <span class="tmis__face-chip" :style="{
                    color: part.color,
                    background: `color-mix(in oklch, ${part.color} 22%, transparent)`,
                    borderColor: `color-mix(in oklch, ${part.color} 40%, transparent)`,
                  }">{{ part.name }} · {{ part.vi }}</span>
                  <span class="mono tmis__face-hint">tap để xem lại câu</span>
                </div>
                <div class="tmis__face-body">
                  <div class="tmis__face-lbl tmis__face-lbl--cyan">Tại sao sai</div>
                  <div class="tmis__face-explain">{{ item.explain }}</div>
                  <div class="tmis__face-chunk">
                    <div class="tmis__face-chunk-lbl">Chunk cần thuộc</div>
                    <div class="tmis__face-chunk-text">"{{ item.chunk }}"</div>
                  </div>
                </div>
                <div class="tmis__face-foot">
                  <span>Đã ôn <span class="mono">{{ item.reviewCount }}</span>×</span>
                  <span :style="{ color: 'var(--color-rose)' }">−<span class="mono">{{ item.xpLost }}</span> XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tmis__actions">
          <button class="btn tap tmis__action tmis__action--review" @click="markReview">
            <Icon name="refresh" :size="14" :style="{ color: 'var(--color-rose)' }" /> Ôn lại
          </button>
          <button class="btn tap tmis__action tmis__action--mastered" @click="markMastered">
            <Icon name="check" :size="14" :style="{ color: 'var(--color-emerald)' }" /> Đã nắm
          </button>
        </div>
      </template>

      <div v-else class="tmis__empty">
        <div class="tmis__empty-ring">
          <Icon name="check" :size="32" :style="{ color: '#fff' }" />
        </div>
        <div class="tmis__empty-title">Sạch sổ!</div>
        <div class="tmis__empty-body">Không còn lỗi nào chờ ôn.<br />Tiếp tục luyện để duy trì streak.</div>
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tmis {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  min-height: 0;
  gap: 12px;
}

.tmis__filter { display: flex; gap: 6px; }
.tmis__filter-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
}
.tmis__filter-btn.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}
.tmis__filter-count { opacity: 0.7; margin-left: 2px; }

.tmis__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tmis__head-eye {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tmis__head-eye .mono { color: var(--color-text-1); }
.tmis__head-when {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-3);
}

.tmis__stage {
  flex: 1;
  padding: 18px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}
.tmis__card-shell {
  perspective: 1400px;
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  aspect-ratio: 3 / 4;
}
.tmis__card {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.tmis__card.is-flipped { transform: rotateY(180deg); }

.tmis__face {
  position: absolute;
  inset: 0;
  padding: 22px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border: 1px solid;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.tmis__face--front { }
.tmis__face--back {
  transform: rotateY(180deg);
  background:
    linear-gradient(160deg, rgba(34, 211, 238, 0.16), rgba(167, 139, 250, 0.06)),
    var(--color-surface-2);
  border-color: color-mix(in oklch, var(--color-cyan) 28%, transparent);
}

.tmis__face-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tmis__face-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid;
}
.tmis__face-hint { font-size: 10px; color: var(--color-text-4); }

.tmis__face-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.tmis__face-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.tmis__face-lbl--cyan { color: var(--color-cyan); }
.tmis__face-q { font-size: 17px; font-weight: 600; line-height: 1.45; color: var(--color-text-1); }
.tmis__face-yours {
  margin-top: 18px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(251, 113, 133, 0.1);
  border: 1px solid rgba(251, 113, 133, 0.3);
}
.tmis__face-yours-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-rose);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tmis__face-yours-text { font-size: 13px; font-weight: 600; margin-top: 4px; color: var(--color-text-1); }

.tmis__face-correct {
  margin-top: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
}
.tmis__face-correct-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-emerald);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tmis__face-correct-text { font-size: 13px; font-weight: 600; margin-top: 4px; color: var(--color-text-1); }

.tmis__face-explain { font-size: 16px; font-weight: 500; line-height: 1.55; color: var(--color-text-1); }
.tmis__face-chunk {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}
.tmis__face-chunk-lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tmis__face-chunk-text {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--color-cyan);
  margin-top: 4px;
}

.tmis__face-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--color-text-3);
}

.tmis__actions { display: flex; gap: 10px; }
.tmis__action {
  flex: 1;
  padding: 14px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.tmis__action--review {
  background: linear-gradient(135deg, rgba(251, 113, 133, 0.16), rgba(251, 113, 133, 0.04));
  border: 1px solid color-mix(in oklch, var(--color-rose) 32%, transparent);
  color: var(--color-rose);
}
.tmis__action--mastered {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(52, 211, 153, 0.04));
  border: 1px solid color-mix(in oklch, var(--color-emerald) 35%, transparent);
  color: var(--color-emerald);
}

/* Empty */
.tmis__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
  gap: 16px;
}
.tmis__empty-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--grad-emerald);
  display: grid;
  place-items: center;
  box-shadow: 0 20px 50px rgba(52, 211, 153, 0.4);
}
.tmis__empty-title { font-size: 20px; font-weight: 700; }
.tmis__empty-body { font-size: 13px; color: var(--color-text-3); line-height: 1.5; }

@media (prefers-reduced-motion: reduce) {
  .tmis__card { transition: none; }
}
</style>
