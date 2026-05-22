<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import IconBlock from '@/components/common/IconBlock.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';

import { useChunkStore } from '@/stores/chunkStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useProgressStore } from '@/stores/progressStore';
import { playlistService } from '@/services/playlistService';
import type { Chunk } from '@/types/chunk';
import type { PracticeMode } from '@/types/practice';

const router = useRouter();
const chunks = useChunkStore();
const settings = useSettingsStore();
const player = usePlayerStore();
const practice = usePracticeStore();
const progress = useProgressStore();

type ModeId = 'passive' | PracticeMode | 'learn';

const modes: Array<{ id: ModeId; route: string; name: string; sub: string; icon: string; color: string; time: string }> = [
  { id: 'passive', route: '/study/passive', name: 'Passive Listening', sub: 'Background loop — train your ear hands-free', icon: 'headphones', color: '#22D3EE', time: '5–60 min' },
  { id: 'flashcard', route: '/study/flashcard', name: 'Flashcards', sub: 'Quick recall · I know / Still learning', icon: 'refresh', color: '#A78BFA', time: '5 min' },
  { id: 'learn', route: '/study/learn', name: 'Learn · Guided', sub: 'Listen → meaning → repeat — full SRS loop', icon: 'brain', color: '#F59E0B', time: '10 min' },
  { id: 'dictation', route: '/study/dictation', name: 'Dictation Lab', sub: 'Listen and type — diff-checked word by word', icon: 'edit', color: '#FB7185', time: '10 min' },
  { id: 'write', route: '/study/write', name: 'Write', sub: 'Type from Vietnamese hint — production drill', icon: 'edit', color: '#34D399', time: '10 min' },
  { id: 'match', route: '/study/match', name: 'Match · Game', sub: 'Pair English ↔ Vietnamese against the clock', icon: 'sparkle', color: '#FCD34D', time: '2 min' },
  { id: 'speaking', route: '/study/speaking', name: 'Speaking · Record', sub: 'Say it aloud — listen back and grade yourself', icon: 'mic', color: '#EC4899', time: '5 min' },
  { id: 'test', route: '/study/test', name: 'Mini Test', sub: 'Build a quick TOEIC-style test from your library', icon: 'target', color: '#60A5FA', time: '10 min' },
];

const selectedTopics = ref<string[]>(settings.selectedTopics.length > 0 ? [...settings.selectedTopics] : [chunks.topicWithCounts[0]?.id ?? 'standup']);
const level = ref<'A1' | 'A2' | 'B1'>(settings.level);
const length = ref<'5' | '10' | '20' | '∞'>('10');
const customMode = ref<ModeId>('flashcard');

const customPool = computed<Chunk[]>(() => {
  return chunks.chunks.filter((c) => {
    if (selectedTopics.value.length > 0 && !selectedTopics.value.includes(c.topic)) return false;
    if (c.level !== level.value) return false;
    return true;
  });
});

const customQueue = computed<Chunk[]>(() => {
  const lim = length.value === '∞' ? customPool.value.length : parseInt(length.value, 10);
  const pool = customPool.value.length > 0 ? customPool.value : chunks.chunks;
  return pool.slice(0, Math.max(1, lim));
});

function toggleTopic(id: string) {
  if (selectedTopics.value.includes(id)) selectedTopics.value = selectedTopics.value.filter((x) => x !== id);
  else selectedTopics.value = [...selectedTopics.value, id];
}

function buildQueueFor(id: ModeId): Chunk[] {
  if (id === 'passive') {
    const list = playlistService.buildLowListen(chunks.chunks, progress.progressMap, { threshold: 5, limit: 30 });
    return list.length > 0 ? list : chunks.chunks.slice(0, 20);
  }
  if (id === 'flashcard') {
    const weak = playlistService.buildMistakes(chunks.chunks, progress.progressMap, { limit: 20 });
    return weak.length > 0 ? weak : chunks.chunks.slice(0, 20);
  }
  // learn / dictation / write / multiple-choice / match / test / speaking
  return chunks.chunks.slice(0, 20);
}

function runMode(id: ModeId, route: string) {
  const queue = buildQueueFor(id);
  if (queue.length === 0) {
    router.push('/library');
    return;
  }
  if (id === 'passive') {
    player.setShuffle(true);
    player.setQueue(queue, { mode: 'passive' });
    void player.play();
  } else if (id !== 'learn') {
    practice.start({ mode: id as PracticeMode, chunks: queue });
  }
  router.push(route);
}

function startCustom() {
  const queue = customQueue.value;
  if (queue.length === 0) {
    window.alert('Không tìm thấy chunk phù hợp — đổi topic/level nhé.');
    return;
  }
  const mode = customMode.value;
  if (mode === 'passive') {
    player.setQueue(queue, { mode: 'passive' });
    void player.play();
    router.push('/study/passive');
    return;
  }
  if (mode === 'learn') {
    player.setQueue(queue, { mode: 'normal' });
    void player.play();
    router.push('/study/learn');
    return;
  }
  practice.start({ mode: mode as PracticeMode, chunks: queue });
  const target = modes.find((m) => m.id === mode);
  router.push(target?.route ?? '/study/flashcard');
}

const visibleTopics = computed(() => chunks.topicWithCounts.slice(0, 8));
</script>

