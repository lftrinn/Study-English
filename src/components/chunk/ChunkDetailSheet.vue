<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import type { Chunk, ChunkExample } from '@/types/chunk';

import AppSheet from '@/components/common/AppSheet.vue';
import LevelPill from './LevelPill.vue';
import TopicChip from './TopicChip.vue';
import TopicIcon from './TopicIcon.vue';
import Icon from '@/components/common/Icon.vue';

type TabKey = 'examples' | 'voices' | 'related';

const ui = useUiStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const settings = useSettingsStore();
const router = useRouter();

const tab = ref<TabKey>('examples');
const englishVoices = ref<SpeechSynthesisVoice[]>([]);

const open = computed(() => ui.sheet === 'chunk-detail' && Boolean(ui.sheetChunkId));
const chunk = computed<Chunk | undefined>(() =>
  ui.sheetChunkId ? chunks.byId(ui.sheetChunkId) : undefined,
);
const p = computed(() => (chunk.value ? progress.byId(chunk.value.id) : undefined));
const accent = computed(() => chunks.topicById(chunk.value?.topic ?? '')?.color ?? '#22D3EE');

const accuracy = computed(() => {
  const cur = p.value;
  if (!cur) return null;
  const total = cur.correctCount + cur.wrongCount;
  if (total === 0) return null;
  return Math.round((cur.correctCount / total) * 100);
});

const examples = computed<ChunkExample[]>(() => chunk.value?.examples ?? []);

const related = computed<Chunk[]>(() => {
  if (!chunk.value) return [];
  return chunks.chunks
    .filter((c) => c.topic === chunk.value!.topic && c.id !== chunk.value!.id)
    .slice(0, 5);
});

const contextLabels: Record<ChunkExample['context'], string> = {
  standup: 'Standup',
  slack: 'Slack',
  client: 'Client',
  interview: 'Interview',
  toeic: 'TOEIC',
  general: 'Khác',
};

function close() {
  ui.closeSheet();
}

function play() {
  if (!chunk.value) return;
  player.setQueue([chunk.value], { mode: 'normal' });
  void player.play();
  close();
  router.push('/player');
}

function addToQueue() {
  if (!chunk.value) return;
  player.queue.push(chunk.value);
}

function toggleStar() {
  if (!chunk.value) return;
  void progress.toggleStarred(chunk.value.id);
}

