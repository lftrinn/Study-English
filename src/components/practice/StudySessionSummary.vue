<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';

const props = defineProps<{
  title: string;
  total: number;
  correctCount: number;
  wrongCount: number;
  primaryLabel?: string;
  secondaryLabel?: string;
}>();

const emit = defineEmits<{ primary: []; secondary: [] }>();

const accuracy = computed(() => {
  const total = props.correctCount + props.wrongCount;
  if (total === 0) return 0;
  return Math.round((props.correctCount / total) * 100);
});
</script>

<template>
  <div class="sum glass-strong">
    <p class="text-caption text-text-3">Hoàn thành phiên</p>
    <h2 class="text-title-2">{{ title }}</h2>

    <div class="sum__ring">
      <span class="sum__pct">{{ accuracy }}%</span>
      <span class="sum__pct-label">accuracy</span>
    </div>

    <div class="sum__stats">
      <div>
        <p class="sum__label">Đúng</p>
        <p class="sum__value emerald">{{ correctCount }}</p>
      </div>
      <div>
        <p class="sum__label">Sai</p>
        <p class="sum__value amber">{{ wrongCount }}</p>
      </div>
      <div>
        <p class="sum__label">Tổng</p>
        <p class="sum__value">{{ total }}</p>
      </div>
    </div>

    <div class="sum__actions">
      <AppButton variant="glass" size="md" @click="emit('secondary')">
        <Icon name="shuffle" :size="14" />
        {{ secondaryLabel ?? 'Làm lại' }}
      </AppButton>
      <AppButton variant="primary" size="md" @click="emit('primary')">
        <Icon name="check" :size="14" />
        {{ primaryLabel ?? 'Xong' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.sum {
  padding: 24px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: stretch;
}
.sum__ring {
  align-self: center;
  width: 124px;
  height: 124px;
  border-radius: 50%;
  background:
    conic-gradient(var(--color-cyan) calc(v-bind(accuracy) * 1%), var(--color-surface-2) 0);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}
.sum__ring::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: var(--color-bg-1);
}
.sum__pct,
.sum__pct-label {
  position: relative;
  z-index: 1;
}
.sum__pct {
  font-family: var(--font-ui);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sum__pct-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.sum__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.sum__label {
  margin: 0 0 2px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-3);
  font-weight: 700;
  text-align: center;
}
.sum__value {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.sum__value.emerald {
  color: var(--color-emerald);
}
.sum__value.amber {
  color: var(--color-amber);
}
.sum__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
