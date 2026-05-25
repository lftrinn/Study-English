<script setup lang="ts">
import EmptyState from './EmptyState.vue';

defineEmits<{ seed: []; import: [] }>();
</script>

<template>
  <EmptyState
    icon="library"
    tone="cyan"
    title="Thư viện chunk đang trống"
    hint="Chọn một starter pack phù hợp với mục tiêu — bạn có thể thêm chunk tuỳ chỉnh sau."
  >
    <button class="btn tap state-primary" @click="$emit('seed')">Chọn starter pack</button>
    <button class="btn tap state-secondary" @click="$emit('import')">Import từ CSV</button>
  </EmptyState>
</template>

<style scoped>
.state-primary {
  padding: 12px 18px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  background: var(--grad-primary);
  color: #fff;
  text-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.18);
  box-shadow:
    0 10px 28px rgba(34, 211, 238, 0.21),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}
.state-secondary {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
}
</style>
