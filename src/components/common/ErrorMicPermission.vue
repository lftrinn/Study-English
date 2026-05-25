<script setup lang="ts">
import EmptyState from './EmptyState.vue';

defineEmits<{ grant: []; skip: [] }>();
</script>

<template>
  <EmptyState
    icon="mic"
    tone="amber"
    title="Cần quyền microphone"
    hint="Speaking practice ghi âm giọng nói cục bộ trên máy — không tải lên đâu cả."
  >
    <button class="btn tap state-primary" @click="$emit('grant')">Cho phép micro</button>
    <button class="btn tap state-secondary" @click="$emit('skip')">Bỏ qua speaking</button>
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
    0 10px 28px rgba(79, 70, 229, 0.42),
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
