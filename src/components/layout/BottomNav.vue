<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/common/Icon.vue';

type Tab = {
  key: string;
  label: string;
  to: string;
  icon: 'home' | 'library' | 'headphones' | 'target' | 'settings';
};

const route = useRoute();
const router = useRouter();

const tabs: Tab[] = [
  { key: 'home', label: 'Home', to: '/', icon: 'home' },
  { key: 'library', label: 'Library', to: '/library', icon: 'library' },
  { key: 'player', label: 'Player', to: '/player', icon: 'headphones' },
  { key: 'progress', label: 'Progress', to: '/progress', icon: 'target' },
  { key: 'settings', label: 'Settings', to: '/settings', icon: 'settings' },
];

const activeTab = computed(() => (route.meta?.tab as string | null | undefined) ?? null);

function go(to: string) {
  if (route.path === to) return;
  router.push(to);
}
</script>

<template>
  <nav class="bn" aria-label="Bottom navigation">
    <div class="bn__inner">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="bn__btn tap"
        :class="{ 'is-active': activeTab === t.key }"
        :aria-current="activeTab === t.key ? 'page' : undefined"
        :aria-label="t.label"
        @click="go(t.to)"
      >
        <Icon :name="t.icon" :size="18" />
        <span class="bn__label">{{ t.label }}</span>
        <span v-if="activeTab === t.key" class="bn__dot" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bn {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  padding: 8px 12px calc(24px + env(safe-area-inset-bottom));
  pointer-events: none;
  background: linear-gradient(180deg, transparent, var(--color-bg-0) 60%);
}

.bn__inner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in oklch, var(--color-bg-1) 90%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--color-border-1);
  border-radius: 22px;
  padding: 6px;
  height: 64px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
}

.bn__btn {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 16px;
  color: var(--color-text-3);
  font-family: var(--font-ui);
  transition: background 0.15s ease, color 0.15s ease;
}

.bn__btn.is-active {
  background: var(--color-surface-3);
  color: var(--color-cyan);
}

.bn__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.bn__dot {
  position: absolute;
  top: 4px;
  right: 12px;
  width: 5px;
  height: 5px;
  border-radius: 3px;
  background: var(--color-cyan);
}
</style>
