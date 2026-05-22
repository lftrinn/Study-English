<script setup lang="ts">
import { computed } from 'vue';

import Icon from '@/components/common/Icon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import PlayBtn from '@/components/common/PlayBtn.vue';
import ProgressBar from '@/components/common/ProgressBar.vue';
import WaveBars from '@/components/common/WaveBars.vue';

import { usePlayerStore } from '@/stores/playerStore';
import { useChunkStore } from '@/stores/chunkStore';

const player = usePlayerStore();
const chunks = useChunkStore();

const VOICES = [
  { id: 'aria', name: 'Aria', region: 'US · Female' },
  { id: 'ben', name: 'Ben', region: 'US · Male' },
  { id: 'chloe', name: 'Chloe', region: 'UK · Female' },
  { id: 'daniel', name: 'Daniel', region: 'UK · Male' },
];

const chunk = computed(() => player.current ?? chunks.chunks[0]);
const topic = computed(() => (chunk.value ? chunks.topicById(chunk.value.topic) : undefined));
const accent = computed(() => topic.value?.color ?? '#22D3EE');
const isPlaying = computed(() => player.isPlaying && !player.isPaused);

const progressPct = computed(() => {
  if (player.currentDurationMs <= 0) return 0;
  return Math.min(100, (player.currentElapsedMs / player.currentDurationMs) * 100);
});
const elapsedFmt = computed(() => fmtSec(player.currentElapsedMs));
const durationFmt = computed(() => fmtSec(player.currentDurationMs));

