<script setup lang="ts">
/**
 * Literal port of screens-player.jsx PlayerScreen (lines 7-196).
 * Sticky header morph + chunk-card 1:1 + transport + lab controls +
 * queue, all with inline-style :style bindings copied from the JSX.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';

import TopicIcon from '@/components/chunk/TopicIcon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import Icon from '@/components/common/Icon.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import WaveBars from '@/components/common/WaveBars.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import StatusDot from '@/components/common/StatusDot.vue';

const player = usePlayerStore();
const settings = useSettingsStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const ui = useUiStore();
const router = useRouter();

const scrollY = ref(0);
const queueOpen = ref(false);
const voiceSheetOpen = ref(false);
const labOpen = ref(false);
let scrollEl: HTMLElement | null = null;

const compact = computed(() => scrollY.value > 100);

const current = computed(() => player.current);
const topic = computed(() =>
  current.value ? chunks.topicById(current.value.topic) : undefined,
);
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const currentProgress = computed(() =>
  current.value ? progress.byId(current.value.id) : undefined,
);
const statusLabel = computed(() => {
  const s = currentProgress.value?.status ?? 'new';
  return s.charAt(0).toUpperCase() + s.slice(1);
});
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

const englishVoices = ref<SpeechSynthesisVoice[]>([]);
const currentVoiceLabel = computed(
  () => player.selectedVoiceName ?? settings.selectedVoiceName ?? 'Aria · US',
);

const repeatIconName = computed(() => (player.repeatMode === 'one' ? 'repeat-one' : 'repeat'));

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollY.value = target.scrollTop;
}
function togglePlay() {
  if (isPlaying.value) player.pause();
  else void player.play();
}
function pickVoice(name: string) {
  player.setVoiceName(name);
  settings.selectedVoiceName = name;
  voiceSheetOpen.value = false;
}
async function previewVoice(name: string, e: Event) {
  e.stopPropagation();
  try {
    await speechService.speak({
      text: current.value?.text ?? 'Hello',
      voiceName: name,
      rate: player.speed,
    });
  } catch {
    /* ignore */
  }
}
function moveQueueTo(idx: number) {
  player.moveTo(idx);
  if (isPlaying.value) {
    player.stop();
    void player.play();
  }
}
function openDetail(id: string) {
  ui.openChunkDetail(id);
}
function toggleStar() {
  if (current.value) void progress.toggleStarred(current.value.id);
}
function changeSpeed(delta: number) {
  player.setSpeed(Math.round((player.speed + delta) * 100) / 100);
  settings.defaultSpeed = player.speed;
}
function changeGap(deltaMs: number) {
  player.setGap(player.gap + deltaMs);
  settings.defaultGap = player.gap;
}
function openCurrentDetail() {
  if (current.value) ui.openChunkDetail(current.value.id);
}
function openListeningLab() {
  labOpen.value = true;
}
function dismissPlayer() {
  if (window.history.length > 1) router.back();
  else void router.push({ name: 'home' });
}
function openHeaderMenu() {
  if (current.value) ui.openChunkDetail(current.value.id);
}
function formatMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}
const progressPct = computed(() => {
  const d = player.currentDurationMs;
  if (!d) return 0;
  return Math.max(0, Math.min(100, (player.currentElapsedMs / d) * 100));
});
const elapsedLabel = computed(() => formatMs(player.currentElapsedMs));
const durationLabel = computed(() => formatMs(player.currentDurationMs));
function changeRepeat(delta: number) {
  player.setRepeatEach(player.repeatEach + delta);
  settings.defaultRepeatEach = player.repeatEach;
}
function toggleMixVoice() {
  player.setMixVoice(!player.mixVoice);
  settings.mixVoice = player.mixVoice;
}

