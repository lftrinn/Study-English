<script setup lang="ts">
import EmptyState from './EmptyState.vue';

defineEmits<{ passive: [] }>();
</script>

<template>
  <EmptyState
    icon="check"
    tone="emerald"
    title="Đã ôn xong hôm nay"
    hint="Không còn chunk nào đến hạn ôn. Quay lại ngày mai — hoặc bắt đầu một phiên Passive Listening."
  >
    <button class="btn tap state-primary" @click="$emit('passive')">Bắt đầu Passive Listening</button>
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
</style>
