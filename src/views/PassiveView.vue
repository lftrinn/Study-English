<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { playlistService } from '@/services/playlistService';
import { speechService } from '@/services/speechService';
import { usePictureInPicture } from '@/composables/usePictureInPicture';

import ModeShell from '@/components/layout/ModeShell.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import Icon from '@/components/common/Icon.vue';
import AppSheet from '@/components/common/AppSheet.vue';

const router = useRouter();
const player = usePlayerStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const settings = useSettingsStore();
const ui = useUiStore();

const showMeaning = ref(true);
const startedAt = ref(Date.now());
const seconds = ref(0);
let tick: number | null = null;

const current = computed(() => player.current);
const topic = computed(() => (current.value ? chunks.topicById(current.value.topic) : undefined));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

const mm = computed(() => String(Math.floor(seconds.value / 60)).padStart(2, '0'));
const ss = computed(() => String(seconds.value % 60).padStart(2, '0'));

const voiceLine = computed(() => {
  if (player.mixVoice) return 'Mix voices';
  return player.selectedVoiceName ?? 'Default voice';
});

const ringStyles = (i: number) => ({
  position: 'absolute' as const,
  width: '260px',
  height: '260px',
  borderRadius: '50%',
  border: `1.5px solid color-mix(in oklch, ${accent.value} 60%, transparent)`,
  animation: `passivePulse 3s ${i}s ease-out infinite`,
});

function ensureQueue() {
  if (player.queue.length > 0) return;
  const lowListen = playlistService.buildLowListen(chunks.chunks, progress.progressMap, {
    threshold: 5,
    limit: 30,
  });
  const queue = lowListen.length > 0 ? lowListen : chunks.chunks.slice(0, 20);
  if (queue.length === 0) {
    router.replace('/library');
    return;
  }
  player.setShuffle(true);
  player.setQueue(queue, { mode: 'passive' });
}

function togglePlay() {
  if (isPlaying.value) player.pause();
  else void player.play();
}

function toggleMeaning() {
  showMeaning.value = !showMeaning.value;
}

function openDetail() {
  if (current.value) ui.openChunkDetail(current.value.id);
}

const audioSheetOpen = ref(false);
const englishVoices = ref<SpeechSynthesisVoice[]>([]);

function adjustSpeed(delta: number) {
  const v = Math.round((player.speed + delta) * 10) / 10;
  const clamped = Math.max(0.5, Math.min(2, v));
  player.setSpeed(clamped);
  settings.defaultSpeed = clamped;
}
function adjustGap(delta: number) {
  const v = Math.max(0, Math.min(5000, player.gap + delta));
  player.setGap(v);
  settings.defaultGap = v;
}
function pickVoice(name: string | null) {
  player.setVoiceName(name);
  settings.selectedVoiceName = name;
  if (name && player.mixVoice) {
    // Picking a specific voice implies turning mix off.
    player.setMixVoice(false);
    settings.mixVoice = false;
  }
}
function toggleMix() {
  const v = !player.mixVoice;
  player.setMixVoice(v);
  settings.mixVoice = v;
}

const pip = usePictureInPicture();

async function openAudioSheet() {
  audioSheetOpen.value = true;
  if (englishVoices.value.length === 0) {
    await speechService.ensureVoicesLoaded();
    englishVoices.value = speechService.getEnglishVoices();
  }
}

onMounted(() => {
  ensureQueue();
  if (!isPlaying.value) void player.play();
  startedAt.value = Date.now();
  tick = window.setInterval(() => {
    if (isPlaying.value) {
      seconds.value = Math.floor((Date.now() - startedAt.value) / 1000);
    } else {
      startedAt.value = Date.now() - seconds.value * 1000;
    }
  }, 1000);
});

onBeforeUnmount(() => {
  if (tick !== null) window.clearInterval(tick);
});
</script>

