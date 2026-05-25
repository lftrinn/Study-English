<script setup lang="ts">
/**
 * Literal port of chunk-detail.jsx ChunkDetail (lines 7-196).
 * Inline styles copied verbatim through :style binding; tab + voice
 * state wired to local refs; data hooks to chunkStore / progressStore.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { speechService } from '@/services/speechService';
import type { Chunk, ChunkExample } from '@/types/chunk';

import AppSheet from '@/components/common/AppSheet.vue';
import TopicChip from './TopicChip.vue';
import LevelPill from './LevelPill.vue';
import Icon from '@/components/common/Icon.vue';

type TabKey = 'examples' | 'voices' | 'related';

const ui = useUiStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const settings = useSettingsStore();
const practice = usePracticeStore();
const router = useRouter();

const tab = ref<TabKey>('examples');
const englishVoices = ref<SpeechSynthesisVoice[]>([]);

const open = computed(() => ui.sheet === 'chunk-detail' && Boolean(ui.sheetChunkId));
const chunk = computed<Chunk | undefined>(() =>
  ui.sheetChunkId ? chunks.byId(ui.sheetChunkId) : undefined,
);
const p = computed(() => (chunk.value ? progress.byId(chunk.value.id) : undefined));
const topic = computed(() =>
  chunk.value ? chunks.topicById(chunk.value.topic) : undefined,
);
const accent = computed(() => topic.value?.color ?? '#22D3EE');

const accuracy = computed(() => {
  const cur = p.value;
  if (!cur) return null;
  const total = cur.correctCount + cur.wrongCount;
  if (total === 0) return null;
  return Math.round((cur.correctCount / total) * 100);
});
const statusLabel = computed(() => {
  const s = p.value?.status ?? 'new';
  return s.charAt(0).toUpperCase() + s.slice(1);
});

const examples = computed<Array<{ ctx: string; en: string; vi: string }>>(() => {
  if (!chunk.value) return [];
  if (chunk.value.examples && chunk.value.examples.length > 0) {
    const labels: Record<ChunkExample['context'], string> = {
      standup: 'Standup',
      slack: 'Slack',
      client: 'Client',
      interview: 'Interview',
      toeic: 'TOEIC',
      general: 'General',
    };
    return chunk.value.examples.map((e) => ({
      ctx: labels[e.context] ?? e.context,
      en: e.text,
      vi: e.meaning,
    }));
  }
  // Synthetic examples mirroring the design's ExamplesTab fallback.
  const lowered = chunk.value.text.toLowerCase().replace(/\.$/, '');
  return [
    {
      ctx: 'Standup',
      en: `Quick update — ${lowered} and should have a PR by EOD.`,
      vi: 'Cập nhật nhanh — sẽ có PR trước cuối ngày.',
    },
    {
      ctx: 'Slack',
      en: `Hey @lead, ${lowered} — will let you know once it's merged.`,
      vi: 'Sẽ báo lại khi merge xong.',
    },
    {
      ctx: 'Client',
      en: `${chunk.value.text} I'll share the demo link once staging is updated.`,
      vi: 'Tôi sẽ gửi link demo khi staging được cập nhật.',
    },
  ];
});

const related = computed<Chunk[]>(() => {
  if (!chunk.value) return [];
  return chunks.chunks
    .filter((c) => c.topic === chunk.value!.topic && c.id !== chunk.value!.id)
    .slice(0, 4);
});

function close() {
  ui.closeSheet();
}

function highlightSegments(text: string, needle: string): Array<{ text: string; hl: boolean }> {
  if (!needle) return [{ text, hl: false }];
  const lower = text.toLowerCase();
  const target = needle.toLowerCase().replace(/\.$/, '');
  const idx = lower.indexOf(target);
  if (idx < 0) return [{ text, hl: false }];
  return [
    { text: text.slice(0, idx), hl: false },
    { text: text.slice(idx, idx + target.length), hl: true },
    { text: text.slice(idx + target.length), hl: false },
  ];
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
    /* ignore */
  }
}
async function playExample(text: string) {
  try {
    await speechService.speak({
      text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    /* ignore */
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
    /* ignore */
  }
}
function useVoice(name: string) {
  settings.selectedVoiceName = name;
}
function toggleStar() {
  if (!chunk.value) return;
  void progress.toggleStarred(chunk.value.id);
}
function openRelated(c: Chunk) {
  ui.openChunkDetail(c.id);
  tab.value = 'examples';
}
function actionFlashcard() {
  if (!chunk.value) return;
  practice.start({ mode: 'flashcard', chunks: [chunk.value] });
  close();
  router.push('/study/flashcard');
}
function actionWrite() {
  if (!chunk.value) return;
  practice.start({ mode: 'write', chunks: [chunk.value] });
  close();
  router.push('/study/write');
}
function actionAddQueue() {
  if (!chunk.value) return;
  player.queue.push(chunk.value);
}

const fmtLastListened = computed(() => {
  const iso = p.value?.lastListenedAt;
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diffMs / (24 * 3600 * 1000));
  if (day < 1) return 'today';
  if (day === 1) return '1d ago';
  return `${day}d ago`;
});
const fmtNextReview = computed(() => {
  const iso = p.value?.nextReviewAt;
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const day = Math.floor(diffMs / (24 * 3600 * 1000));
  if (diffMs < 0) return 'now';
  if (day < 1) return 'today';
  if (day === 1) return 'tomorrow';
  return `${day}d`;
});

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
    <div v-if="chunk">
      <!-- Hero card -->
      <div
        :style="{
          margin: '-4px -4px 0',
          padding: '22px',
          borderRadius: '22px',
          background: `linear-gradient(160deg, color-mix(in oklch, ${accent} 30%, transparent), color-mix(in oklch, ${accent} 8%, transparent)), var(--color-surface-2)`,
          border: `1px solid color-mix(in oklch, ${accent} 26%, transparent)`,
          position: 'relative',
          overflow: 'hidden',
        }"
      >
        <div
          :style="{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: `radial-gradient(circle, color-mix(in oklch, ${accent} 35%, transparent), transparent 70%)`,
            filter: 'blur(8px)',
          }"
        />
        <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }">
          <TopicChip :topic-id="chunk.topic" :show-icon="true" size="sm" />
          <LevelPill :level="chunk.level" />
          <span
            :style="{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--color-text-3)',
            }"
          >
            <span class="dot" :class="`dot-${p?.status ?? 'new'}`" />
            {{ statusLabel }}
          </span>
        </div>
        <div
          :style="{
            fontSize: '24px',
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '-0.015em',
            marginTop: '14px',
            position: 'relative',
          }"
        >{{ chunk.text }}</div>
        <div
          v-if="chunk.phonetic"
          :style="{
            fontSize: '14px',
            color: 'var(--color-text-3)',
            fontStyle: 'italic',
            marginTop: '6px',
            letterSpacing: '0.01em',
            position: 'relative',
          }"
        >/{{ chunk.phonetic.replace(/^\/|\/$/g, '') }}/</div>
        <div
          :style="{ fontSize: '14px', color: 'var(--color-text-2)', marginTop: '8px', position: 'relative' }"
        >{{ chunk.meaning }}</div>

        <!-- Pronounce row -->
        <div
          :style="{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '18px',
            position: 'relative',
          }"
        >
          <button
            class="btn tap"
            :style="{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'grid',
              placeItems: 'center',
              color: '#0B0F22',
              boxShadow: '0 8px 30px rgba(34,211,238,0.20), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }"
            @click="playSelf"
          >
            <Icon name="play" :size="20" :style="{ marginLeft: '2px' }" />
          </button>
          <div :style="{ flex: 1 }">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '2px', color: accent, height: '26px' }">
              <span
                v-for="i in 4"
                :key="i"
                :style="{ display: 'inline-block', width: '3px', height: '11.7px', background: 'currentColor', borderRadius: '2px', opacity: 0.4 }"
              />
            </div>
            <div
              class="mono"
              :style="{ fontSize: '10px', color: 'var(--color-text-3)', marginTop: '4px' }"
            >0:00 · 0:02.3 · {{ settings.selectedVoiceName ?? 'Aria' }} · 1.00×</div>
          </div>
          <button
            class="btn tap"
            :style="{
              width: '36px',
              height: '36px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '12px',
              color: p?.starred ? '#FCD34D' : 'var(--color-text-3)',
            }"
            :aria-pressed="Boolean(p?.starred)"
            @click="toggleStar"
          >
            <Icon :name="p?.starred ? 'star-filled' : 'star'" :size="18" />
          </button>
        </div>
      </div>

      <!-- Stats strip -->
      <div
        class="glass"
        :style="{ marginTop: '12px', padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }"
      >
        <div :style="{ textAlign: 'center' }">
          <div class="mono" :style="{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.005em' }">{{ p?.listenCount ?? 0 }}</div>
          <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '2px' }">Listens</div>
        </div>
        <div :style="{ textAlign: 'center' }">
          <div class="mono" :style="{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.005em' }">{{ accuracy === null ? '—' : `${accuracy}%` }}</div>
          <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '2px' }">Accuracy</div>
        </div>
        <div :style="{ textAlign: 'center' }">
          <div :style="{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.005em' }">{{ fmtLastListened }}</div>
          <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '2px' }">Last</div>
        </div>
        <div :style="{ textAlign: 'center' }">
          <div :style="{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.005em' }">{{ fmtNextReview }}</div>
          <div :style="{ fontSize: '10px', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '2px' }">Next</div>
        </div>
      </div>

      <!-- Tabs -->
      <div
        :style="{
          display: 'flex',
          gap: '4px',
          marginTop: '16px',
          padding: '3px',
          background: 'var(--color-surface-1)',
          borderRadius: '12px',
          border: '1px solid var(--color-border-1)',
        }"
      >
        <button
          v-for="[k, l] in (['examples', 'In context'] as const, [['examples','In context'],['voices','Voices'],['related','Related']] as const)"
          :key="k"
          class="btn tap"
          :style="{
            flex: 1,
            padding: '9px 0',
            borderRadius: '9px',
            fontSize: '12px',
            fontWeight: 700,
            background: tab === k ? 'var(--color-surface-3)' : 'transparent',
            color: tab === k ? 'var(--color-text-1)' : 'var(--color-text-3)',
          }"
          @click="tab = k as TabKey"
        >{{ l }}</button>
      </div>

      <!-- Tab body -->
      <div :style="{ marginTop: '14px' }">
        <!-- Examples -->
        <div v-if="tab === 'examples'" :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
          <div
            v-for="(e, i) in examples"
            :key="i"
            class="glass"
            :style="{ padding: '12px' }"
          >
            <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }">
              <span
                :style="{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--color-cyan)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(34,211,238,0.12)',
                  border: '1px solid rgba(34,211,238,0.25)',
                }"
              >{{ e.ctx }}</span>
              <button
                class="btn tap"
                :style="{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'var(--color-surface-3)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-text-1)',
                }"
                @click="playExample(e.en)"
              >
                <Icon name="play" :size="11" :style="{ marginLeft: '1px' }" />
              </button>
            </div>
            <div :style="{ fontSize: '14px', lineHeight: 1.4 }">
              <template v-for="(seg, si) in highlightSegments(e.en, chunk.text)" :key="si">
                <span
                  v-if="seg.hl"
                  :style="{
                    background: 'color-mix(in oklch, var(--color-cyan) 22%, transparent)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    color: 'color-mix(in oklch, var(--color-cyan) 95%, white)',
                    fontWeight: 600,
                  }"
                >{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </template>
            </div>
            <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '6px' }">{{ e.vi }}</div>
          </div>
        </div>

        <!-- Voices -->
        <div v-else-if="tab === 'voices'" :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
          <p
            v-if="englishVoices.length === 0"
            :style="{ fontSize: '13px', color: 'var(--color-text-3)' }"
          >Không tìm thấy giọng English trên thiết bị này.</p>
          <div
            v-for="v in englishVoices"
            :key="v.name"
            class="glass"
            :style="{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: settings.selectedVoiceName === v.name ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
            }"
          >
            <div
              :style="{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: settings.selectedVoiceName === v.name ? 'var(--grad-primary)' : 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                color: settings.selectedVoiceName === v.name ? '#0B0F22' : 'var(--color-text-1)',
              }"
            >
              <Icon name="mic" :size="16" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ v.name }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)' }">{{ v.lang }}{{ v.localService ? ' · local' : ' · cloud' }}</div>
            </div>
            <button
              class="btn tap"
              :style="{
                padding: '7px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                background: settings.selectedVoiceName === v.name ? 'var(--color-cyan)' : 'var(--color-surface-3)',
                color: settings.selectedVoiceName === v.name ? '#0B0F22' : 'var(--color-text-1)',
              }"
              @click="useVoice(v.name)"
            >{{ settings.selectedVoiceName === v.name ? 'Selected' : 'Use' }}</button>
            <button
              class="btn tap"
              :style="{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text-1)',
              }"
              @click="(e) => previewVoice(v.name, e)"
            >
              <Icon name="play" :size="12" :style="{ marginLeft: '1px' }" />
            </button>
          </div>
        </div>

        <!-- Related -->
        <div v-else :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <div
            v-for="c in related"
            :key="c.id"
            class="glass tap"
            :style="{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }"
            @click="openRelated(c)"
          >
            <div
              :style="{
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                background: 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'var(--color-cyan)',
              }"
            >
              <Icon name="play" :size="11" :style="{ marginLeft: '1px' }" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.text }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.meaning }}</div>
            </div>
            <LevelPill :level="c.level" />
          </div>
          <div
            v-if="related.length === 0"
            :style="{ padding: '16px', fontSize: '12px', color: 'var(--color-text-3)', textAlign: 'center' }"
          >Chưa có chunk liên quan.</div>
        </div>
      </div>

      <!-- Bottom action row -->
      <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '18px' }">
        <button
          class="btn tap"
          :style="{
            padding: '12px',
            borderRadius: '14px',
            background: 'color-mix(in oklch, var(--color-cyan) 14%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-cyan) 25%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-cyan)',
          }"
          @click="actionFlashcard"
        >
          <Icon name="cards" :size="18" />
          <span :style="{ fontSize: '11px', fontWeight: 700 }">Flashcard</span>
        </button>
        <button
          class="btn tap"
          :style="{
            padding: '12px',
            borderRadius: '14px',
            background: 'color-mix(in oklch, var(--color-violet) 14%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-violet) 25%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-violet)',
          }"
          @click="actionWrite"
        >
          <Icon name="edit" :size="18" />
          <span :style="{ fontSize: '11px', fontWeight: 700 }">Write</span>
        </button>
        <button
          class="btn tap"
          :style="{
            padding: '12px',
            borderRadius: '14px',
            background: 'color-mix(in oklch, var(--color-emerald) 14%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-emerald) 25%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-emerald)',
          }"
          @click="actionAddQueue"
        >
          <Icon name="headphones" :size="18" />
          <span :style="{ fontSize: '11px', fontWeight: 700 }">Add to queue</span>
        </button>
      </div>
    </div>
  </AppSheet>
</template>
