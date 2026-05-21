<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { Chunk } from '@/types/chunk';
import type { AnswerCheckResult } from '@/types/practice';

import { answerCheckService } from '@/services/answerCheckService';
import { speechService } from '@/services/speechService';
import { useSettingsStore } from '@/stores/settingsStore';

import TopicChip from '@/components/chunk/TopicChip.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';
import AnswerDiff from './AnswerDiff.vue';

const props = defineProps<{
  chunk: Chunk;
  autoPlay?: boolean;
}>();

const emit = defineEmits<{
  submit: [{ chunk: Chunk; userAnswer: string; result: AnswerCheckResult }];
  next: [];
}>();

const settings = useSettingsStore();

const value = ref('');
const result = ref<AnswerCheckResult | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const slow = ref(false);
const hintRevealed = ref(false);

const submitted = computed(() => result.value !== null);
const hint = computed(() => answerCheckService.firstLetterHint(props.chunk.text));

async function play() {
  try {
    await speechService.speak({
      text: props.chunk.text,
      voiceName: settings.selectedVoiceName ?? undefined,
      rate: slow.value ? 0.7 : 1,
    });
  } catch {
    // ignore
  }
}

function toggleSlow() {
  slow.value = !slow.value;
}

function revealHint() {
  hintRevealed.value = true;
}

function submit() {
  if (value.value.trim().length === 0) return;
  const r = answerCheckService.check(props.chunk.text, value.value, {
    ignoreCase: true,
    ignorePunctuation: true,
  });
  result.value = r;
  emit('submit', { chunk: props.chunk, userAnswer: value.value, result: r });
}

function next() {
  emit('next');
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (submitted.value) next();
    else submit();
  }
  if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    void play();
  }
}

watch(
  () => props.chunk.id,
  () => {
    value.value = '';
    result.value = null;
    hintRevealed.value = false;
    void nextTick(() => inputRef.value?.focus());
    if (props.autoPlay !== false) void play();
  },
);

onMounted(() => {
  void nextTick(() => inputRef.value?.focus());
  if (props.autoPlay !== false) void play();
});
</script>

<template>
  <article class="dt glass-strong">
    <header class="dt__head">
      <TopicChip :topic-id="chunk.topic" :show-icon="true" />
      <LevelPill :level="chunk.level" />
    </header>

    <div class="dt__player">
      <button class="dt__play tap" :aria-label="'Phát'" @click="play">
        <Icon name="volume" :size="22" />
      </button>
      <button
        class="dt__toggle tap"
        :class="{ 'is-active': slow }"
        :aria-pressed="slow"
        @click="toggleSlow"
      >
        <Icon name="gauge" :size="14" />
        {{ slow ? 'Chậm 0.7×' : 'Bình thường 1×' }}
      </button>
      <button class="dt__toggle tap" :aria-label="'Gợi ý chữ cái đầu'" @click="revealHint">
        <Icon name="sparkles" :size="14" />
        Hint
      </button>
    </div>

    <p v-if="hintRevealed" class="dt__hint mono">{{ hint }}</p>

    <p class="dt__caption">Bạn gõ</p>
    <input
      ref="inputRef"
      v-model="value"
      type="text"
      class="dt__input"
      :placeholder="'Gõ những gì bạn nghe được...'"
      :disabled="submitted"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      @keydown="onKey"
    />

    <div v-if="!submitted" class="dt__actions">
      <AppButton variant="primary" size="md" block :disabled="value.trim().length === 0" @click="submit">
        <Icon name="check" :size="14" />
        Kiểm tra
      </AppButton>
    </div>

    <div v-else class="dt__result">
      <p class="dt__result-line">
        <span class="dt__badge" :class="{ ok: result?.isCorrect, bad: !result?.isCorrect }">
          {{ result?.isCorrect ? 'Đúng rồi' : 'Cần sửa' }}
        </span>
        <span class="dt__result-meta">{{ Math.round((result?.score ?? 0) * 100) }}% khớp từ</span>
      </p>
      <AnswerDiff v-if="result" :result="result" />

      <p class="dt__expected">
        <span class="dt__expected-label">Đáp án</span>
        {{ chunk.text }}
      </p>

      <AppButton variant="primary" size="md" block @click="next">
        <Icon name="arrow-right" :size="14" />
        Chunk tiếp theo
      </AppButton>
    </div>
  </article>
</template>

<style scoped>
.dt {
  padding: 18px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dt__head {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.dt__player {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.dt__play {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px -12px rgba(34, 211, 238, 0.55);
}
.dt__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
}
.dt__toggle.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
}

.dt__hint {
  margin: 0;
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
  font-size: 16px;
  color: var(--color-amber);
}

.dt__caption {
  margin: 6px 0 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.dt__input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--color-border-1);
  background: var(--color-surface-1);
  font-family: var(--font-ui);
  font-size: 16px;
  color: var(--color-text-1);
}
.dt__input:focus {
  outline: 2px solid color-mix(in oklch, var(--color-cyan) 40%, transparent);
  outline-offset: 2px;
}
.dt__actions {
  margin-top: 4px;
}
.dt__result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dt__result-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dt__badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.dt__badge.ok {
  color: var(--color-emerald);
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
}
.dt__badge.bad {
  color: var(--color-rose);
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
}
.dt__result-meta {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-3);
}
.dt__expected {
  margin: 0;
  padding: 10px 14px;
  background: var(--color-surface-1);
  border-radius: 12px;
  border: 1px solid var(--color-border-1);
  font-size: 15px;
  color: var(--color-text-1);
  font-weight: 600;
}
.dt__expected-label {
  display: inline-block;
  margin-right: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
</style>