<template>
  <ModeShell title="Passive Lab" subtitle="Hands-free" :on-more="openDetail">
    <template v-if="current && topic">
      <div class="passive">
        <!-- Stats row -->
        <div class="passive__stats">
          <div>
            <div class="passive__stat-label">Session</div>
            <div class="passive__stat-value mono">{{ mm }}:{{ ss }}</div>
          </div>
          <div :style="{ textAlign: 'right' }">
            <div class="passive__stat-label">Played</div>
            <div class="passive__stat-value mono">
              {{ player.sessionPlayedCount }}
              <span :style="{ fontSize: '12px', color: 'var(--color-text-3)', fontWeight: 600 }">chunks</span>
            </div>
          </div>
        </div>

        <!-- Pulse + chunk -->
        <div class="passive__centre">
          <div class="passive__pulse">
            <template v-if="isPlaying">
              <div v-for="i in 3" :key="i" :style="ringStyles(i - 1)" />
            </template>
            <div
              class="passive__halo"
              :style="{
                background: `radial-gradient(circle at 50% 40%, color-mix(in oklch, ${accent} 50%, transparent), transparent 70%)`,
              }"
            />
            <div
              class="passive__sphere"
              :style="{
                background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 60%, var(--color-violet)))`,
                boxShadow: `0 30px 80px color-mix(in oklch, ${accent} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.4)`,
              }"
            >
              <WaveBars color="#fff" :size="48" :playing="isPlaying" />
            </div>
          </div>

          <div class="passive__chunk">
            <TopicChip :topic="current.topic" />
            <div class="passive__text">{{ current.text }}</div>
            <div
              class="passive__meaning"
              :style="{
                color: showMeaning ? 'var(--color-text-2)' : 'transparent',
                textShadow: showMeaning ? 'none' : '0 0 14px var(--color-text-2)',
                userSelect: showMeaning ? 'auto' : 'none',
              }"
            >{{ current.meaning }}</div>
            <button class="btn tap passive__reveal" @click="toggleMeaning">
              <Icon :name="showMeaning ? 'eye-off' : 'eye'" :size="14" />
              {{ showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa' }}
            </button>
          </div>
        </div>

        <!-- Controls -->
        <div class="passive__controls">
          <div class="passive__transport">
            <button
              class="btn tap passive__nav"
              :aria-label="'Trước'"
              @click="player.prev"
            >
              <Icon name="prev" :size="22" />
            </button>
            <PlayBtn :playing="isPlaying" :size="72" @click="togglePlay" />
            <button
              class="btn tap passive__nav"
              :aria-label="'Sau'"
              @click="player.next"
            >
              <Icon name="next" :size="22" />
            </button>
          </div>
          <div v-if="pip.supported.value" class="passive__pip-row">
            <button
              class="btn tap passive__pip"
              :class="{ 'passive__pip--active': pip.active.value }"
              :aria-label="pip.active.value ? 'Tắt Picture-in-Picture' : 'Bật Picture-in-Picture'"
              @click="pip.toggle"
            >
              <Icon name="pip" :size="14" />
              <span>{{ pip.active.value ? 'Tắt PiP' : 'Mở PiP' }}</span>
            </button>
          </div>
          <button
            class="btn tap passive__meta passive__meta-btn"
            :aria-label="'Tuỳ chỉnh âm thanh'"
            @click="openAudioSheet"
          >
            <Icon name="mic" :size="12" />
            <span>{{ voiceLine }}</span>
            <span class="passive__sep" />
            <span class="mono">{{ player.speed.toFixed(2) }}×</span>
            <span class="passive__sep" />
            <span>Gap {{ (player.gap / 1000).toFixed(1) }}s</span>
            <Icon name="chevron-right" :size="12" :style="{ color: 'var(--color-text-4)' }" />
          </button>
        </div>
      </div>
    </template>
    <div v-else class="passive__empty">
      <p>Queue trống. Quay lại Library để thêm chunk.</p>
      <button class="btn tap passive__back" @click="router.replace('/library')">
        Tới Library
      </button>
    </div>

    <AppSheet :open="audioSheetOpen" title="Tuỳ chỉnh âm thanh" @close="audioSheetOpen = false">
      <div class="audio-sheet">
        <!-- Speed -->
        <div class="audio-sheet__group">
          <div class="audio-sheet__label">
            <Icon name="bolt" :size="14" :style="{ color: '#F59E0B' }" />
            <span>Tốc độ</span>
            <span class="audio-sheet__value mono">{{ player.speed.toFixed(2) }}×</span>
          </div>
          <div class="audio-sheet__stepper">
            <button class="btn tap audio-sheet__btn" :disabled="player.speed <= 0.5" @click="adjustSpeed(-0.1)">
              <Icon name="minus" :size="14" />
            </button>
            <div class="audio-sheet__readout mono">{{ player.speed.toFixed(2) }}×</div>
            <button class="btn tap audio-sheet__btn" :disabled="player.speed >= 2" @click="adjustSpeed(0.1)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <!-- Gap -->
        <div class="audio-sheet__group">
          <div class="audio-sheet__label">
            <Icon name="clock" :size="14" :style="{ color: '#34D399' }" />
            <span>Gap giữa chunk</span>
            <span class="audio-sheet__value mono">{{ player.gap }}ms</span>
          </div>
          <div class="audio-sheet__stepper">
            <button class="btn tap audio-sheet__btn" :disabled="player.gap <= 0" @click="adjustGap(-100)">
              <Icon name="minus" :size="14" />
            </button>
            <div class="audio-sheet__readout mono">{{ player.gap }}ms</div>
            <button class="btn tap audio-sheet__btn" :disabled="player.gap >= 5000" @click="adjustGap(100)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <!-- Mix voice -->
        <div class="audio-sheet__group">
          <div class="audio-sheet__label">
            <Icon name="speaker" :size="14" :style="{ color: '#A78BFA' }" />
            <span>Mix voices</span>
            <span class="audio-sheet__value">{{ player.mixVoice ? 'Bật' : 'Tắt' }}</span>
          </div>
          <button
            class="btn tap audio-sheet__toggle"
            :aria-pressed="player.mixVoice"
            :style="{
              background: player.mixVoice ? 'var(--color-cyan)' : 'var(--color-surface-3)',
            }"
            @click="toggleMix"
          >
            <span :style="{
              position: 'absolute',
              top: '3px',
              left: player.mixVoice ? '19px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .15s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,.2)',
            }" />
          </button>
        </div>

        <!-- Voice list -->
        <div class="audio-sheet__group audio-sheet__group--voices">
          <div class="audio-sheet__label">
            <Icon name="mic" :size="14" :style="{ color: '#22D3EE' }" />
            <span>Giọng đọc</span>
          </div>
          <p
            v-if="englishVoices.length === 0"
            :style="{ fontSize: '12px', color: 'var(--color-text-3)', margin: '4px 0 0' }"
          >Đang tải danh sách giọng...</p>
          <div v-else class="audio-sheet__voices">
            <button
              class="btn tap audio-sheet__voice"
              :style="{
                background: !player.selectedVoiceName && !player.mixVoice ? 'color-mix(in oklch, var(--color-cyan) 14%, transparent)' : 'var(--color-surface-1)',
                border: !player.selectedVoiceName && !player.mixVoice ? '1px solid color-mix(in oklch, var(--color-cyan) 40%, transparent)' : '1px solid var(--color-border-1)',
              }"
              @click="pickVoice(null)"
            >
              <span class="audio-sheet__voice-name">Mặc định trình duyệt</span>
              <span
                v-if="!player.selectedVoiceName && !player.mixVoice"
                class="audio-sheet__voice-tag"
              >Đang dùng</span>
            </button>
            <button
              v-for="v in englishVoices"
              :key="v.name"
              class="btn tap audio-sheet__voice"
              :style="{
                background: player.selectedVoiceName === v.name && !player.mixVoice ? 'color-mix(in oklch, var(--color-cyan) 14%, transparent)' : 'var(--color-surface-1)',
                border: player.selectedVoiceName === v.name && !player.mixVoice ? '1px solid color-mix(in oklch, var(--color-cyan) 40%, transparent)' : '1px solid var(--color-border-1)',
              }"
              @click="pickVoice(v.name)"
            >
              <span class="audio-sheet__voice-name">
                <span>{{ v.name }}</span>
                <span class="audio-sheet__voice-lang mono">{{ v.lang }}</span>
              </span>
              <span
                v-if="player.selectedVoiceName === v.name && !player.mixVoice"
                class="audio-sheet__voice-tag"
              >Đang dùng</span>
            </button>
          </div>
          <p
            :style="{ fontSize: '11px', color: 'var(--color-text-4)', margin: '8px 0 0', textAlign: 'center' }"
          >Thay đổi sẽ áp dụng cho chunk tiếp theo.</p>
        </div>
      </div>
    </AppSheet>
  </ModeShell>
</template>

<style scoped>
.passive {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 20px 24px;
  gap: 14px;
}

.passive__stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.passive__stat-label {
  font-size: 11px;
  color: var(--color-text-3);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.passive__stat-value {
  font-size: 22px;
  font-weight: 700;
  margin-top: 2px;
}

.passive__centre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}
.passive__pulse {
  position: relative;
  width: 260px;
  height: 260px;
  display: grid;
  place-items: center;
}
.passive__halo {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(8px);
}
.passive__sphere {
  position: relative;
  z-index: 1;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.passive__chunk {
  text-align: center;
  padding: 0 14px;
  max-width: 360px;
}
.passive__text {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.25;
  margin-top: 14px;
  text-wrap: pretty;
}
.passive__meaning {
  font-size: 15px;
  margin-top: 12px;
  transition: color 0.2s ease, text-shadow 0.2s ease;
}
.passive__reveal {
  margin-top: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.passive__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.passive__transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}
.passive__nav {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  color: var(--color-text-1);
}
.passive__pip-row {
  display: flex;
  justify-content: center;
}
.passive__pip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
}
.passive__pip--active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
.passive__meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-3);
}
.passive__meta-btn {
  width: auto;
  align-self: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
}
.passive__meta-btn:hover {
  background: var(--color-surface-3);
}
.passive__sep {
  width: 3px;
  height: 3px;
  border-radius: 2px;
  background: var(--color-text-4);
  display: inline-block;
}

.passive__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--color-text-3);
  text-align: center;
  padding: 0 24px;
}
.passive__back {
  padding: 12px 22px;
  border-radius: 16px;
  background: var(--grad-primary);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow:
    0 10px 28px rgba(34, 211, 238, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}

.audio-sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.audio-sheet__group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 14px;
}
.audio-sheet__group--voices {
  flex-direction: column;
  align-items: stretch;
}
.audio-sheet__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  flex: 1;
  min-width: 0;
}
.audio-sheet__value {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-3);
  font-weight: 600;
}
.audio-sheet__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.audio-sheet__btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--color-surface-2);
  color: var(--color-text-2);
  display: grid;
  place-items: center;
}
.audio-sheet__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.audio-sheet__readout {
  min-width: 64px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.audio-sheet__toggle {
  width: 42px;
  height: 26px;
  border-radius: 99px;
  position: relative;
  transition: background 0.15s;
  flex-shrink: 0;
}
.audio-sheet__voices {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  max-height: 38dvh;
  overflow-y: auto;
  scrollbar-width: none;
}
.audio-sheet__voices::-webkit-scrollbar {
  display: none;
}
.audio-sheet__voice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  text-align: left;
}
.audio-sheet__voice-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
  min-width: 0;
}
.audio-sheet__voice-lang {
  font-size: 10px;
  color: var(--color-text-3);
  font-weight: 500;
}
.audio-sheet__voice-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-cyan);
  flex-shrink: 0;
}

@keyframes passivePulse {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .passive__pulse > div[style*='passivePulse'] {
    animation: none !important;
  }
}
</style>
