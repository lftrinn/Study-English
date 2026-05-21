<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/common/Icon.vue';

type Tab = {
  key: string;
  label: string;
  to: string;
  icon:
    | 'home'
    | 'library'
    | 'headphones'
    | 'target'
    | 'settings';
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
    <div class="bn__inner glass-strong">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="bn__btn tap"
        :class="{ 'is-active': activeTab === t.key }"
        :aria-current="activeTab === t.key ? 'page' : undefined"
        :aria-label="t.label"
        @click="go(t.to)"
      >
        <span class="bn__icon">
          <Icon :name="t.icon" :size="20" />
          <span v-if="activeTab === t.key" class="bn__dot" aria-hidden="true" />
        </span>
        <span class="bn__label">{{ t.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bn {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 60;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, var(--color-bg-0) 90%);
}

.bn__inner {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px;
  border-radius: 22px;
  height: 64px;
  box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.5);
}

.bn__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 16px;
  color: var(--color-text-3);
  font-family: var(--font-ui);
  transition: color 0.12s ease, background 0.12s ease;
}

.bn__btn.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 12%, transparent);
}

.bn__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
}

.bn__dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--color-cyan);
  box-shadow: 0 0 0 2px var(--color-bg-1);
}

.bn__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