<template>
  <div class="scrollarea dt-pr">
    <h1 class="dt-pr__title">Practice</h1>
    <div class="dt-pr__sub">Pick a lab — each one targets a different listening loop.</div>

    <div class="dt-pr__grid">
      <button
        v-for="m in modes"
        :key="m.id"
        class="btn tap glass dt-pr__tile"
        @click="runMode(m.id, m.route)"
      >
        <div class="dt-pr__tile-top">
          <IconBlock :icon="m.icon" :color="m.color" :size="48" />
          <span class="mono dt-pr__time">{{ m.time }}</span>
        </div>
        <div>
          <div class="dt-pr__name">{{ m.name }}</div>
          <div class="dt-pr__desc">{{ m.sub }}</div>
        </div>
      </button>
    </div>

    <!-- Custom session builder -->
    <div class="glass dt-pr__builder">
      <div class="dt-pr__b-head">
        <div>
          <div class="dt-pr__b-eye">Build · Custom session</div>
          <div class="dt-pr__b-title">Chọn topic, level, mode — let's go.</div>
        </div>
        <button class="btn tap dt-pr__b-cta" @click="startCustom">
          <span class="dt-pr__b-shine" aria-hidden="true" />
          <Icon name="play" :size="13" :style="{ color: '#fff', position: 'relative' }" />
          <span style="position: relative">Start · {{ customQueue.length }} chunks</span>
        </button>
      </div>

      <div class="dt-pr__b-grid">
        <div>
          <div class="dt-pr__field-lbl">Topics</div>
          <div class="dt-pr__chips">
            <button
              v-for="t in visibleTopics"
              :key="t.id"
              class="chip dt-pr__chip"
              :style="{ '--c': t.color }"
              :class="{ 'is-off': !selectedTopics.includes(t.id) }"
              @click="toggleTopic(t.id)"
            >
              <TopicIcon :name="t.id" :size="11" />{{ t.name }}
            </button>
          </div>
        </div>
        <div>
          <div class="dt-pr__field-lbl">Level</div>
          <div class="dt-pr__seg">
            <button
              v-for="l in ['A1','A2','B1']"
              :key="l"
              class="btn tap dt-pr__seg-btn"
              :class="{ 'is-on': level === l }"
              @click="level = l as any"
            >{{ l }}</button>
          </div>
        </div>
        <div>
          <div class="dt-pr__field-lbl">Length</div>
          <div class="dt-pr__seg">
            <button
              v-for="l in ['5','10','20','∞']"
              :key="l"
              class="btn tap dt-pr__seg-btn"
              :class="{ 'is-on': length === l }"
              @click="length = l as any"
            >{{ l }}</button>
          </div>
        </div>
      </div>

      <div class="dt-pr__mode-row">
        <div class="dt-pr__field-lbl">Mode</div>
        <div class="dt-pr__mode-chips">
          <button
            v-for="m in modes"
            :key="m.id"
            class="btn tap dt-pr__mode-chip"
            :class="{ 'is-on': customMode === m.id }"
            :style="customMode === m.id ? {
              background: `color-mix(in oklch, ${m.color} 22%, transparent)`,
              borderColor: m.color,
              color: m.color,
            } : {}"
            @click="customMode = m.id"
          >
            <Icon :name="m.icon as any" :size="13" />
            {{ m.name.split('·')[0].trim() }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-pr { padding: 28px; }
.dt-pr__title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
.dt-pr__sub { font-size: 13px; color: var(--color-text-3); margin-top: 2px; margin-bottom: 22px; }

.dt-pr__grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
}
.dt-pr__tile {
  padding: 18px; border-radius: 18px; text-align: left; min-height: 180px;
  display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
}
.dt-pr__tile-top { display: flex; align-items: flex-start; justify-content: space-between; }
.dt-pr__time {
  font-size: 10px; color: var(--color-text-3);
  padding: 3px 7px; border-radius: 99px;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
}
.dt-pr__name { font-size: 15px; font-weight: 700; }
.dt-pr__desc { font-size: 12px; color: var(--color-text-3); margin-top: 4px; line-height: 1.4; }

.dt-pr__builder { margin-top: 26px; padding: 22px; }
.dt-pr__b-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
}
.dt-pr__b-eye {
  font-size: 11px; font-weight: 700; color: var(--color-cyan);
  letter-spacing: 0.05em; text-transform: uppercase;
}
.dt-pr__b-title { font-size: 18px; font-weight: 700; margin-top: 4px; }
.dt-pr__b-cta {
  position: relative; overflow: hidden;
  padding: 12px 22px; border-radius: 12px;
  background: var(--grad-primary); color: #fff;
  font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 10px 28px rgba(34,211,238,0.42), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset;
  text-shadow: 0 1px 1.5px rgba(0,0,0,0.18);
}
.dt-pr__b-shine {
  position: absolute; inset: 1px; border-radius: 11px; pointer-events: none;
  background: radial-gradient(70% 100% at 30% 0%, rgba(255,255,255,0.35), transparent 65%);
}
.dt-pr__b-grid {
  display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px;
}
.dt-pr__field-lbl {
  font-size: 10px; font-weight: 700; color: var(--color-text-3);
  letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px;
}
.dt-pr__chips { display: flex; flex-wrap: wrap; gap: 5px; }
.dt-pr__chip { cursor: pointer; }
.dt-pr__chip.is-off { opacity: 0.45; }
.dt-pr__seg { display: flex; gap: 6px; }
.dt-pr__seg-btn {
  flex: 1; height: 32px; border-radius: 9px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-3);
  font-family: var(--font-mono);
}
.dt-pr__seg-btn.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

.dt-pr__mode-row { margin-top: 14px; }
.dt-pr__mode-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.dt-pr__mode-chip {
  padding: 8px 12px; border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--color-text-2);
}
</style>
