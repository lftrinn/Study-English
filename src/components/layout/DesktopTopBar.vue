<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';

const router = useRouter();
const route = useRoute();
const chunks = useChunkStore();
const settings = useSettingsStore();
const progress = useProgressStore();

const search = computed({
  get: () => chunks.searchKeyword,
  set: (v: string) => chunks.setSearch(v),
});

function submitSearch() {
  if (route.path !== '/library') router.push('/library');
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/');
}
function goForward() {
  router.forward();
}

const bellOpen = ref(false);

const notifications = computed(() => {
  const list: Array<{ icon: string; color: string; title: string; sub: string }> = [];
  const goal = Math.max(0, settings.dailyGoal - progress.todayListenCount);
  if (goal > 0) {
    list.push({
      icon: 'target',
      color: '#22D3EE',
      title: `Còn ${goal} chunks để đạt mục tiêu hôm nay`,
      sub: `${progress.todayListenCount} / ${settings.dailyGoal}`,
    });
  } else {
    list.push({ icon: 'check', color: '#34D399', title: 'Đã đạt mục tiêu hôm nay 🎉', sub: 'Giữ chuỗi streak nhé' });
  }
  if (progress.weakChunkIds.length > 0) {
    list.push({
      icon: 'wave',
      color: '#FB7185',
      title: `${progress.weakChunkIds.length} chunks yếu cần ôn lại`,
      sub: 'Mở Practice → Review weak',
    });
  }
  if (progress.streakDays > 0 && progress.todayListenCount === 0) {
    list.push({
      icon: 'flame',
      color: '#F59E0B',
      title: `Giữ streak ${progress.streakDays} ngày`,
      sub: 'Nghe vài chunks trước nửa đêm',
    });
  }
  return list;
});

function closeBell() {
  bellOpen.value = false;
}
function bellAction() {
  bellOpen.value = false;
  router.push('/practice');
}
</script>

<template>
  <div class="dt-tb">
    <div class="dt-tb__nav">
      <button class="btn tap dt-tb__navbtn" @click="goBack" aria-label="Back">
        <Icon name="chevron-left" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
      <button class="btn tap dt-tb__navbtn" @click="goForward" aria-label="Forward">
        <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-2)' }" />
      </button>
    </div>

    <div class="glass dt-tb__search">
      <Icon name="search" :size="14" :style="{ color: 'var(--color-text-3)' }" />
      <input
        v-model="search"
        data-dt-search
        placeholder="Tìm chunk, chủ đề, voice…"
        @keydown.enter="submitSearch"
        @focus="submitSearch"
      />
      <span class="mono dt-tb__kbd">⌘K</span>
    </div>

    <div class="dt-tb__spacer" />

    <button
      class="dt-tb__stat"
      type="button"
      :aria-label="`Streak ${progress.streakDays} ngày, hôm nay ${progress.todayListenCount}/${settings.dailyGoal}`"
      @click="router.push('/progress')"
    >
      <span class="dt-tb__flame">
        <Icon name="flame" :size="12" :style="{ color: '#FB7185' }" />
      </span>
      <span class="mono dt-tb__stat-val">{{ progress.streakDays }}d</span>
      <span class="dt-tb__div" />
      <span class="mono dt-tb__stat-val">{{ progress.todayListenCount }}/{{ settings.dailyGoal }}</span>
    </button>

    <div class="dt-tb__bell-wrap">
      <button class="btn tap dt-tb__bell" aria-label="Notifications" @click="bellOpen = !bellOpen">
        <Icon name="bell" :size="14" :style="{ color: 'var(--color-text-2)' }" />
        <span v-if="notifications.length > 0" class="dt-tb__bell-dot" />
      </button>

      <transition name="bell">
        <div v-if="bellOpen" class="dt-tb__bell-pop glass-strong" @click.self="closeBell">
          <div class="dt-tb__bell-head">
            <span>Thông báo</span>
            <button class="btn tap" @click="closeBell" aria-label="Đóng"><Icon name="x" :size="12" /></button>
          </div>
          <div v-if="notifications.length === 0" class="dt-tb__bell-empty">
            Không có gì cần báo. Tiếp tục nghe nhé.
          </div>
          <button
            v-for="(n, i) in notifications"
            :key="i"
            class="btn tap dt-tb__bell-item"
            @click="bellAction"
          >
            <span
              class="dt-tb__bell-ic"
              :style="{ background: `color-mix(in oklch, ${n.color} 22%, transparent)`, color: n.color }"
            >
              <Icon :name="n.icon as any" :size="14" />
            </span>
            <span class="dt-tb__bell-text">
              <span class="dt-tb__bell-title">{{ n.title }}</span>
              <span class="dt-tb__bell-sub">{{ n.sub }}</span>
            </span>
          </button>
        </div>
      </transition>
    </div>
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
  position: relative;
  z-index: 5;
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
  cursor: pointer;
}
.dt-tb__stat:hover { background: var(--color-surface-3); }
.dt-tb__flame {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
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
.dt-tb__bell-wrap { position: relative; }
.dt-tb__bell {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
  position: relative;
}
.dt-tb__bell:hover { background: var(--color-surface-3); }
.dt-tb__bell-dot {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-rose);
  box-shadow: 0 0 0 2px var(--color-bg-0);
}

.dt-tb__bell-pop {
  position: absolute;
  top: 42px;
  right: 0;
  width: 320px;
  padding: 12px;
  border-radius: 14px;
  /* Solid card on top of page — don't rely on the translucent .glass-strong utility, which lets the page bleed through. */
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--color-bg-2) 96%, transparent), color-mix(in oklch, var(--color-bg-1) 96%, transparent));
  border: 1px solid var(--color-border-2);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.6),
    0 8px 24px -8px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 80;
  isolation: isolate;
}
[data-theme='light'] .dt-tb__bell-pop {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94));
  box-shadow:
    0 24px 60px -12px rgba(14, 18, 38, 0.18),
    0 8px 24px -8px rgba(14, 18, 38, 0.12);
}
.dt-tb__bell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 4px 6px;
  border-bottom: 1px solid var(--color-border-1);
}
.dt-tb__bell-empty {
  font-size: 12px;
  color: var(--color-text-3);
  text-align: center;
  padding: 16px 4px;
}
.dt-tb__bell-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--color-surface-1);
  text-align: left;
}
.dt-tb__bell-item:hover { background: var(--color-surface-2); }
.dt-tb__bell-ic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.dt-tb__bell-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dt-tb__bell-title { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.dt-tb__bell-sub { font-size: 11px; color: var(--color-text-3); }

.bell-enter-active,
.bell-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.bell-enter-from,
.bell-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
