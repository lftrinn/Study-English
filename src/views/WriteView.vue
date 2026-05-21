<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { usePracticeStore } from '@/stores/practiceStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import { answerCheckService } from '@/services/answerCheckService';
import type { Chunk } from '@/types/chunk';

import ModeShell from '@/components/layout/ModeShell.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import MiniSwitch from '@/components/common/MiniSwitch.vue';
import PromptBadge from '@/components/common/PromptBadge.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import StudySessionSummary from '@/components/practice/StudySessionSummary.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const practice = usePracticeStore();
const chunks = useChunkStore();
const settings = useSettingsStore();
const ui = useUiStore();

const value = ref('');
const checked = ref(false);
const strict = ref(false);

const current = computed<Chunk | undefined>(() => practice.current);

const result = computed(() => {
  if (!checked.value || !current.value) return null;
  return answerCheckService.check(current.value.text, value.value, {
    ignoreCase: !strict.value,
    ignorePunctuation: !strict.value,
    strict: strict.value,
  });
});

type DiffState = 'ok' | 'typo' | 'case' | 'missing';

const diff = computed<Array<{ word: string; state: DiffState; got?: string }>>(() => {
  if (!checked.value || !current.value) return [];
  const target = current.value.text;
  const tokensT = target.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);
  const tokensI = value.value.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);
  return tokensT.map((w, i) => {
    const g = tokensI[i];
    if (!g) return { word: w, state: 'missing' as const };
    if (g === w) return { word: w, state: 'ok' as const };
    if (g.toLowerCase() === w.toLowerCase()) {
      return { word: w, state: strict.value ? ('case' as const) : ('ok' as const) };
    }
    return { word: w, state: 'typo' as const, got: g };
  });
});

const wrongTokens = computed(() =>
  diff.value.filter((d) => d.state === 'typo' || d.state === 'missing'),
);
const suggestion = computed(() => {
  const wrong = diff.value.find((d) => d.state === 'typo' && d.got);
  if (!wrong || !wrong.got) return null;
  return { from: wrong.got, to: wrong.word };
});

const summaryLabel = computed(() => {
  if (!checked.value) return '';
  if (wrongTokens.value.length === 0) return 'Perfect';
  if (wrongTokens.value.length === 1) return '1 small typo';
  return `${wrongTokens.value.length} chỗ cần sửa`;
});

function startWithFiltered() {
  const list = chunks.filtered.length > 0 ? chunks.filtered : chunks.chunks.slice(0, 12);
  practice.start({ mode: 'write', chunks: list });
}

function shuffleRestart() {
  if (practice.chunks.length === 0) return;
  const arr = [...practice.chunks];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  practice.start({ mode: 'write', chunks: arr });
}

