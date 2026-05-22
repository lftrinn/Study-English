<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';

const router = useRouter();
const chunks = useChunkStore();
const settings = useSettingsStore();
const progress = useProgressStore();

const search = computed({
  get: () => chunks.searchKeyword,
  set: (v: string) => chunks.setSearch(v),
});

function submitSearch() {
  router.push('/library');
}
</script>

<template>
  <div class="dt-tb">
    <div class="dt-tb__nav">
      <button class="btn tap dt-tb__navbtn" @click="router.back()" aria-label="Back">
        <Icon name="chevron-left" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
      <button class="btn tap dt-tb__navbtn" @click="router.forward()" aria-label="Forward">
        <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
    </div>

    <div class="glass dt-tb__search">
      <Icon name="search" :size="14" :style="{ color: 'var(--color-text-3)' }" />
      <input
        v-model="search"
        placeholder="Tìm chunk, chủ đề, voice…"
        @keydown.enter="submitSearch"
      />
      <span class="mono dt-tb__kbd">⌘K</span>
    </div>

    <div class="dt-tb__spacer" />

    <div class="dt-tb__stat">
      <span class="dt-tb__flame">
        <Icon name="flame" :size="12" :style="{ color: '#FB7185' }" />
      </span>
      <span class="mono dt-tb__stat-val">{{ progress.streakDays }}d</span>
      <span class="dt-tb__div" />
      <span class="mono dt-tb__stat-val">{{ progress.todayListenCount }}/{{ settings.dailyGoal }}</span>
    </div>

    <button class="btn tap dt-tb__bell" aria-label="Notifications">
      <Icon name="bell" :size="14" :style="{ color: 'var(--color-text-2)' }" />
    </button>
  </div>
</template>

<style scoped>
.dt-tb {
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  background: var(--color-bg-0);
}
.dt-tb__nav { display: flex; gap: 4px; }
.dt-tb__navbtn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
}
.dt-tb__navbtn:hover { background: var(--color-surface-3); }

.dt-tb__search {
  flex: 1;
  max-width: 480px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 36px;
  border-radius: 10px;
}
.dt-tb__search input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--color-text-1);
  font-size: 13px;
  font-family: inherit;
}
.dt-tb__kbd {
  font-size: 10px;
  color: var(--color-text-4);
  border: 1px solid var(--color-border-1);
  padding: 1px 5px;
  border-radius: 4px;
}
.dt-tb__spacer { flex: 1; }

.dt-tb__stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 99px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
}
.dt-tb__flame {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(251, 113, 133, 0.2);
  display: grid;
  place-items: center;
}
.dt-tb__stat-val { font-size: 12px; font-weight: 700; }
.dt-tb__div {
  width: 1px;
  height: 14px;
  background: var(--color-border-1);
}
.dt-tb__bell {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
}
.dt-tb__bell:hover { background: var(--color-surface-3); }
</style>
