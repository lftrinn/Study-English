<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settingsStore';

const router = useRouter();
const settings = useSettingsStore();

function complete() {
  settings.completeOnboarding();
  router.replace('/');
}
</script>

<template>
  <section class="page night-bg">
    <div class="page__hero">
      <p class="text-caption text-text-3">Chào mừng</p>
      <h1 class="text-title-1 grad-text">Chunk Listening Lab</h1>
      <p class="text-body text-text-2">
        Học English bằng cụm từ tái sử dụng. Nghe – ghi nhớ – luyện nói trong vài phút mỗi ngày.
      </p>
    </div>

    <div class="glass page__card">
      <p class="text-body text-text-2">Onboarding chi tiết sẽ được build sau. Bấm để bắt đầu dùng app.</p>
      <button class="page__cta tap" @click="complete">Bắt đầu</button>
    </div>
  </section>
</template>

<style scoped>
.page {
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100vh;
  min-height: 100dvh;
}
.page__hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: env(safe-area-inset-top);
}
.page__card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page__cta {
  align-self: flex-start;
  padding: 12px 22px;
  border-radius: 999px;
  background: var(--grad-primary);
  color: white;
  font-weight: 700;
  letter-spacing: 0.01em;
}
</style>
