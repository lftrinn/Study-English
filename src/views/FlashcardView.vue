<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import type { Chunk } from '@/types/chunk';
import type { FlashcardDirection } from '@/types/practice';

import Flashcard from '@/components/practice/Flashcard.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const practice = usePracticeStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const ui = useUiStore();

const direction = ref<FlashcardDirection>('en-to-vi');
const autoPlay = ref(false);
let autoPlayTimer: number | null = null;

const current = computed<Chunk | undefined>(() => practice.current);
const progressPct = computed(() => practice.progressPct);

function startWithFiltered() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 20);
  practice.start({ mode: 'flashcard', chunks: list });
}

function shuffleAndRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  practice.start({ mode: 'flashcard', chunks: arr });
}

function flipDirection() {
  direction.value = direction.value === 'en-to-vi' ? 'vi-to-en' : 'en-to-vi';
}

async function know() {
  if (!current.value) return;
  const c = current.value;
  await practice.submit({
    chunkId: c.id,
    prompt: c.text,
    expectedAnswer: c.meaning,
    isCorrect: true,
    userAnswer: undefined,
  });
  next();
}
async function stillLearning() {
  if (!current.value) return;
  const c = current.value;
  await practice.submit({
    chunkId: c.id,
    prompt: c.text,
    expectedAnswer: c.meaning,
    isCorrect: false,
    userAnswer: undefined,
  });
  next();
}
function next() {
  practice.advance();
}

function toggleStar() {
  if (!current.value) return;
  void progress.toggleStarred(current.value.id);
}

async function playAudio(chunk: Chunk) {
  try {
    await speechService.speak({
      text: chunk.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value;
}

function exitSession() {
  practice.reset();
  router.replace('/');
}

function openDetail() {
  if (!current.value) return;
  ui.openChunkDetail(current.value.id);
}

const starred = computed(() =>
  current.value ? Boolean(progress.byId(current.value.id)?.starred) : false,
);

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    startWithFiltered();
  }
});

onBeforeUnmount(() => {
  if (autoPlayTimer !== null) window.clearTimeout(autoPlayTimer);
});
</script>

<template>
  <section class="fc">
    <header class="fc__head safe-pt">
      <button class="fc__back tap" :aria-label="'Quay lại'" @click="exitSession">
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="fc__head-info">
        <p class="text-caption text-text-3">Flashcard</p>
        <p class="fc__progress-text">
          {{ Math.min(practice.index + 1, practice.total) }} / {{ practice.total }}
        </p>
      </div>
      <button class="fc__dir tap" :aria-label="'Đổi hướng'" @click="flipDirection">
        {{ direction === 'en-to-vi' ? 'EN → VI' : 'VI → EN' }}
      </button>
    </header>

    <div class="fc__progress-bar">
      <div class="fc__progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <template v-if="practice.status === 'active' && current">
      <Flashcard :chunk="current" :direction="direction" @play="playAudio" />

      <div class="fc__row">
        <button class="fc__icon tap" :aria-label="'Shuffle'" @click="shuffleAndRestart">
          <Icon name="shuffle" :size="18" />
        </button>
        <button
          class="fc__icon tap"
          :class="{ 'is-active': autoPlay }"
          :aria-label="autoPlay ? 'Tắt auto' : 'Bật auto'"
          @click="toggleAutoPlay"
        >
          <Icon name="play" :size="16" />
        </button>
        <button class="fc__icon tap" :aria-label="'Chi tiết'" @click="openDetail">
          <Icon name="message" :size="16" />
        </button>
        <button
          class="fc__icon tap"
          :class="{ 'is-active': starred }"
          :aria-label="starred ? 'Bỏ sao' : 'Đánh dấu sao'"
          @click="toggleStar"
        >
          <Icon :name="starred ? 'star-filled' : 'star'" :size="18" />
        </button>
      </div>

      <div class="fc__cta">
        <AppButton variant="glass" size="lg" block @click="stillLearning">
          <Icon name="flame" :size="16" />
          Cần ôn thêm
        </AppButton>
        <AppButton variant="primary" size="lg" block @click="know">
          <Icon name="check" :size="16" />
          Đã thuộc
        </AppButton>
      </div>
    </template>

    <template v-else-if="practice.status === 'finished'">
      <div class="fc__summary glass-strong">
        <p class="text-caption text-text-3">Hoàn thành phiên</p>
        <h2 class="text-title-2">Tốt lắm!</h2>
        <div class="fc__summary-stats">
          <div>
            <p class="fc__summary-label">Đã thuộc</p>
            <p class="fc__summary-value emerald">{{ practice.correctCount }}</p>
          </div>
          <div>
            <p class="fc__summary-label">Cần ôn</p>
            <p class="fc__summary-value amber">{{ practice.wrongCount }}</p>
          </div>
          <div>
            <p class="fc__summary-label">Tổng</p>
            <p class="fc__summary-value">{{ practice.total }}</p>
          </div>
        </div>
        <div class="fc__summary-actions">
          <AppButton variant="glass" size="md" @click="shuffleAndRestart">
            <Icon name="shuffle" :size="14" />
            Trộn và làm lại
          </AppButton>
          <AppButton variant="primary" size="md" @click="exitSession">
            <Icon name="check" :size="14" />
            Xong
          </AppButton>
        </div>
      </div>
    </template>

    <EmptyState
      v-else
      icon="flashcard"
      title="Chưa có chunk để học"
      hint="Mở Library, chọn chủ đề rồi quay lại đây."
    >
      <AppButton variant="primary" size="md" @click="startWithFiltered">
        <Icon name="flashcard" :size="14" />
        Bắt đầu với toàn bộ chunks
      </AppButton>
    </EmptyState>
  </section>
</template>

<style scoped>
.fc {
  padding: 12px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
  min-height: 100dvh;
}

.fc__head {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 10px;
  padding-top: max(env(safe-area-inset-top), 8px);
}
.fc__back,
.fc__dir {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.fc__dir {
  width: auto;
  padding: 0 14px;
}
.fc__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.fc__progress-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}

.fc__progress-bar {
  height: 6px;
  background: var(--color-surface-1);
  border-radius: 999px;
  overflow: hidden;
}
.fc__progress-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.3s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}

.fc__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.fc__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fc__icon.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
}

.fc__cta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.fc__summary {
  padding: 24px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.fc__summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.fc__summary-label {
  margin: 0 0 2px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-3);
  font-weight: 700;
}
.fc__summary-value {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.fc__summary-value.emerald {
  color: var(--color-emerald);
}
.fc__summary-value.amber {
  color: var(--color-amber);
}
.fc__summary-actions {
  display: flex;
  gap: 8px;
}
</style>
