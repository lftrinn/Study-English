<script setup lang="ts">
import type { AnswerCheckResult } from '@/types/practice';

defineProps<{ result: AnswerCheckResult }>();
</script>

<template>
  <div class="diff" role="status">
    <span
      v-for="(t, idx) in result.diff"
      :key="`${idx}-${t.token}`"
      class="diff__token"
      :class="`is-${t.status}`"
    >
      {{ t.token }}
    </span>
  </div>
</template>

<style scoped>
.diff {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  font-family: var(--font-ui);
}
.diff__token {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
}
.diff__token.is-match {
  background: color-mix(in oklch, var(--color-emerald) 18%, transparent);
  color: var(--color-emerald);
}
.diff__token.is-wrong {
  background: color-mix(in oklch, var(--color-rose) 18%, transparent);
  color: var(--color-rose);
  text-decoration: line-through;
  text-decoration-color: color-mix(in oklch, var(--color-rose) 60%, transparent);
}
.diff__token.is-missing {
  background: color-mix(in oklch, var(--color-amber) 18%, transparent);
  color: var(--color-amber);
  outline: 1px dashed color-mix(in oklch, var(--color-amber) 60%, transparent);
}
</style>
