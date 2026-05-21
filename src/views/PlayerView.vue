<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';

import ChunkCard from '@/components/chunk/ChunkCard.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import PlayerControls from '@/components/player/PlayerControls.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import AppButton from '@/components/common/AppButton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Icon from '@/components/common/Icon.vue';

const player = usePlayerStore();
const settings = useSettingsStore();
const chunks = useChunkStore();
const ui = useUiStore();

const voiceSheetOpen = ref(false);
const scrollY = ref(0);
const compact = computed(() => scrollY.value > 100);
const topicColor = computed(() => chunks.topicById(player.current?.topic ?? '')?.color ?? '#22D3EE');
function togglePlay() {
  if (player.isPlaying && !player.isPaused) player.pause();
  else void player.play();
}

const englishVoices = ref<SpeechSynthesisVoice[]>([]);

const currentVoice = computed(() => player.selectedVoiceName ?? settings.selectedVoiceName ?? 'Default voice');

const repeatChip = computed(() => {
  switch (player.repeatMode) {
    case 'one':
      return 'Lặp 1';
    case 'all':
      return 'Lặp hết';
    case 'none':
    default:
      return 'Không lặp';
  }
});

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollY.value = target.scrollTop;
}

let scrollEl: HTMLElement | null = null;

onMounted(async () => {
  player.syncFromSettings();
  scrollEl = document.querySelector('.app-main');
  scrollEl?.addEventListener('scroll', onScroll, { passive: true });

  await speechService.ensureVoicesLoaded();
  englishVoices.value = speechService.getEnglishVoices();
  if (!player.selectedVoiceName && englishVoices.value[0]) {
    player.setVoiceName(englishVoices.value[0].name);
    settings.selectedVoiceName = englishVoices.value[0].name;
  }
});

onBeforeUnmount(() => {
  scrollEl?.removeEventListener('scroll', onScroll);
});

function openVoices() {
  voiceSheetOpen.value = true;
}

function pickVoice(name: string) {
  player.setVoiceName(name);
  settings.selectedVoiceName = name;
}

async function previewVoice(name: string) {
  try {
    await speechService.speak({
      text: 'Hello, this is a chunk listening lab voice preview.',
      voiceName: name,
      rate: player.speed,
    });
  } catch {
    // ignore preview failures
  }
}

function moveQueueTo(idx: number) {
  player.moveTo(idx);
  if (player.isPlaying) {
    player.stop();
    void player.play();
  }
}

function openDetail(chunkId: string) {
  ui.openChunkDetail(chunkId);
}

function changeSpeed(delta: number) {
  const v = Math.round((player.speed + delta) * 10) / 10;
  player.setSpeed(v);
  settings.defaultSpeed = player.speed;
}
function changeGap(delta: number) {
  player.setGap(player.gap + delta);
  settings.defaultGap = player.gap;
}
function changeRepeatEach(delta: number) {
  player.setRepeatEach(player.repeatEach + delta);
  settings.defaultRepeatEach = player.repeatEach;
}
function toggleMixVoice() {
  player.setMixVoice(!player.mixVoice);
  settings.mixVoice = player.mixVoice;
}

const speechSupported = computed(() => speechService.support().synthesis);

function playSample() {
  if (chunks.chunks.length === 0) return;
  player.setQueue(chunks.chunks.slice(0, 12), { mode: 'normal' });
  void player.play();
}
</script>

