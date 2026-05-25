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

import ModeShell from '@/components/layout/ModeShell.vue';
import Flashcard from '@/components/practice/Flashcard.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import IconBtn from '@/components/common/IconBtn.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
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
  practice.advance();
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
  practice.advance();
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
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function openDetail() {
  if (!current.value) return;
  ui.openChunkDetail(current.value.id);
}

function toggleStar(c: Chunk) {
  void progress.toggleStarred(c.id);
}

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    startWithFiltered();
  }
});

onBeforeUnmount(() => {
  if (autoPlayTimer !== null) window.clearTimeout(autoPlayTimer);
});

const subtitle = computed(() => {
  if (practice.total === 0) return undefined;
  return `${Math.min(practice.index + 1, practice.total)} / ${practice.total}`;
});
</script>

<template>
  <ModeShell title="Flashcards" :subtitle="subtitle" :on-close="exitSession" :on-more="openDetail" stage-width="narrow">
    <template v-if="practice.status === 'active' && current">
      <!-- Progress + direction -->
      <div :style="{ padding: '0 20px' }">
        <ProgressBar
          :value="Math.min(practice.index + 1, practice.total)"
          :max="practice.total"
          :height="4"
        />
        <div
          :style="{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
          }"
        >
          <div
            :style="{
              display: 'flex',
              background: 'var(--color-surface-2)',
              borderRadius: '999px',
              padding: '3px',
              gap: '2px',
              border: '1px solid var(--color-border-1)',
            }"
          >
            <button
              v-for="opt in ([
                { key: 'en-to-vi', label: 'EN → VI' },
                { key: 'vi-to-en', label: 'VI → EN' },
              ] as const)"
              :key="opt.key"
              class="btn tap"
              :style="{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                background: direction === opt.key ? 'var(--color-surface-3)' : 'transparent',
                color: direction === opt.key ? 'var(--color-text-1)' : 'var(--color-text-3)',
              }"
              @click="direction = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
          <div :style="{ display: 'flex', gap: '4px' }">
            <IconBtn icon="shuffle" :size="36" :icon-size="16" @click="shuffleAndRestart" />
            <IconBtn
              :icon="autoPlay ? 'pause' : 'play'"
              :active="autoPlay"
              :size="36"
              :icon-size="16"
              @click="toggleAutoPlay"
            />
            <IconBtn icon="more" :size="36" :icon-size="16" @click="openDetail" />
          </div>
        </div>
      </div>

      <!-- Card -->
      <div
        :style="{
          flex: 1,
          minHeight: 0,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }"
      >
        <Flashcard :chunk="current" :direction="direction" @play="playAudio" @toggle-star="toggleStar" />
      </div>

      <!-- Action buttons -->
      <div :style="{ padding: '0 20px calc(16px + env(safe-area-inset-bottom))', flexShrink: 0 }">
        <div :style="{ display: 'flex', gap: '10px' }">
          <button
            class="btn tap"
            :style="{
              flex: 1,
              padding: '14px',
              borderRadius: '18px',
              fontSize: '14px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(251,113,133,0.15), rgba(251,113,133,0.05))',
              border: '1px solid color-mix(in oklch, var(--color-rose) 30%, transparent)',
              color: 'var(--color-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }"
            @click="stillLearning"
          >
            <Icon name="close" :size="18" /> Cần ôn thêm
          </button>
          <button
            class="btn tap"
            :style="{
              flex: 1,
              padding: '14px',
              borderRadius: '18px',
              fontSize: '14px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.05))',
              border: '1px solid color-mix(in oklch, var(--color-emerald) 35%, transparent)',
              color: 'var(--color-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }"
            @click="know"
          >
            <Icon name="check" :size="18" /> Đã thuộc
          </button>
        </div>
        <div
          :style="{
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--color-text-3)',
            marginTop: '10px',
          }"
        >Tap card to flip · Swipe to navigate</div>
      </div>
    </template>

    <template v-else-if="practice.status === 'finished'">
      <div
        class="glass-strong"
        :style="{
          margin: '14px 20px',
          padding: '24px',
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }"
      >
        <div
          :style="{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }"
        >Hoàn thành phiên</div>
        <h2 :style="{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }">Tốt lắm!</h2>
        <div
          :style="{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }"
        >
          <div>
            <p :style="{ margin: '0 0 2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', fontWeight: 700 }">Đã thuộc</p>
            <p :style="{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--color-emerald)' }">{{ practice.correctCount }}</p>
          </div>
          <div>
            <p :style="{ margin: '0 0 2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', fontWeight: 700 }">Cần ôn</p>
            <p :style="{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--color-amber)' }">{{ practice.wrongCount }}</p>
          </div>
          <div>
            <p :style="{ margin: '0 0 2px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', fontWeight: 700 }">Tổng</p>
            <p :style="{ margin: 0, fontSize: '28px', fontWeight: 700 }">{{ practice.total }}</p>
          </div>
        </div>
        <div :style="{ display: 'flex', gap: '8px' }">
          <button
            class="btn tap glass"
            :style="{ flex: 1, padding: '14px 0', borderRadius: '16px', fontSize: '14px', fontWeight: 700 }"
            @click="shuffleAndRestart"
          >
            <Icon name="shuffle" :size="14" /> Làm lại
          </button>
          <button
            class="btn tap"
            :style="{
              flex: 1,
              padding: '14px 0',
              borderRadius: '16px',
              background: 'var(--grad-primary)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
              boxShadow: '0 10px 28px rgba(34,211,238,0.21), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
            }"
            @click="exitSession"
          >
            <Icon name="check" :size="14" /> Xong
          </button>
        </div>
      </div>
    </template>

    <EmptyState
      v-else
      icon="flashcard"
      title="Chưa có chunk để học"
      hint="Mở Library, chọn chủ đề rồi quay lại đây."
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
          boxShadow: '0 10px 28px rgba(34,211,238,0.21), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
        }"
        @click="startWithFiltered"
      >
        Bắt đầu
      </button>
    </EmptyState>
  </ModeShell>
</template>
