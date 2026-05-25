<script setup lang="ts">
defineEmits<{ retry: []; continue: [] }>();
</script>

<template>
  <div class="offline">
    <div class="offline__glyph">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5C8 7 8 17 12 20.5" />
        <path d="M12 3.5c4 3.5 4 13.5 0 17" />
      </svg>
      <span class="offline__slash" aria-hidden="true" />
    </div>
    <h3 class="offline__title">Bạn đang offline</h3>
    <p class="offline__hint">Chunk đã cache vẫn nghe được. Kết nối lại để sync tiến độ và tải audio mới.</p>
    <div class="offline__actions">
      <button class="btn tap state-primary" @click="$emit('retry')">Thử lại</button>
      <button class="btn tap state-secondary" @click="$emit('continue')">Tiếp tục offline</button>
    </div>
  </div>
</template>

<style scoped>
.offline {
  padding: 40px 24px;
  max-width: 360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}
.offline__glyph {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  background: linear-gradient(135deg, rgba(251, 113, 133, 0.22), rgba(251, 113, 133, 0.06));
  border: 1px solid color-mix(in oklch, var(--color-rose) 30%, transparent);
  color: var(--color-rose);
}
.offline__slash {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.offline__slash::after {
  content: '';
  width: 2px;
  height: 80px;
  background: var(--color-rose);
  transform: rotate(-35deg);
  border-radius: 2px;
}
.offline__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-1);
}
.offline__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-3);
}
.offline__actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
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