async function playExample(ex: ChunkExample) {
  try {
    await speechService.speak({
      text: ex.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

async function playSelf() {
  if (!chunk.value) return;
  try {
    await speechService.speak({
      text: chunk.value.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

async function previewVoice(name: string, e: Event) {
  e.stopPropagation();
  try {
    await speechService.speak({
      text: chunk.value?.text ?? 'Hello',
      voiceName: name,
      rate: 1,
    });
  } catch {
    // ignore
  }
}

function useVoice(name: string) {
  settings.selectedVoiceName = name;
}

function openRelated(c: Chunk) {
  ui.openChunkDetail(c.id);
  tab.value = 'examples';
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Split example text into segments highlighting the chunk text. */
function highlightSegments(exampleText: string, chunkText: string): Array<{ text: string; hl: boolean }> {
  if (!chunkText) return [{ text: exampleText, hl: false }];
  const lower = exampleText.toLowerCase();
  const target = chunkText.toLowerCase();
  const idx = lower.indexOf(target);
  if (idx < 0) return [{ text: exampleText, hl: false }];
  return [
    { text: exampleText.slice(0, idx), hl: false },
    { text: exampleText.slice(idx, idx + chunkText.length), hl: true },
    { text: exampleText.slice(idx + chunkText.length), hl: false },
  ];
}

onMounted(async () => {
  await speechService.ensureVoicesLoaded();
  englishVoices.value = speechService.getEnglishVoices();
});

watch(open, async (v) => {
  if (v) {
    tab.value = 'examples';
    if (englishVoices.value.length === 0) {
      await speechService.ensureVoicesLoaded();
      englishVoices.value = speechService.getEnglishVoices();
    }
  }
});
</script>

<template>
  <AppSheet :open="open" :title="undefined" max-height="92dvh" @close="close">
    <div v-if="chunk" class="cd" :style="{ '--accent': accent }">
      <!-- Hero card -->
      <article class="cd__hero">
        <span v-if="p?.starred" class="cd__hero-dot" aria-hidden="true" />
        <div class="cd__hero-row">
          <TopicChip :topic-id="chunk.topic" :show-icon="true" size="sm" />
          <LevelPill :level="chunk.level" />
          <span class="cd__status">
            <span class="dot" :class="`dot-${p?.status ?? 'new'}`" />
            <span>{{ p?.status ?? 'new' }}</span>
          </span>
        </div>
        <p class="cd__hero-text">{{ chunk.text }}</p>
        <p class="cd__hero-meaning">{{ chunk.meaning }}</p>

        <div class="cd__hero-foot">
          <button class="cd__hero-play tap" :aria-label="'Phát'" @click="playSelf">
            <Icon name="play" :size="16" />
          </button>
          <span class="cd__waves" aria-hidden="true">
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
          </span>
          <span class="cd__hero-meta mono">
            {{ p?.listenCount ?? 0 }} listen
          </span>
          <button
            class="cd__hero-star tap"
            :class="{ 'is-on': p?.starred }"
            :aria-pressed="Boolean(p?.starred)"
            :aria-label="p?.starred ? 'Bỏ sao' : 'Đánh dấu sao'"
            @click="toggleStar"
          >
            <Icon :name="p?.starred ? 'star-filled' : 'star'" :size="18" />
          </button>
        </div>
      </article>

      <!-- Stats strip (4-col) -->
      <div class="cd__stats glass">
        <div class="cd__stat">
          <p class="cd__stat-value mono">{{ p?.listenCount ?? 0 }}</p>
          <p class="cd__stat-label">listens</p>
        </div>
        <div class="cd__stat">
          <p class="cd__stat-value mono">{{ accuracy === null ? '—' : `${accuracy}%` }}</p>
          <p class="cd__stat-label">accuracy</p>
        </div>
        <div class="cd__stat">
          <p class="cd__stat-value mono">{{ p?.correctStreak ?? 0 }}</p>
          <p class="cd__stat-label">streak</p>
        </div>
        <div class="cd__stat">
          <p class="cd__stat-value mono">{{ p?.speakCount ?? 0 }}</p>
          <p class="cd__stat-label">speaks</p>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="cd__tabs" aria-label="Chi tiết chunk">
        <button
          v-for="t in (['examples', 'voices', 'related'] as TabKey[])"
          :key="t"
          class="cd__tab tap"
          :class="{ 'is-active': tab === t }"
          @click="tab = t"
        >
          {{ t === 'examples' ? 'Examples' : t === 'voices' ? 'Voices' : 'Related' }}
        </button>
      </nav>

      <!-- Examples tab -->
      <section v-if="tab === 'examples'" class="cd__panel">
        <article
          v-for="(ex, idx) in examples"
          :key="`ex-${idx}`"
          class="cd__example glass"
        >
          <span class="cd__example-ctx">{{ contextLabels[ex.context] ?? ex.context }}</span>
          <p class="cd__example-text">
            <template v-for="(seg, si) in highlightSegments(ex.text, chunk.text)" :key="`seg-${si}`">
              <mark v-if="seg.hl" class="cd__hl">{{ seg.text }}</mark>
              <template v-else>{{ seg.text }}</template>
            </template>
          </p>
          <p class="cd__example-vi">{{ ex.meaning }}</p>
          <button
            class="cd__example-play tap"
            :aria-label="'Phát ví dụ'"
            @click="playExample(ex)"
          >
            <Icon name="play" :size="12" />
          </button>
        </article>

        <div v-if="examples.length === 0" class="cd__empty">
          <span class="cd__empty-icon">
            <Icon name="message" :size="20" />
          </span>
          <p class="cd__empty-title">Chưa có ví dụ</p>
          <p class="cd__empty-hint">
            Chunk này chưa kèm câu ví dụ trong pack. Bạn vẫn có thể nghe + luyện qua các mode khác.
          </p>
        </div>
      </section>

      <!-- Voices tab -->
      <section v-else-if="tab === 'voices'" class="cd__panel">
        <article
          v-for="v in englishVoices"
          :key="v.name"
          class="cd__voice glass"
          :class="{ 'is-selected': settings.selectedVoiceName === v.name }"
        >
          <span class="cd__voice-icon">
            <Icon name="mic" :size="16" />
          </span>
          <div class="cd__voice-info">
            <p class="cd__voice-name">{{ v.name }}</p>
            <p class="cd__voice-meta">{{ v.lang }}{{ v.localService ? ' · local' : ' · cloud' }}</p>
          </div>
          <button
            class="cd__voice-use tap"
            :class="{ 'is-selected': settings.selectedVoiceName === v.name }"
            @click="useVoice(v.name)"
          >
            {{ settings.selectedVoiceName === v.name ? 'Đang dùng' : 'Chọn' }}
          </button>
          <button
            class="cd__voice-play tap"
            :aria-label="'Nghe thử'"
            @click="(e) => previewVoice(v.name, e)"
          >
            <Icon name="play" :size="12" />
          </button>
        </article>

        <div v-if="englishVoices.length === 0" class="cd__empty">
          <span class="cd__empty-icon">
            <Icon name="mic" :size="20" />
          </span>
          <p class="cd__empty-title">Không có giọng English</p>
          <p class="cd__empty-hint">Thiết bị này không có giọng English. Hãy thử Chrome/Edge trên desktop.</p>
        </div>
      </section>

      <!-- Related tab -->
      <section v-else class="cd__panel">
        <article
          v-for="c in related"
          :key="c.id"
          class="cd__related glass tap"
          :style="{ '--c': accent }"
          @click="openRelated(c)"
        >
          <button
            class="cd__related-play tap"
            :aria-label="`Mở chi tiết: ${c.text}`"
          >
            <TopicIcon :name="c.topic" :size="16" />
          </button>
          <div class="cd__related-info">
            <p class="cd__related-text">{{ c.text }}</p>
            <p class="cd__related-meaning">{{ c.meaning }}</p>
          </div>
          <LevelPill :level="c.level" />
        </article>

        <div v-if="related.length === 0" class="cd__empty">
          <span class="cd__empty-icon">
            <Icon name="sparkles" :size="20" />
          </span>
          <p class="cd__empty-title">Chưa có chunk liên quan</p>
          <p class="cd__empty-hint">Mở Library hoặc thêm chunk tự tạo cho chủ đề này.</p>
        </div>
      </section>

      <!-- Action button row -->
      <div class="cd__actions">
        <button
          class="cd__action tap"
          :style="{ '--c': 'var(--color-cyan)' }"
          @click="play"
        >
          <span class="cd__action-icon"><Icon name="play" :size="18" /></span>
          <span class="cd__action-label">Phát</span>
        </button>
        <button
          class="cd__action tap"
          :style="{ '--c': 'var(--color-violet)' }"
          @click="addToQueue"
        >
          <span class="cd__action-icon"><Icon name="queue" :size="18" /></span>
          <span class="cd__action-label">Vào queue</span>
        </button>
        <button
          class="cd__action tap"
          :style="{ '--c': p?.starred ? 'var(--color-amber)' : 'var(--color-text-2)' }"
          @click="toggleStar"
        >
          <span class="cd__action-icon">
            <Icon :name="p?.starred ? 'star-filled' : 'star'" :size="18" />
          </span>
          <span class="cd__action-label">{{ p?.starred ? 'Bỏ sao' : 'Sao' }}</span>
        </button>
      </div>

      <div class="cd__times">
        <p>
          <span>Lần cuối nghe</span>
          <strong class="mono">{{ fmtDate(p?.lastListenedAt) }}</strong>
        </p>
        <p>
          <span>Đến hạn ôn</span>
          <strong class="mono">{{ fmtDate(p?.nextReviewAt) }}</strong>
        </p>
      </div>

      <div v-if="chunk.tags.length > 0" class="cd__tags">
        <span v-for="t in chunk.tags" :key="t" class="cd__tag">#{{ t }}</span>
      </div>
    </div>
  </AppSheet>
</template>

<style scoped>
.cd {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 16px;
}

/* Hero */
.cd__hero {
  position: relative;
  padding: 22px;
  border-radius: 22px;
  overflow: hidden;
  background:
    linear-gradient(
      160deg,
      color-mix(in oklch, var(--accent) 30%, transparent) 0%,
      color-mix(in oklch, var(--accent) 8%, transparent) 100%
    ),
    var(--color-surface-2);
  border: 1px solid color-mix(in oklch, var(--accent) 26%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cd__hero::after {
  content: '';
  position: absolute;
  width: 140px;
  height: 140px;
  right: -20px;
  top: -20px;
  background: color-mix(in oklch, var(--accent) 35%, transparent);
  filter: blur(40px);
  pointer-events: none;
  z-index: 0;
}
.cd__hero > * {
  position: relative;
  z-index: 1;
}
.cd__hero-dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-amber);
  box-shadow: 0 0 0 2px var(--color-bg-1);
  z-index: 2;
}
.cd__hero-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cd__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-3);
  text-transform: capitalize;
  letter-spacing: 0.04em;
}
.cd__hero-text {
  margin: 4px 0 0;
  font-family: var(--font-ui);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.015em;
  color: var(--color-text-1);
}
.cd__hero-meaning {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-2);
  line-height: 1.4;
}
.cd__hero-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.cd__hero-play {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px -12px rgba(34, 211, 238, 0.55);
}
.cd__waves {
  display: inline-flex;
  align-items: center;
  color: var(--color-cyan);
  opacity: 0.5;
}
.cd__hero-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cd__hero-star {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__hero-star.is-on {
  color: var(--color-amber);
  border-color: color-mix(in oklch, var(--color-amber) 35%, transparent);
}

/* Stats strip 4-col */
.cd__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 12px;
}
.cd__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cd__stat + .cd__stat {
  border-left: 1px solid var(--color-border-1);
}
.cd__stat-value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.cd__stat-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

/* Tabs */
.cd__tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 12px;
}
.cd__tab {
  padding: 9px 8px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text-3);
  background: transparent;
}
.cd__tab.is-active {
  color: var(--color-cyan);
  background: var(--color-surface-3);
}

.cd__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 80px;
}

/* Example row */
.cd__example {
  position: relative;
  padding: 14px;
  display: grid;
  grid-template-columns: auto 1fr 32px;
  gap: 8px 12px;
  align-items: center;
}
.cd__example-ctx {
  grid-column: 1;
  grid-row: 1;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  color: var(--color-cyan);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 35%, transparent);
  width: max-content;
}
.cd__example-text {
  grid-column: 1 / span 2;
  grid-row: 2;
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--color-text-1);
}
.cd__example-vi {
  grid-column: 1 / span 2;
  grid-row: 3;
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.4;
}
.cd__example-play {
  grid-column: 3;
  grid-row: 1 / span 3;
  align-self: start;
  margin-top: 2px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__hl {
  background: color-mix(in oklch, var(--color-cyan) 22%, transparent);
  color: color-mix(in oklch, var(--color-cyan) 90%, white);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

/* Voice row */
.cd__voice {
  display: grid;
  grid-template-columns: 38px 1fr auto 34px;
  align-items: center;
  gap: 10px;
  padding: 12px;
}
.cd__voice.is-selected {
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
  background: color-mix(in oklch, var(--color-cyan) 8%, transparent);
}
.cd__voice-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--color-surface-2);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__voice.is-selected .cd__voice-icon {
  background: var(--grad-primary);
  color: white;
}
.cd__voice-info {
  min-width: 0;
}
.cd__voice-name {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cd__voice-meta {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
  font-family: var(--font-mono);
}
.cd__voice-use {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  font-size: 12px;
  font-weight: 700;
}
.cd__voice-use.is-selected {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
.cd__voice-play {
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

/* Related row */
.cd__related {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  gap: 10px;
  padding: 10px 12px;
  align-items: center;
}
.cd__related-play {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: color-mix(in oklch, var(--c, var(--color-cyan)) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--c, var(--color-cyan)) 28%, transparent);
  color: color-mix(in oklch, var(--c, var(--color-cyan)) 90%, white);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__related-info {
  min-width: 0;
}
.cd__related-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cd__related-meaning {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Action row */
.cd__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cd__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 14px;
  background: color-mix(in oklch, var(--c) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--c) 25%, transparent);
  color: color-mix(in oklch, var(--c) 90%, white);
}
.cd__action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__action-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.cd__times {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.cd__times p {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cd__times span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.cd__times strong {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-1);
}

.cd__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cd__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 11px;
  color: var(--color-text-3);
}

/* Empty fallback */
.cd__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 20px 16px;
}
.cd__empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cd__empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.cd__empty-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  max-width: 260px;
}
</style>
