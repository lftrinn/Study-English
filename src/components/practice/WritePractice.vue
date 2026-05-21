<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { Chunk } from '@/types/chunk';
import type { AnswerCheckResult } from '@/types/practice';

import { answerCheckService } from '@/services/answerCheckService';
import TopicChip from '@/components/chunk/TopicChip.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';
import AnswerDiff from './AnswerDiff.vue';

const props = defineProps<{
  chunk: Chunk;
  ignoreCase: boolean;
  ignorePunctuation: boolean;
  strict: boolean;
}>();

const emit = defineEmits<{
  submit: [{ chunk: Chunk; userAnswer: string; result: AnswerCheckResult }];
  next: [];
}>();

const value = ref('');
const result = ref<AnswerCheckResult | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const submitted = computed(() => result.value !== null);

watch(
  () => props.chunk.id,
  () => {
    value.value = '';
    result.value = null;
    void nextTick(() => inputRef.value?.focus());
  },
  { immediate: true },
);

function submit() {
  if (value.value.trim().length === 0) return;
  const r = answerCheckService.check(props.chunk.text, value.value, {
    ignoreCase: props.ignoreCase,
    ignorePunctuation: props.ignorePunctuation,
    strict: props.strict,
  });
  result.value = r;
  emit('submit', { chunk: props.chunk, userAnswer: value.value, result: r });
}

function next() {
  emit('next');
}

function showHint() {
  if (value.value.trim().length === 0) {
    value.value = answerCheckService.firstLetterHint(props.chunk.text);
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (submitted.value) next();
    else submit();
  }
}
</script>

<template>
  <article class="wp glass-strong">
    <header class="wp__head">
      <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
      <LevelPill :level="chunk.level" />
    </header>

    <p class="wp__caption">Tiếng Việt</p>
    <p class="wp__prompt">{{ chunk.meaning }}</p>

    <p class="wp__caption wp__caption--out">Bạn viết English</p>
    <textarea
      ref="inputRef"
      v-model="value"
      class="wp__input"
      rows="3"
      :placeholder="'Gõ chunk bằng English...'"
      :disabled="submitted"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      @keydown="onKey"
    />

    <div v-if="!submitted" class="wp__actions">
      <button class="wp__hint tap" @click="showHint">
        <Icon name="sparkles" :size="14" />
        Gợi ý chữ cái đầu
      </button>
      <AppButton variant="primary" size="md" :disabled="value.trim().length === 0" @click="submit">
        <Icon name="check" :size="14" />
        Kiểm tra
      </AppButton>
    </div>

    <div v-else class="wp__result">
      <p class="wp__result-line">
        <span class="wp__result-badge" :class="{ ok: result?.isCorrect, bad: !result?.isCorrect }">
          {{ result?.isCorrect ? 'Đúng rồi' : 'Cần sửa' }}
        </span>
        <span class="wp__result-meta">{{ Math.round((result?.score ?? 0) * 100) }}% khớp từ</span>
      </p>
      <AnswerDiff v-if="result" :result="result" />

      <details class="wp__expected">
        <summary>Đáp án chuẩn</summary>
        <p>{{ chunk.text }}</p>
      </details>

      <AppButton variant="primary" size="md" block @click="next">
        <Icon name="arrow-right" :size="14" />
        Chunk tiếp theo
      </AppButton>
    </div>
  </article>
</template>

<style scoped>
.wp {
  padding: 18px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wp__head {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.wp__caption {
  margin: 6px 0 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.wp__caption--out {
  margin-top: 10px;
}
.wp__prompt {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.3;
  color: var(--color-text-1);
}
.wp__input {
  width: 100%;
  resize: none;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--color-border-1);
  background: var(--color-surface-1);
  font-family: var(--font-ui);
  font-size: 16px;
  color: var(--color-text-1);
}
.wp__input:focus {
  outline: 2px solid color-mix(in oklch, var(--color-cyan) 40%, transparent);
  outline-offset: 2px;
}

.wp__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}
.wp__hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
}

.wp__result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}
.wp__result-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.wp__result-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.wp__result-badge.ok {
  color: var(--color-emerald);
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
}
.wp__result-badge.bad {
  color: var(--color-rose);
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
}
.wp__result-meta {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-3);
}
.wp__expected {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 12px;
  padding: 10px 14px;
}
.wp__expected summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
.wp__expected p {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
}
</style>