function fmtSec(ms: number) {
  const sec = Math.max(0, ms / 1000);
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

function togglePlay() {
  if (player.isPlaying && !player.isPaused) player.pause();
  else void player.play();
}
function bump(field: 'speed' | 'gap' | 'repeatEach', dir: 1 | -1) {
  if (field === 'speed') {
    const v = Math.max(0.5, Math.min(1.5, +(player.speed + dir * 0.05).toFixed(2)));
    player.setSpeed(v);
  } else if (field === 'gap') {
    const v = Math.max(500, Math.min(5000, player.gap + dir * 500));
    player.setGap(v);
  } else {
    const v = Math.max(1, Math.min(9, player.repeatEach + dir));
    player.setRepeatEach(v);
  }
}
function toggleMix() {
  player.setMixVoice(!player.mixVoice);
}
</script>

<template>
  <div v-if="chunk" class="scrollarea dt-pl">
    <div class="dt-pl__grid">
      <!-- Hero card column -->
      <div>
        <div
          class="dt-pl__card"
          :style="{
            background: `linear-gradient(160deg, color-mix(in oklch, ${accent} 50%, transparent), color-mix(in oklch, ${accent} 10%, transparent)), radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.18), transparent)`,
            border: `1px solid color-mix(in oklch, ${accent} 28%, transparent)`,
          }"
        >
          <div
            class="dt-pl__dot"
            :class="{ 'pulse-cyan': isPlaying }"
            :style="{ background: accent }"
          />
          <div>
            <div class="dt-pl__crumb">
              <TopicIcon :name="topic?.id ?? 'standup'" :size="14" />
              {{ topic?.name }}
              <span class="dt-pl__dotsep" />
              <LevelPill :level="chunk.level" />
            </div>
            <div class="dt-pl__en">{{ chunk.text }}</div>
          </div>
          <div>
            <div class="dt-pl__hr" />
            <div class="dt-pl__vi">{{ chunk.meaning }}</div>
          </div>
        </div>

        <!-- Transport -->
        <div class="dt-pl__transport">
          <button class="btn tap dt-pl__t-side" @click="player.toggleShuffle" aria-label="Shuffle">
            <Icon name="shuffle" :size="18" :style="{ color: player.shuffle ? 'var(--color-cyan)' : 'var(--color-text-2)' }" />
          </button>
          <button class="btn tap dt-pl__t-step" @click="player.prev" aria-label="Previous">
            <Icon name="prev" :size="22" />
          </button>
          <PlayBtn :playing="isPlaying" :size="64" @click="togglePlay" />
          <button class="btn tap dt-pl__t-step" @click="player.next" aria-label="Next">
            <Icon name="next" :size="22" />
          </button>
          <button class="btn tap dt-pl__t-side" @click="player.cycleRepeat" aria-label="Repeat">
            <Icon
              :name="player.repeatMode === 'one' ? 'repeat-one' : 'repeat'"
              :size="18"
              :style="{ color: player.repeatMode !== 'none' ? 'var(--color-cyan)' : 'var(--color-text-2)' }"
            />
          </button>
        </div>

        <div class="dt-pl__progress">
          <ProgressBar :value="progressPct" :max="100" :height="4" :color="accent" />
          <div class="dt-pl__progress-row">
            <span class="mono">{{ elapsedFmt }} · loop {{ Math.min(player.repeatEach, 1) }}/{{ player.repeatEach }}</span>
            <span class="mono">{{ durationFmt }}</span>
          </div>
        </div>
      </div>

      <!-- Right column: lab + voices + transcript -->
      <div class="dt-pl__right">
        <!-- Listening lab -->
        <div class="glass dt-pl__panel">
          <div class="dt-pl__panel-head">
            <Icon name="sparkle" :size="12" :style="{ color: 'var(--color-cyan)' }" /> Listening lab
          </div>
          <div class="dt-pl__lab">
            <div class="dt-pl__step">
              <div class="dt-pl__step-lbl">Repeat</div>
              <div class="dt-pl__step-row">
                <button class="btn tap dt-pl__step-btn" @click="bump('repeatEach', -1)"><Icon name="minus" :size="12" /></button>
                <span class="mono dt-pl__step-val">{{ player.repeatEach }}×</span>
                <button class="btn tap dt-pl__step-btn" @click="bump('repeatEach', 1)"><Icon name="plus" :size="12" /></button>
              </div>
            </div>
            <div class="dt-pl__step">
              <div class="dt-pl__step-lbl">Speed</div>
              <div class="dt-pl__step-row">
                <button class="btn tap dt-pl__step-btn" @click="bump('speed', -1)"><Icon name="minus" :size="12" /></button>
                <span class="mono dt-pl__step-val">{{ player.speed.toFixed(2) }}×</span>
                <button class="btn tap dt-pl__step-btn" @click="bump('speed', 1)"><Icon name="plus" :size="12" /></button>
              </div>
            </div>
            <div class="dt-pl__step">
              <div class="dt-pl__step-lbl">Gap</div>
              <div class="dt-pl__step-row">
                <button class="btn tap dt-pl__step-btn" @click="bump('gap', -1)"><Icon name="minus" :size="12" /></button>
                <span class="mono dt-pl__step-val">{{ (player.gap / 1000).toFixed(1) }}s</span>
                <button class="btn tap dt-pl__step-btn" @click="bump('gap', 1)"><Icon name="plus" :size="12" /></button>
              </div>
            </div>
            <div class="dt-pl__step">
              <div class="dt-pl__step-lbl">Mix voices</div>
              <button
                class="btn tap dt-pl__switch"
                :class="{ 'is-on': player.mixVoice }"
                @click="toggleMix"
              >
                <span class="dt-pl__switch-text">{{ player.mixVoice ? 'On' : 'Off' }}</span>
                <span class="dt-pl__switch-track">
                  <span class="dt-pl__switch-thumb" />
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Voices -->
        <div class="glass dt-pl__panel">
          <div class="dt-pl__panel-head">Voices in rotation</div>
          <div class="dt-pl__voices">
            <div
              v-for="(v, i) in VOICES"
              :key="v.id"
              class="dt-pl__voice"
              :class="{ 'is-on': i === 0 }"
            >
              <div class="dt-pl__voice-row">
                <div class="dt-pl__voice-av" :class="{ 'is-on': i === 0 }">{{ v.name.charAt(0) }}</div>
                <div class="dt-pl__voice-meta">
                  <div class="dt-pl__voice-name">{{ v.name }}</div>
                  <div class="dt-pl__voice-region">{{ v.region }}</div>
                </div>
              </div>
              <WaveBars :size="14" :playing="i === 0 && isPlaying" :color="i === 0 ? 'var(--color-cyan)' : 'var(--color-text-3)'" />
            </div>
          </div>
        </div>

        <!-- Transcript -->
        <div class="glass dt-pl__panel">
          <div class="dt-pl__panel-head">Transcript</div>
          <div class="dt-pl__transcript">
            <span
              v-for="(w, i) in chunk.text.split(' ')"
              :key="i"
              class="dt-pl__word"
            >{{ w }}</span>
          </div>
          <div class="dt-pl__transcript-vi">{{ chunk.meaning }}</div>
          <div class="dt-pl__transcript-actions">
            <button class="btn tap dt-pl__t-btn">
              <Icon name="volume" :size="13" :style="{ color: 'var(--color-text-2)' }" /> Word-by-word
            </button>
            <button class="btn tap dt-pl__t-btn">
              <Icon name="mic" :size="13" :style="{ color: 'var(--color-text-2)' }" /> Practice say it
            </button>
            <button class="btn tap dt-pl__t-btn">
              <Icon name="edit" :size="13" :style="{ color: 'var(--color-text-2)' }" /> Add note
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-pl { padding: 28px; }
.dt-pl__grid { display: grid; grid-template-columns: minmax(320px, 380px) 1fr; gap: 24px; }

