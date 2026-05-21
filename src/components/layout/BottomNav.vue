<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

type Tab = {
  key: string;
  label: string;
  to: string;
  icon: string;
};

const route = useRoute();
const router = useRouter();

const tabs: Tab[] = [
  { key: 'home', label: 'Home', to: '/', icon: 'home' },
  { key: 'library', label: 'Library', to: '/library', icon: 'library' },
  { key: 'player', label: 'Player', to: '/player', icon: 'player' },
  { key: 'progress', label: 'Progress', to: '/progress', icon: 'progress' },
  { key: 'settings', label: 'Settings', to: '/settings', icon: 'settings' },
];

const activeTab = computed(() => (route.meta?.tab as string | null | undefined) ?? null);

function go(to: string) {
  if (route.path === to) return;
  router.push(to);
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Bottom navigation">
    <div class="bottom-nav__inner glass-strong">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="bottom-nav__btn tap"
        :class="{ 'is-active': activeTab === t.key }"
        :aria-current="activeTab === t.key ? 'page' : undefined"
        :aria-label="t.label"
        @click="go(t.to)"
      >
        <span class="bottom-nav__icon">
          <svg
            v-if="t.icon === 'home'"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
          </svg>
          <svg
            v-else-if="t.icon === 'library'"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="7" height="7" rx="2" />
            <rect x="14" y="4" width="7" height="7" rx="2" />
            <rect x="3" y="13" width="7" height="7" rx="2" />
            <rect x="14" y="13" width="7" height="7" rx="2" />
          </svg>
          <svg
            v-else-if="t.icon === 'player'"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M10 9v6l5-3z" fill="currentColor" stroke="none" />
          </svg>
          <svg
            v-else-if="t.icon === 'progress'"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 21h18" />
            <rect x="5" y="13" width="3" height="6" rx="1" />
            <rect x="10.5" y="9" width="3" height="10" rx="1" />
            <rect x="16" y="5" width="3" height="14" rx="1" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"
            />
          </svg>
        </span>
        <span class="bottom-nav__label">{{ t.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 60;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  pointer-events: none;
}

.bottom-nav__inner {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px;
  border-radius: 22px;
  box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.5);
}

.bottom-nav__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 14px;
  color: var(--color-text-3);
  min-height: 56px;
  font-family: var(--font-ui);
}

.bottom-nav__btn.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
}

.bottom-nav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
}

.bottom-nav__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