<template>
  <section class="player">
    <header
      class="player__head safe-pt"
      :class="{ 'is-compact': compact && player.current }"
    >
      <!-- Expanded -->
      <template v-if="!(compact && player.current)">
        <p class="text-caption text-text-3">Đang phát</p>
        <div class="player__head-row">
          <h1 class="text-title-3">{{ player.current?.text ?? 'Chưa có chunk' }}</h1>
        </div>
      </template>

      <!-- Compact morph (Apple Music style) -->
      <div v-else class="player__head-compact">
        <span class="player__head-icon" :style="{ '--c': topicColor }">
          <TopicIcon :name="player.current!.topic" :size="18" />
        </span>
        <span
          v-if="player.isPlaying && !player.isPaused"
          class="player__head-waves"
          aria-hidden="true"
        >
          <span class="wave-bar" />
          <span class="wave-bar" />
          <span class="wave-bar" />
          <span class="wave-bar" />
        </span>
        <div class="player__head-text">
          <p class="player__head-title">{{ player.current!.text }}</p>
          <p class="player__head-sub">{{ player.current!.meaning }}</p>
        </div>
        <button class="player__head-play tap" :aria-label="'Phát / Tạm dừng'" @click="togglePlay">
          <Icon :name="player.isPlaying && !player.isPaused ? 'pause' : 'play'" :size="16" />
        </button>
      </div>
    </header>

    <div v-if="!speechSupported" class="player__warn">
      <Icon name="lightning" :size="18" />
      <p>Trình duyệt không hỗ trợ SpeechSynthesis. Vui lòng dùng Chrome / Edge / Safari mới.</p>
    </div>

    <template v-if="player.current">
      <ChunkCard :chunk="player.current" :voice-name="currentVoice" :is-playing="player.isPlaying && !player.isPaused" />

      <PlayerControls />

      <div class="player__sub">
        <button class="player__sub-btn tap" :aria-label="'Dừng'" @click="player.stop">
          <Icon name="stop" :size="16" /> Dừng
        </button>
        <button class="player__sub-btn tap" @click="openVoices">
          <Icon name="voice" :size="16" />
          <span class="player__sub-text">{{ currentVoice }}</span>
        </button>
        <span class="player__sub-chip">{{ repeatChip }}</span>
      </div>

      <!-- Lab controls -->
      <section class="lab glass">
        <header class="lab__head">
          <span class="lab__head-icon"><Icon name="sparkles" :size="12" /></span>
          <p class="lab__head-title">Lab controls</p>
        </header>

        <div class="lab__grid">
          <div class="step">
            <p class="step__label">Speed</p>
            <div class="step__row">
              <button class="step__btn tap" :aria-label="'Giảm speed'" @click="changeSpeed(-0.1)">
                <Icon name="minus" :size="14" />
              </button>
              <span class="step__value mono">{{ player.speed.toFixed(1) }}×</span>
              <button class="step__btn tap" :aria-label="'Tăng speed'" @click="changeSpeed(0.1)">
                <Icon name="plus" :size="14" />
              </button>
            </div>
          </div>

          <div class="step">
            <p class="step__label">Gap</p>
            <div class="step__row">
              <button class="step__btn tap" :aria-label="'Giảm gap'" @click="changeGap(-100)">
                <Icon name="minus" :size="14" />
              </button>
              <span class="step__value mono">{{ player.gap }}ms</span>
              <button class="step__btn tap" :aria-label="'Tăng gap'" @click="changeGap(100)">
                <Icon name="plus" :size="14" />
              </button>
            </div>
          </div>

          <div class="step">
            <p class="step__label">Lặp mỗi chunk</p>
            <div class="step__row">
              <button class="step__btn tap" :aria-label="'Giảm lặp'" @click="changeRepeatEach(-1)">
                <Icon name="minus" :size="14" />
              </button>
              <span class="step__value mono">×{{ player.repeatEach }}</span>
              <button class="step__btn tap" :aria-label="'Tăng lặp'" @click="changeRepeatEach(1)">
                <Icon name="plus" :size="14" />
              </button>
            </div>
          </div>

          <div class="toggle">
            <p class="toggle__label">Mix voice</p>
            <button
              class="toggle__btn tap"
              :class="{ 'is-on': player.mixVoice }"
              :aria-pressed="player.mixVoice"
              @click="toggleMixVoice"
            >
              <span class="toggle__track">
                <span class="toggle__thumb" />
              </span>
              <span class="toggle__caption">{{ player.mixVoice ? 'On' : 'Off' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Queue preview -->
      <section class="player__queue">
        <header class="player__queue-head">
          <h2 class="player__queue-title">Tiếp theo</h2>
          <p class="player__queue-meta">{{ player.queueIndex + 1 }} / {{ player.queueLength }}</p>
        </header>
        <ol class="player__queue-list">
          <li
            v-for="(c, idx) in player.queue"
            :key="`${c.id}-${idx}`"
            class="player__queue-item tap"
            :class="{ 'is-playing': idx === player.queueIndex }"
            @click="moveQueueTo(idx)"
          >
            <span class="player__queue-index">{{ idx + 1 }}</span>
            <div class="player__queue-text">
              <p class="player__queue-en">{{ c.text }}</p>
              <p class="player__queue-vi">{{ c.meaning }}</p>
            </div>
            <button
              class="player__queue-detail tap"
              :aria-label="'Chi tiết chunk'"
              @click.stop="openDetail(c.id)"
            >
              <Icon name="chevron-right" :size="16" />
            </button>
          </li>
        </ol>
      </section>
    </template>

    <EmptyState
      v-else
      icon="queue"
      title="Queue đang trống"
      hint="Chọn chunk từ Library hoặc bấm bên dưới để nghe thử một playlist mẫu."
    >
      <AppButton variant="primary" size="md" @click="playSample">
        <Icon name="play" :size="14" />
        Phát playlist mẫu
      </AppButton>
    </EmptyState>

    <!-- Voice selector sheet -->
    <AppSheet :open="voiceSheetOpen" title="Chọn giọng đọc" @close="voiceSheetOpen = false">
      <div class="voices">
        <p v-if="englishVoices.length === 0" class="text-body text-text-3">
          Không tìm thấy giọng tiếng Anh nào trên thiết bị này.
        </p>
        <button
          v-for="v in englishVoices"
          :key="v.name"
          class="voices__row tap"
          :class="{ 'is-active': player.selectedVoiceName === v.name }"
          @click="pickVoice(v.name)"
        >
          <span class="voices__main">
            <span class="voices__name">{{ v.name }}</span>
            <span class="voices__lang">{{ v.lang }}</span>
          </span>
          <button class="voices__preview tap" :aria-label="'Nghe thử'" @click.stop="previewVoice(v.name)">
            <Icon name="play" :size="14" />
          </button>
        </button>
      </div>
    </AppSheet>
  </section>
</template>

<style scoped>
.player {
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: max(env(safe-area-inset-top), 12px);
  position: sticky;
  top: 0;
  z-index: 5;
  background: linear-gradient(180deg, var(--color-bg-0) 70%, transparent);
  margin: -12px -16px 0;
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 10px;
  transition: padding 0.2s ease, background 0.2s ease;
}
.player__head.is-compact {
  background: color-mix(in oklch, var(--color-bg-1) 92%, transparent);
  border-bottom: 1px solid var(--color-border-1);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  padding-bottom: 8px;
}
.player__head-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.player__head-row h1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.player__head-compact {
  display: grid;
  grid-template-columns: 36px auto 1fr 40px;
  align-items: center;
  gap: 10px;
}
.player__head-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--c) 40%, transparent),
    color-mix(in oklch, var(--c) 16%, transparent)
  );
  color: color-mix(in oklch, var(--c) 90%, white);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.player__head-waves {
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
}
.player__head-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.player__head-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__head-sub {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__head-play {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px -8px rgba(34, 211, 238, 0.5);
}

.player__warn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: color-mix(in oklch, var(--color-amber) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-amber) 35%, transparent);
  color: color-mix(in oklch, var(--color-amber) 80%, white);
  font-size: 13px;
}