.dt-pl__card {
  aspect-ratio: 1; border-radius: 28px;
  padding: 28px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative; overflow: hidden;
}
.dt-pl__dot {
  position: absolute; top: 26px; right: 26px;
  width: 14px; height: 14px; border-radius: 50%;
}
.dt-pl__crumb {
  font-size: 12px; font-weight: 700; color: var(--color-text-2);
  letter-spacing: 0.04em; text-transform: uppercase;
  display: flex; align-items: center; gap: 8px;
}
.dt-pl__dotsep { width: 4px; height: 4px; border-radius: 4px; background: var(--color-text-4); }
.dt-pl__en {
  font-size: 26px; font-weight: 700; line-height: 1.2;
  letter-spacing: -0.015em; margin-top: 16px; text-wrap: pretty;
}
.dt-pl__hr { height: 1px; background: var(--color-border-1); margin: 14px 0; }
.dt-pl__vi { font-size: 14px; color: var(--color-text-2); line-height: 1.4; }

.dt-pl__transport {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 22px;
}
.dt-pl__t-side {
  width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center;
}
.dt-pl__t-step {
  width: 48px; height: 48px; border-radius: 50%;
  display: grid; place-items: center;
}

.dt-pl__progress { margin-top: 18px; }
.dt-pl__progress-row {
  display: flex; justify-content: space-between; margin-top: 6px;
  font-size: 11px; color: var(--color-text-3);
}

.dt-pl__right { display: flex; flex-direction: column; gap: 18px; }
.dt-pl__panel { padding: 18px; }
.dt-pl__panel-head {
  font-size: 11px; font-weight: 700; color: var(--color-text-3);
  letter-spacing: 0.05em; text-transform: uppercase;
  margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
}

.dt-pl__lab { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.dt-pl__step { display: flex; flex-direction: column; gap: 6px; }
.dt-pl__step-lbl {
  font-size: 10px; color: var(--color-text-3); font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase;
}
.dt-pl__step-row {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
  border-radius: 10px; padding: 4px;
}
.dt-pl__step-btn {
  width: 24px; height: 24px; border-radius: 6px;
  display: grid; place-items: center; color: var(--color-text-2);
}
.dt-pl__step-val { font-size: 14px; font-weight: 700; }
.dt-pl__switch {
  height: 32px; padding: 0 8px; border-radius: 10px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  display: flex; align-items: center; justify-content: space-between;
}
.dt-pl__switch.is-on {
  background: rgba(34,211,238,0.16);
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}
.dt-pl__switch-text { font-size: 12px; font-weight: 700; color: var(--color-text-2); }
.dt-pl__switch.is-on .dt-pl__switch-text { color: var(--color-cyan); }
.dt-pl__switch-track {
  width: 24px; height: 14px; border-radius: 99px;
  background: var(--color-surface-3); position: relative;
}
.dt-pl__switch.is-on .dt-pl__switch-track { background: var(--color-cyan); }
.dt-pl__switch-thumb {
  position: absolute; top: 1px; left: 1px;
  width: 12px; height: 12px; border-radius: 50%; background: #fff;
  transition: left 0.15s ease;
}
.dt-pl__switch.is-on .dt-pl__switch-thumb { left: 11px; }

.dt-pl__voices { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dt-pl__voice {
  padding: 12px; border-radius: 12px;
  display: flex; flex-direction: column; gap: 6px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.dt-pl__voice.is-on {
  background: rgba(34,211,238,0.1);
  border-color: var(--color-cyan);
}
.dt-pl__voice-row { display: flex; align-items: center; gap: 8px; }
.dt-pl__voice-av {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--color-surface-3);
  display: grid; place-items: center;
  color: var(--color-text-1); font-size: 11px; font-weight: 700;
}
.dt-pl__voice-av.is-on { background: var(--color-cyan); color: #0b0f22; }
.dt-pl__voice-meta { min-width: 0; }
.dt-pl__voice-name { font-size: 12px; font-weight: 700; }
.dt-pl__voice-region { font-size: 10px; color: var(--color-text-3); }

.dt-pl__transcript {
  font-size: 17px; font-weight: 600; line-height: 1.5; letter-spacing: -0.005em;
}
.dt-pl__word {
  padding: 1px 3px; border-radius: 4px; margin-right: 2px;
  text-decoration: underline; text-decoration-color: var(--color-text-4); text-underline-offset: 4px;
  cursor: pointer;
}
.dt-pl__word:hover { background: rgba(34,211,238,0.18); color: var(--color-cyan); }
.dt-pl__transcript-vi {
  font-size: 13px; color: var(--color-text-3); margin-top: 8px; line-height: 1.5;
}
.dt-pl__transcript-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.dt-pl__t-btn {
  padding: 8px 12px; border-radius: 10px;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 600; color: var(--color-text-2);
  display: inline-flex; align-items: center; gap: 6px;
}
</style>