async function playPrompt() {
  if (!current.value) return;
  try {
    await speechService.speak({
      text: current.value.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

async function onCheck() {
  if (!current.value) return;
  checked.value = true;
  const r = result.value;
  if (!r) return;
  await practice.submit({
    chunkId: current.value.id,
    prompt: current.value.meaning,
    expectedAnswer: current.value.text,
    userAnswer: value.value,
    isCorrect: r.isCorrect,
    score: r.score,
  });
}

function skip() {
  practice.advance();
}
function nextChunk() {
  practice.advance();
}

function exit() {
  practice.reset();
  if (window.history.length > 1) router.back();
  else router.replace('/');
}

function openDetail() {
  if (current.value) ui.openChunkDetail(current.value.id);
}

watch(
  () => current.value?.id,
  () => {
    value.value = '';
    checked.value = false;
  },
);

onMounted(() => {
  if (practice.status !== 'active' && chunks.chunks.length > 0) {
    startWithFiltered();
  }
});

const subtitle = computed(() => {
  if (practice.total === 0) return undefined;
  return `${Math.min(practice.index + 1, practice.total)} / ${practice.total}`;
});
</script>

<template>
  <ModeShell title="Write" :subtitle="subtitle" :on-close="exit" :on-more="openDetail">
    <template v-if="practice.status === 'active' && current">
      <div :style="{ padding: '0 20px' }">
        <ProgressBar
          :value="Math.min(practice.index + 1, practice.total)"
          :max="practice.total"
          :height="4"
        />
      </div>

      <div :style="{ flex: 1, overflowY: 'auto', padding: '14px 20px 0' }">
        <!-- Violet prompt card -->
        <div
          :style="{
            padding: '18px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.16), rgba(96,165,250,0.06))',
            border: '1px solid color-mix(in oklch, var(--color-violet) 25%, transparent)',
          }"
        >
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
            <PromptBadge color="#A78BFA" icon="edit" label="Translate to English" />
            <button
              class="btn tap"
              :style="{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text-1)',
              }"
              :aria-label="'Phát mẫu'"
              @click="playPrompt"
            >
              <Icon name="speaker" :size="14" />
            </button>
          </div>
          <div
            :style="{
              fontSize: '22px',
              fontWeight: 700,
              marginTop: '14px',
              lineHeight: 1.3,
            }"
          >{{ current.meaning }}</div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              fontSize: '11px',
              color: 'var(--color-text-3)',
            }"
          >
            <TopicChip :topic="current.topic" size="sm" />
            <LevelPill :level="current.level" />
          </div>
        </div>

        <!-- Textarea -->
        <div :style="{ marginTop: '18px' }">
          <textarea
            v-model="value"
            :placeholder="'Type the English chunk…'"
            :style="{
              width: '100%',
              minHeight: '110px',
              padding: '14px',
              borderRadius: '16px',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-2)',
              color: 'var(--color-text-1)',
              fontSize: '17px',
              fontFamily: 'inherit',
              lineHeight: 1.45,
              outline: 'none',
              resize: 'none',
            }"
            @input="checked = false"
          />
          <div
            :style="{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--color-text-3)',
            }"
          >
            <label :style="{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }">
              <MiniSwitch v-model="strict" accent="var(--color-violet)" size="sm" />
              <span :style="{ color: strict ? 'var(--color-violet)' : 'var(--color-text-3)', fontWeight: 600 }">Strict (case + punctuation)</span>
            </label>
            <span><span class="mono">{{ value.length }}</span> chars</span>
          </div>
        </div>

        <!-- Result -->
        <div v-if="checked && result" class="glass" :style="{ marginTop: '14px', padding: '14px' }">
          <div
            :style="{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-text-3)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              marginBottom: '10px',
            }"
          >
            Result · <span :style="{ color: wrongTokens.length === 0 ? 'var(--color-emerald)' : 'var(--color-amber)' }">{{ summaryLabel }}</span>
          </div>
          <div
            :style="{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 6px',
              fontSize: '16px',
              fontFamily: 'var(--font-mono)',
            }"
          >
            <span
              v-for="(d, i) in diff"
              :key="i"
              :class="`wv-tok wv-tok--${d.state}`"
            >{{ d.word }}</span>
          </div>
          <div
            v-if="suggestion"
            :style="{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
            }"
          >
            <div
              :style="{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-amber)',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
              }"
            >Suggestion</div>
            <div :style="{ fontSize: '13px', marginTop: '4px', color: 'var(--color-text-2)' }">
              Spelling:
              <span :style="{ color: 'var(--color-rose)', textDecoration: 'line-through' }">{{ suggestion.from }}</span>
              →
              <span :style="{ color: 'var(--color-emerald)' }">{{ suggestion.to }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div :style="{ padding: '14px 20px 20px', display: 'flex', gap: '10px' }">
        <button
          class="btn tap glass"
          :style="{ padding: '14px 0', flex: 1, fontSize: '13px', fontWeight: 700 }"
          @click="skip"
        >Skip</button>
        <button
          v-if="!checked"
          class="btn tap"
          :disabled="value.trim().length === 0"
          :style="{
            flex: 2,
            padding: '14px 0',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 700,
            background: 'var(--grad-primary)',
            color: '#fff',
            textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
            boxShadow: '0 10px 28px rgba(34,211,238,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
            opacity: value.trim().length === 0 ? 0.5 : 1,
          }"
          @click="onCheck"
        >Check answer</button>
        <button
          v-else
          class="btn tap"
          :style="{
            flex: 2,
            padding: '14px 0',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 700,
            background: 'var(--grad-primary)',
            color: '#fff',
            textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
            boxShadow: '0 10px 28px rgba(34,211,238,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
          }"
          @click="nextChunk"
        >Tiếp theo →</button>
      </div>
    </template>

    <template v-else-if="practice.status === 'finished'">
      <StudySessionSummary
        title="Tốt lắm!"
        :total="practice.total"
        :correct-count="practice.correctCount"
        :wrong-count="practice.wrongCount"
        primary-label="Xong"
        secondary-label="Trộn và làm lại"
        @primary="exit"
        @secondary="shuffleRestart"
      />
    </template>

    <EmptyState
      v-else
      icon="pencil"
      title="Chưa có chunk để luyện viết"
      hint="Mở Library, lọc chủ đề rồi quay lại."
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
          boxShadow: '0 10px 28px rgba(34,211,238,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset',
        }"
        @click="startWithFiltered"
      >Bắt đầu</button>
    </EmptyState>
  </ModeShell>
</template>

<style scoped>
.wv-tok {
  padding: 4px 9px;
  border-radius: 7px;
  line-height: 1.25;
}
.wv-tok--ok {
  background: rgba(52, 211, 153, 0.15);
  color: #86efac;
}
.wv-tok--typo {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
}
.wv-tok--case {
  background: rgba(96, 165, 250, 0.18);
  color: #93c5fd;
}
.wv-tok--missing {
  background: rgba(251, 113, 133, 0.18);
  color: #fca5a5;
}
</style>