onMounted(async () => {
  player.syncFromSettings();
  scrollEl = document.querySelector('.scrollarea');
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

const speechSupported = computed(() => speechService.support().synthesis);

function playSamplePlaylist() {
  if (chunks.chunks.length === 0) return;
  player.setQueue(chunks.chunks.slice(0, 12), { mode: 'normal' });
  void player.play();
}

const upNext = computed(() =>
  current.value ? player.queue.slice(player.queueIndex + 1, player.queueIndex + 6) : [],
);
</script>

<template>
  <div class="scrollarea" :style="{ position: 'relative' }">
    <!-- Sticky header -->
    <div
      :style="{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: compact ? 'var(--color-bg-1)' : 'transparent',
        borderBottom: compact ? '1px solid var(--color-border-1)' : '1px solid transparent',
        backdropFilter: compact ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: compact ? 'blur(20px) saturate(180%)' : 'none',
        transition: 'background .2s, border-color .2s, backdrop-filter .2s',
        padding: '56px 20px 14px',
      }"
    >
      <div :style="{ display: 'flex', alignItems: 'center', gap: '12px' }">
        <template v-if="compact && current">
          <div :style="{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }">
            <div
              :style="{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 40%, transparent), color-mix(in oklch, ${accent} 16%, transparent))`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: accent,
              }"
            >
              <WaveBars v-if="isPlaying" :color="accent" :size="14" />
              <TopicIcon v-else :name="current.topic" :size="16" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ current.text }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">
                {{ topic?.name }} · <span class="mono">{{ player.queueIndex + 1 }}/{{ player.queueLength }}</span>
              </div>
            </div>
          </div>
          <PlayBtn :playing="isPlaying" :size="40" @click="togglePlay" />
        </template>
        <template v-else>
          <button
            class="btn tap"
            :style="{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-1)',
              flexShrink: 0,
            }"
            :aria-label="'Đóng player'"
            @click="dismissPlayer"
          >
            <Icon name="chevron-down" :size="20" />
          </button>
          <div :style="{ flex: 1, minWidth: 0, textAlign: 'center' }">
            <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }">Playing from</div>
            <div :style="{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }">{{ topic?.name ?? 'Library' }}</div>
          </div>
          <button
            class="btn tap"
            :style="{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-1)',
              flexShrink: 0,
            }"
            :aria-label="'Tuỳ chọn'"
            @click="openHeaderMenu"
          >
            <Icon name="more" :size="20" />
          </button>
        </template>
      </div>
    </div>

    <!-- No speech support warn -->
    <div
      v-if="!speechSupported"
      :style="{
        margin: '12px 20px 0',
        padding: '10px 14px',
        borderRadius: '12px',
        fontSize: '13px',
        background: 'color-mix(in oklch, var(--color-amber) 14%, transparent)',
        border: '1px solid color-mix(in oklch, var(--color-amber) 35%, transparent)',
        color: 'color-mix(in oklch, var(--color-amber) 80%, white)',
      }"
    >Trình duyệt không hỗ trợ SpeechSynthesis. Vui lòng dùng Chrome / Edge / Safari mới.</div>

    <template v-if="current">
      <!-- Album-art equivalent chunk card -->
      <div :style="{ padding: '20px 20px 0' }">
        <div
          :style="{
            aspectRatio: '1 / 1',
            borderRadius: '28px',
            background: `linear-gradient(160deg, color-mix(in oklch, ${accent} 45%, transparent), color-mix(in oklch, ${accent} 10%, transparent)), radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.18), transparent)`,
            border: `1px solid color-mix(in oklch, ${accent} 24%, transparent)`,
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }"
        >
          <div
            :class="isPlaying ? 'pulse-cyan' : ''"
            :style="{
              position: 'absolute',
              top: '26px',
              right: '26px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: accent,
            }"
          />
          <div>
            <div
              :style="{
                fontSize: '12px',
                color: 'var(--color-text-2)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }"
            >
              <TopicIcon :name="current.topic" :size="14" />
              {{ topic?.name }}
              <span :style="{ width: '4px', height: '4px', borderRadius: '4px', background: 'var(--color-text-4)' }" />
              <LevelPill :level="current.level" />
            </div>
            <div
              :style="{
                fontSize: '26px',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.015em',
                marginTop: '16px',
              }"
            >{{ current.text }}</div>
          </div>
          <div>
            <div :style="{ height: '1px', background: 'var(--color-border-1)', margin: '14px 0' }" />
            <div :style="{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.4 }">{{ current.meaning }}</div>
            <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }">
              <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
                <div :style="{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-surface-3)', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }">
                  <Icon name="mic" :size="12" />
                </div>
                <div>
                  <div :style="{ fontSize: '11px', fontWeight: 600 }">{{ currentVoiceLabel }}</div>
                  <div :style="{ fontSize: '10px', color: 'var(--color-text-3)' }">{{ player.mixVoice ? 'Mix voices' : 'Single voice' }}</div>
                </div>
              </div>
              <div :style="{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--color-text-3)' }">
                <Icon name="headphones" :size="12" />
                <span class="mono">{{ currentProgress?.listenCount ?? 0 }}× heard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status row -->
      <div :style="{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }">
        <button
          class="btn tap"
          :style="{
            width: '36px',
            height: '36px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '12px',
            color: currentProgress?.starred ? '#FCD34D' : 'var(--color-text-3)',
          }"
          @click="toggleStar"
        >
          <Icon :name="currentProgress?.starred ? 'star-filled' : 'star'" :size="18" />
        </button>
        <div :style="{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }">
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }">
            <span>Loop <span class="mono">1/{{ player.repeatEach }}</span></span>
            <StatusDot :status="currentProgress?.status ?? 'new'" with-label />
          </div>
          <ProgressBar :value="progressPct" :height="4" :color="accent" />
          <div :style="{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-3)' }">
            <span class="mono">{{ elapsedLabel }}</span>
            <span class="mono">{{ durationLabel }}</span>
          </div>
        </div>
        <button
          class="btn tap"
          :style="{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--color-surface-2)',
            color: 'var(--color-cyan)',
          }"
          @click="openListeningLab"
          :aria-label="'Mở Listening Lab'"
        >
          <Icon name="sparkles" :size="18" />
        </button>
      </div>

      <!-- Transport -->
      <div
        :style="{
          padding: '24px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }"
      >
        <button
          class="btn tap"
          :style="{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            background: player.shuffle ? 'var(--color-surface-3)' : 'transparent',
            color: player.shuffle ? 'var(--color-cyan)' : 'var(--color-text-2)',
          }"
          @click="player.toggleShuffle"
        >
          <Icon name="shuffle" :size="20" />
        </button>
        <button
          class="btn tap"
          :style="{
            width: '56px',
            height: '56px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'var(--color-text-1)',
          }"
          @click="player.prev"
        >
          <Icon name="prev" :size="26" />
        </button>
        <PlayBtn :playing="isPlaying" :size="72" @click="togglePlay" />
        <button
          class="btn tap"
          :style="{
            width: '56px',
            height: '56px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'var(--color-text-1)',
          }"
          @click="player.next"
        >
          <Icon name="next" :size="26" />
        </button>
        <button
          class="btn tap"
          :style="{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            background: player.repeatMode !== 'none' ? 'var(--color-surface-3)' : 'transparent',
            color: player.repeatMode !== 'none' ? 'var(--color-cyan)' : 'var(--color-text-2)',
          }"
          @click="player.cycleRepeat"
        >
          <Icon :name="repeatIconName" :size="20" />
        </button>
      </div>

      <!-- Up next -->
      <div :style="{ marginTop: '24px' }">
        <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px', marginBottom: '12px' }">
          <div>
            <h2 :style="{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }">Up next</h2>
            <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }">
              {{ Math.max(0, player.queueLength - player.queueIndex - 1) }} more in queue
            </div>
          </div>
          <button
            class="btn tap"
            :style="{
              fontSize: '12px',
              color: 'var(--color-cyan)',
              fontWeight: 700,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }"
            @click="queueOpen = true"
          >
            <Icon name="list" :size="14" />Queue
          </button>
        </div>
        <div :style="{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }">
          <button
            v-for="(c, idx) in upNext"
            :key="c.id"
            class="btn tap"
            :style="{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '14px',
              background: 'transparent',
              border: '1px solid var(--color-border-1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
            }"
            @click="moveQueueTo(player.queueIndex + 1 + idx)"
          >
            <div
              :style="{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
              }"
            >
              <TopicIcon :name="c.topic" :size="14" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-1)' }">{{ c.text }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }">{{ c.meaning }}</div>
            </div>
            <span class="mono" :style="{ fontSize: '10px', color: 'var(--color-text-3)' }">
              {{ progress.byId(c.id)?.listenCount ?? 0 }}×
            </span>
          </button>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div
      v-else
      :style="{ padding: '36px 24px', textAlign: 'center', color: 'var(--color-text-3)' }"
    >
      <div :style="{ fontSize: '14px', marginBottom: '12px' }">Queue đang trống.</div>
      <button
        class="btn tap"
        :style="{
          padding: '12px 24px',
          borderRadius: '16px',
          background: 'var(--grad-primary)',
          color: '#0B0F22',
          fontSize: '13px',
          fontWeight: 700,
        }"
        @click="playSamplePlaylist"
      >Phát playlist mẫu</button>
    </div>

    <div class="tabbar-spacer" />

    <!-- Listening Lab sheet -->
    <AppSheet :open="labOpen" title="Listening Lab" @close="labOpen = false">
      <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }">
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600 }">Repeat each</div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '12px',
              padding: '4px',
            }"
          >
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeRepeat(-1)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="mono" :style="{ fontSize: '14px', fontWeight: 700 }">{{ player.repeatEach }}×</span>
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeRepeat(1)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600 }">Gap</div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '12px',
              padding: '4px',
            }"
          >
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeGap(-500)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="mono" :style="{ fontSize: '14px', fontWeight: 700 }">{{ (player.gap / 1000).toFixed(1) }}s</span>
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeGap(500)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600 }">Speed</div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '12px',
              padding: '4px',
            }"
          >
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeSpeed(-0.05)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="mono" :style="{ fontSize: '14px', fontWeight: 700 }">{{ player.speed.toFixed(2) }}×</span>
            <button class="btn tap" :style="{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="changeSpeed(0.05)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600 }">Mix voices</div>
          <button
            class="btn tap"
            :style="{
              height: '36px',
              borderRadius: '12px',
              padding: '0 6px',
              background: player.mixVoice ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
              border: player.mixVoice ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }"
            @click="toggleMixVoice"
          >
            <span
              :style="{
                fontSize: '13px',
                fontWeight: 600,
                paddingLeft: '6px',
                color: player.mixVoice ? 'var(--color-cyan)' : 'var(--color-text-2)',
              }"
            >{{ player.mixVoice ? 'On' : 'Off' }}</span>
            <span
              :style="{
                width: '28px',
                height: '16px',
                borderRadius: '99px',
                background: player.mixVoice ? 'var(--color-cyan)' : 'var(--color-surface-3)',
                position: 'relative',
              }"
            >
              <span
                :style="{
                  position: 'absolute',
                  top: '1px',
                  left: player.mixVoice ? '13px' : '1px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left .15s ease',
                }"
              />
            </span>
          </button>
        </div>
      </div>
    </AppSheet>

    <!-- Full queue sheet -->
    <AppSheet :open="queueOpen" :title="`Queue · ${player.queueLength} chunks`" @close="queueOpen = false">
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
        <button
          v-for="(c, i) in player.queue"
          :key="`${c.id}-${i}`"
          class="btn tap"
          :style="{
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: '14px',
            background: i === player.queueIndex ? 'var(--color-surface-3)' : 'transparent',
            border: i === player.queueIndex ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }"
          @click="moveQueueTo(i); queueOpen = false"
        >
          <div
            :style="{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: `color-mix(in oklch, ${chunks.topicById(c.topic)?.color ?? '#22D3EE'} 22%, transparent)`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: chunks.topicById(c.topic)?.color ?? '#22D3EE',
            }"
          >
            <TopicIcon :name="c.topic" :size="14" />
          </div>
          <div :style="{ flex: 1, minWidth: 0 }">
            <div :style="{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: i === player.queueIndex ? 'var(--color-cyan)' : 'var(--color-text-1)' }">{{ c.text }}</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }">{{ c.meaning }}</div>
          </div>
          <button
            class="btn tap"
            :style="{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--color-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--color-text-3)' }"
            @click.stop="openDetail(c.id)"
          >
            <Icon name="chevron-right" :size="14" />
          </button>
        </button>
      </div>
    </AppSheet>
  </div>
</template>

<style scoped>
.scrollarea {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.scrollarea::-webkit-scrollbar {
  display: none;
}
.tabbar-spacer {
  height: calc(96px + env(safe-area-inset-bottom));
}
</style>