/* Secondary controls */
.player__sub {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.player__sub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  max-width: 180px;
}
.player__sub-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player__sub-btn.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
}
.player__sub-chip {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Lab controls */
.lab {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lab__head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-cyan);
}
.lab__head-icon {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 35%, transparent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.lab__head-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.lab__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.step,
.toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.step__label,
.toggle__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-text-3);
  text-transform: uppercase;
}
.step__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.step__btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.step__value {
  min-width: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
  flex: 1;
}
.toggle__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  background: transparent;
  color: var(--color-text-2);
}
.toggle__btn.is-on {
  color: var(--color-cyan);
}
.toggle__track {
  display: inline-block;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  position: relative;
  transition: background 0.18s ease;
}
.toggle__btn.is-on .toggle__track {
  background: var(--color-cyan);
  border-color: var(--color-cyan);
}
.toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: transform 0.18s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.toggle__btn.is-on .toggle__thumb {
  transform: translateX(16px);
}
.toggle__caption {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* Queue */
.player__queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.player__queue-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.player__queue-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-3);
}
.player__queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.player__queue-item {
  display: grid;
  grid-template-columns: 28px 1fr 36px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  cursor: pointer;
}
.player__queue-item.is-playing {
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
}
.player__queue-index {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-3);
}
.player__queue-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.player__queue-en {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__queue-vi {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.player__queue-detail {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Voices sheet */
.voices {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0 12px;
}
.voices__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.voices__row.is-active {
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
}
.voices__main {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.voices__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.voices__lang {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-3);
}
.voices__preview {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
