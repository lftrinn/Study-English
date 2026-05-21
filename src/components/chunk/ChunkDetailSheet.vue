<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

import AppSheet from '@/components/common/AppSheet.vue';
import AppButton from '@/components/common/AppButton.vue';
import LevelPill from './LevelPill.vue';
import TopicChip from './TopicChip.vue';
import Icon from '@/components/common/Icon.vue';

const ui = useUiStore();
const chunks = useChunkStore();
const progress = useProgressStore();
const player = usePlayerStore();
const router = useRouter();

const open = computed(() => ui.sheet === 'chunk-detail' && Boolean(ui.sheetChunkId));
const chunk = computed(() =>
  ui.sheetChunkId ? chunks.byId(ui.sheetChunkId) : undefined,
);
const p = computed(() => (chunk.value ? progress.byId(chunk.value.id) : undefined));

const accuracy = computed(() => {
  const cur = p.value;
  if (!cur) return null;
  const total = cur.correctCount + cur.wrongCount;
  if (total === 0) return null;
  return Math.round((cur.correctCount / total) * 100);
});

function close() {
  ui.closeSheet();
}

function play() {
  if (!chunk.value) return;
  player.setQueue([chunk.value], { mode: 'normal' });
  void player.play();
  close();
  router.push('/player');
}

function addToQueue() {
  if (!chunk.value) return;
  player.queue.push(chunk.value);
}

function toggleStar() {
  if (!chunk.value) return;
  void progress.toggleStarred(chunk.value.id);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<template>
  <AppSheet :open="open" :title="chunk?.text ?? 'Chunk'" @close="close">
    <div v-if="chunk" class="cd">
      <div class="cd__row">
        <TopicChip :topic-id="chunk.topic" :show-emoji="true" />
        <LevelPill :level="chunk.level" />
        <span class="dot" :class="`dot-${p?.status ?? 'new'}`" />
        <span class="cd__status">{{ p?.status ?? 'new' }}</span>
      </div>

      <div class="cd__hero glass">
        <p class="cd__text">{{ chunk.text }}</p>
        <p class="cd__meaning">{{ chunk.meaning }}</p>
      </div>

      <div class="cd__actions">
        <AppButton variant="primary" size="md" @click="play">
          <Icon name="play" :size="16" />
          Phát
        </AppButton>
        <AppButton variant="glass" size="md" @click="addToQueue">
          <Icon name="queue" :size="16" />
          Vào queue
        </AppButton>
        <AppButton
          variant="glass"
          size="md"
          :aria-label="p?.starred ? 'Bỏ sao' : 'Đánh dấu sao'"
          @click="toggleStar"
        >
          <Icon :name="p?.starred ? 'star-filled' : 'star'" :size="16" />
          {{ p?.starred ? 'Đã sao' : 'Sao' }}
        </AppButton>
      </div>

      <ul class="cd__stats">
        <li>
          <span class="cd__stat-label">Đã nghe</span>
          <span class="cd__stat-value">{{ p?.listenCount ?? 0 }} lần</span>
        </li>
        <li>
          <span class="cd__stat-label">Độ chính xác</span>
          <span class="cd__stat-value">{{ accuracy === null ? '—' : `${accuracy}%` }}</span>
        </li>
        <li>
          <span class="cd__stat-label">Lần cuối nghe</span>
          <span class="cd__stat-value">{{ fmtDate(p?.lastListenedAt) }}</span>
        </li>
        <li>
          <span class="cd__stat-label">Lần ôn tiếp</span>
          <span class="cd__stat-value">{{ fmtDate(p?.nextReviewAt) }}</span>
        </li>
      </ul>

      <div v-if="chunk.tags.length > 0" class="cd__tags">
        <span v-for="t in chunk.tags" :key="t" class="cd__tag">#{{ t }}</span>
      </div>
    </div>
  </AppSheet>
</template>

<style scoped>
.cd {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
}
.cd__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cd__status {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  text-transform: capitalize;
}
.cd__hero {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cd__text {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.015em;
}
.cd__meaning {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-2);
}
.cd__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.cd__stats {
  list-style: none;
  margin: 0;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 14px;
}
.cd__stats li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cd__stat-label {
  font-size: 11px;
  color: var(--color-text-3);
}
.cd__stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.cd__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cd__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 11px;
  color: var(--color-text-3);
}
</style>
