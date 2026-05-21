<script setup lang="ts">
import EmptyState from './EmptyState.vue';

defineEmits<{ reset: [] }>();
</script>

<template>
  <EmptyState
    icon="search"
    tone="violet"
    title="Không có chunk nào khớp"
    hint="Thử bỏ bớt một bộ lọc, hoặc mở rộng từ khoá tìm kiếm."
  >
    <button class="btn tap state-primary" @click="$emit('reset')">Xoá bộ lọc</button>
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
    0 10px 28px rgba(34, 211, 238, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 -1px 0 rgba(0, 0, 0, 0.18) inset;
}
</style>
