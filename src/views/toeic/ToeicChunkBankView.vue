<script setup lang="ts">
/**
 * TOEIC Chunk Bank — workplace chunks grouped by topic. Topic grid →
 * topic detail with chunk list, Part badges, and high-frequency flag.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import ModeShell from '@/components/layout/ModeShell.vue';
import { TOEIC_CHUNKS_BY_TOPIC, TOEIC_CHUNK_TOPICS, TOEIC_PARTS } from '@/data/toeic';
import { useToeicStore } from '@/stores/toeicStore';
import type { TOEICChunkTopic } from '@/types/toeic';

type FreqFilter = 'all' | 'high' | 'mid';

const router = useRouter();
const toeic = useToeicStore();

const topic = ref<TOEICChunkTopic | null>(null);
const freq = ref<FreqFilter>('all');

const topicChunks = computed(() => {
  if (!topic.value) return [];
  const list = TOEIC_CHUNKS_BY_TOPIC[topic.value.id] ?? [];
  if (freq.value === 'all') return list;
  return list.filter((c) => c.freq === freq.value);
});

function onClose() {
  router.push('/toeic');
}

function partFor(id: number) {
  return TOEIC_PARTS.find((p) => p.id === id);
}
</script>

<template>
  <ModeShell title="TOEIC · Chunk Bank" :subtitle="topic ? topic.vi : 'Workplace English'" :on-close="onClose">
    <!-- Topic grid -->
    <div v-if="!topic" class="tbank">
      <div class="tbank__intro">
        <div class="tbank__intro-title">Chunks workplace</div>
        <div class="tbank__intro-sub">
          <span class="mono">550 chunks</span> · sắp xếp theo chủ đề · gắn với Part tương ứng
        </div>
      </div>

      <div class="tbank__topics">
        <button
          v-for="t in TOEIC_CHUNK_TOPICS"
          :key="t.id"
          class="btn tap glass tbank__topic"
          @click="topic = t"
        >
          <div class="tbank__topic-head">
            <div class="tbank__topic-icon" :style="{
              background: `linear-gradient(135deg, color-mix(in oklch, ${t.color} 28%, transparent), color-mix(in oklch, ${t.color} 10%, transparent))`,
              borderColor: `color-mix(in oklch, ${t.color} 30%, transparent)`,
              color: t.color,
            }">
              <Icon name="library" :size="18" />
            </div>
            <span class="mono tbank__topic-count" :style="{
              color: t.color,
              background: `color-mix(in oklch, ${t.color} 16%, transparent)`,
            }">{{ t.count }}</span>
          </div>
          <div class="tbank__topic-foot">
            <div class="tbank__topic-name">{{ t.name }}</div>
            <div class="tbank__topic-vi">{{ t.vi }}</div>
            <div class="tbank__topic-parts">
              <span v-for="p in t.parts" :key="p" class="mono tbank__topic-part">P{{ p }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Topic detail -->
    <div v-else class="tbank">
      <button class="btn tap tbank__back" @click="topic = null">
        <Icon name="chevron-left" :size="12" /> Topics
      </button>

      <div class="tbank__hero" :style="{
        background: `linear-gradient(135deg, color-mix(in oklch, ${topic.color} 16%, transparent), color-mix(in oklch, ${topic.color} 4%, transparent)), var(--color-surface-2)`,
        borderColor: `color-mix(in oklch, ${topic.color} 30%, transparent)`,
      }">
        <div class="tbank__hero-icon" :style="{
          background: `color-mix(in oklch, ${topic.color} 26%, transparent)`,
          color: topic.color,
        }">
          <Icon name="library" :size="22" />
        </div>
        <div class="tbank__hero-body">
          <div class="tbank__hero-eye" :style="{ color: topic.color }">{{ topic.name }}</div>
          <div class="tbank__hero-vi">{{ topic.vi }}</div>
          <div class="tbank__hero-meta">
            <span class="mono">{{ topic.count }}</span> chunks · liên quan {{ topic.parts.map((p) => 'Part ' + p).join(', ') }}
          </div>
        </div>
      </div>

      <div class="tbank__filter">
        <button
          v-for="opt in [{ k: 'all', l: 'Tất cả' }, { k: 'high', l: 'High frequency' }, { k: 'mid', l: 'Mid' }] as const"
          :key="opt.k"
          class="btn tap tbank__filter-btn"
          :class="{ 'is-on': freq === opt.k }"
          @click="freq = opt.k"
        >{{ opt.l }}</button>
      </div>

      <div v-if="topicChunks.length > 0" class="tbank__chunks">
        <div v-for="(c, i) in topicChunks" :key="i" class="glass tbank__chunk">
          <button class="btn tap tbank__chunk-play" :style="{
            background: `color-mix(in oklch, ${topic.color} 22%, transparent)`,
            borderColor: `color-mix(in oklch, ${topic.color} 32%, transparent)`,
            color: topic.color,
          }">
            <Icon name="play" :size="13" :style="{ marginLeft: '1px' }" />
          </button>
          <div class="tbank__chunk-body">
            <div class="tbank__chunk-en">{{ c.en }}</div>
            <div class="tbank__chunk-vi">{{ c.vi }}</div>
            <div class="tbank__chunk-tags">
              <span v-for="p in c.parts" :key="p" class="mono tbank__chunk-part" :style="{
                color: partFor(p)?.color,
                background: `color-mix(in oklch, ${partFor(p)?.color} 16%, transparent)`,
                borderColor: `color-mix(in oklch, ${partFor(p)?.color} 28%, transparent)`,
              }">P{{ p }}</span>
              <span v-if="c.freq === 'high'" class="tbank__chunk-freq">★ High freq</span>
            </div>
          </div>
          <button
            class="btn tap tbank__chunk-star"
            :class="{ 'is-on': toeic.isStarred(c.en) }"
            :aria-label="toeic.isStarred(c.en) ? 'Unstar' : 'Star'"
            @click="toeic.toggleStar(c.en)"
          >
            <Icon :name="toeic.isStarred(c.en) ? 'star-filled' : 'star'" :size="14" />
          </button>
        </div>
      </div>
      <div v-else class="tbank__empty">
        Không có chunk khớp filter này.
      </div>
    </div>
  </ModeShell>
</template>

<style scoped>
.tbank {
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tbank__intro-title { font-size: 18px; font-weight: 700; }
.tbank__intro-sub { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.tbank__topics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.tbank__topic {
  padding: 14px;
  border-radius: 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 124px;
}
.tbank__topic-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tbank__topic-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid;
}
.tbank__topic-count {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 999px;
}
.tbank__topic-foot { margin-top: auto; }
.tbank__topic-name { font-size: 14px; font-weight: 700; }
.tbank__topic-vi { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }
.tbank__topic-parts {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.tbank__topic-part {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface-1);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
}

.tbank__back {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  color: var(--color-text-1);
}

.tbank__hero {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tbank__hero-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.tbank__hero-body { flex: 1; }
.tbank__hero-eye {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tbank__hero-vi { font-size: 17px; font-weight: 700; margin-top: 2px; }
.tbank__hero-meta { font-size: 11px; color: var(--color-text-3); margin-top: 3px; }

.tbank__filter { display: flex; gap: 6px; }
.tbank__filter-btn {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
}
.tbank__filter-btn.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

.tbank__chunks { display: flex; flex-direction: column; gap: 8px; }
.tbank__chunk {
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.tbank__chunk-play {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid;
}
.tbank__chunk-body { flex: 1; min-width: 0; }
.tbank__chunk-en { font-size: 14.5px; font-weight: 600; line-height: 1.35; }
.tbank__chunk-vi { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }
.tbank__chunk-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.tbank__chunk-part {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid;
}
.tbank__chunk-freq {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-rose);
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in oklch, var(--color-rose) 14%, transparent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.tbank__chunk-star {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--color-text-3);
}
.tbank__chunk-star.is-on { color: var(--color-amber); }

.tbank__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px dashed var(--color-border-2);
}
</style>
