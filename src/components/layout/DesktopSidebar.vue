<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';

const router = useRouter();
const route = useRoute();
const chunks = useChunkStore();
const settings = useSettingsStore();
const progress = useProgressStore();

type NavId = 'home' | 'library' | 'player' | 'practice' | 'progress';
const nav: Array<{ id: NavId; icon: string; label: string; kbd: string; to: string }> = [
  { id: 'home', icon: 'home', label: 'Home', kbd: '⌘1', to: '/' },
  { id: 'library', icon: 'library', label: 'Library', kbd: '⌘2', to: '/library' },
  { id: 'player', icon: 'headphones', label: 'Now playing', kbd: '⌘3', to: '/player' },
  { id: 'practice', icon: 'brain', label: 'Practice', kbd: '⌘4', to: '/practice' },
  { id: 'progress', icon: 'target', label: 'Progress', kbd: '⌘5', to: '/progress' },
];

const activeTab = computed(() => (route.meta?.tab as string | undefined) ?? '');

const initial = computed(() => (settings.displayName?.trim().charAt(0) || 'M').toUpperCase());

function go(to: string) {
  if (route.path !== to) router.push(to);
}

function goTopic(id: string) {
  chunks.setTopic(id);
  router.push('/library');
}
</script>

<template>
  <aside class="dt-sb">
    <!-- Logo block -->
    <div class="dt-sb__brand">
      <IconBlock icon="headphones" :size="34" color="#22D3EE" variant="gradient" gradient="var(--grad-primary)" />
      <div class="dt-sb__brand-text">
        <div class="dt-sb__brand-title">Chunk Listening</div>
        <div class="dt-sb__brand-sub">Lab · v1.0</div>
      </div>
    </div>

    <!-- Main nav -->
    <nav class="dt-sb__nav">
      <button
        v-for="n in nav"
        :key="n.id"
        class="btn tap dt-sb__btn"
        :class="{ 'is-active': activeTab === n.id }"
        @click="go(n.to)"
      >
        <span v-if="activeTab === n.id" class="dt-sb__rail" aria-hidden="true" />
        <Icon
          :name="n.icon as any"
          :size="17"
          :style="{ color: activeTab === n.id ? 'var(--color-cyan)' : 'var(--color-text-3)' }"
        />
        <span class="dt-sb__lbl" :style="{ fontWeight: activeTab === n.id ? 700 : 600 }">{{ n.label }}</span>
        <span class="dt-sb__kbd mono">{{ n.kbd }}</span>
      </button>
    </nav>

    <div class="dt-sb__divider" />

    <div class="dt-sb__sec">Topics</div>
    <div class="dt-sb__topics no-scrollbar">
      <button
        v-for="t in chunks.topicWithCounts"
        :key="t.id"
        class="btn tap dt-sb__topic"
        @click="goTopic(t.id)"
      >
        <span
          class="dt-sb__topic-icon"
          :style="{ background: `color-mix(in oklch, ${t.color} 20%, transparent)`, color: t.color }"
        >
          <TopicIcon :name="t.id" :size="12" />
        </span>
        <span class="dt-sb__topic-name">{{ t.name }}</span>
        <span class="mono dt-sb__topic-count">{{ t.count }}</span>
      </button>
    </div>

    <!-- User pill -->
    <div class="dt-sb__user">
      <div class="dt-sb__avatar">{{ initial }}</div>
      <div class="dt-sb__user-meta">
        <div class="dt-sb__user-name">{{ settings.displayName || 'Bạn' }}</div>
        <div class="dt-sb__user-sub">{{ progress.streakDays }}-day streak 🔥</div>
      </div>
      <button class="btn tap dt-sb__cog" @click="go('/settings')" aria-label="Settings">
        <Icon name="settings" :size="14" :style="{ color: 'var(--color-text-3)' }" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.dt-sb {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 14px;
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-border-1);
  overflow: hidden;
  min-width: 0;
}
.dt-sb__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 18px;
}
.dt-sb__brand-text { min-width: 0; }
.dt-sb__brand-title { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; }
.dt-sb__brand-sub { font-size: 11px; color: var(--color-text-3); }

.dt-sb__nav { display: flex; flex-direction: column; gap: 2px; }
.dt-sb__btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-2);
  border: 1px solid transparent;
  text-align: left;
}
.dt-sb__btn.is-active {
  background: var(--color-surface-3);
  color: var(--color-text-1);
  border-color: var(--color-border-2);
}
.dt-sb__rail {
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: var(--color-cyan);
}
.dt-sb__lbl { flex: 1; font-size: 13px; }
.dt-sb__kbd { font-size: 10px; color: var(--color-text-4); }

.dt-sb__divider {
  height: 1px;
  background: var(--color-border-1);
  margin: 14px 6px;
}

.dt-sb__sec {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0 10px 6px;
}

.dt-sb__topics {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.dt-sb__topic {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 9px;
  color: var(--color-text-2);
  text-align: left;
  background: transparent;
}
.dt-sb__topic:hover { background: var(--color-surface-1); }
.dt-sb__topic-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.dt-sb__topic-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dt-sb__topic-count { font-size: 10px; color: var(--color-text-4); }

.dt-sb__user {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.dt-sb__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--grad-primary);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #0b0f22;
  flex-shrink: 0;
}
.dt-sb__user-meta { flex: 1; min-width: 0; }
.dt-sb__user-name {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dt-sb__user-sub { font-size: 10px; color: var(--color-text-3); }
.dt-sb__cog {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: transparent;
}
.dt-sb__cog:hover { background: var(--color-surface-2); }
</style>
