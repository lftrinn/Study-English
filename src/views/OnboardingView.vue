<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { speechService } from '@/services/speechService';

import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';
import TopicIcon from '@/components/chunk/TopicIcon.vue';
import type { ChunkLevel } from '@/types/chunk';

const router = useRouter();
const settings = useSettingsStore();
const chunks = useChunkStore();

const TOTAL_STEPS = 5;
const step = ref(0);

const goalLocal = ref(settings.dailyGoal);
const levelLocal = ref<ChunkLevel>(settings.level);
const topicsLocal = ref<string[]>([...settings.selectedTopics]);
const voiceLocal = ref<string | null>(settings.selectedVoiceName);
const mixVoiceLocal = ref<boolean>(settings.mixVoice);

const englishVoices = ref<SpeechSynthesisVoice[]>([]);

const features = [
  { num: '01', title: 'Spotify-style listening', hint: 'Phát playlist chunks rảnh rỗi, shuffle / repeat / mix voice.' },
  { num: '02', title: 'Quizlet-inspired study', hint: 'Flashcard / Learn / Write / Dictation / Speaking — đủ kiểu.' },
  { num: '03', title: 'Local-first, offline', hint: 'Không tài khoản, không backend. Dữ liệu lưu ngay trên máy.' },
];

const goalPresets = [
  { value: 15, label: 'Gentle', sub: '~5 phút/ngày' },
  { value: 30, label: 'Steady', sub: '~10 phút' },
  { value: 50, label: 'Intense', sub: '~18 phút' },
];

const levels: Array<{ id: ChunkLevel; label: string; hint: string }> = [
  { id: 'A1', label: 'A1 · Beginner', hint: 'Câu đơn, từ vựng cơ bản' },
  { id: 'A2', label: 'A2 · Elementary', hint: 'Giao tiếp công việc đơn giản' },
  { id: 'B1', label: 'B1 · Intermediate', hint: 'Standup, interview, client' },
];

const progressPct = computed(() => ((step.value + 1) / TOTAL_STEPS) * 100);

const canContinue = computed(() => {
  if (step.value === 3) return topicsLocal.value.length > 0;
  return true;
});

function toggleTopic(id: string) {
  const idx = topicsLocal.value.indexOf(id);
  if (idx >= 0) topicsLocal.value.splice(idx, 1);
  else topicsLocal.value.push(id);
}

function pickPreset(v: number) {
  goalLocal.value = v;
}

function back() {
  if (step.value > 0) step.value -= 1;
}

function next() {
  if (!canContinue.value) return;
  if (step.value < TOTAL_STEPS - 1) {
    step.value += 1;
  } else {
    finish();
  }
}

function skip() {
  finish();
}

function finish() {
  settings.dailyGoal = goalLocal.value;
  settings.level = levelLocal.value;
  settings.selectedTopics = [...topicsLocal.value];
  settings.selectedVoiceName = voiceLocal.value;
  settings.mixVoice = mixVoiceLocal.value;
  settings.completeOnboarding();
  router.replace('/');
}

async function previewVoice(name: string, e: Event) {
  e.stopPropagation();
  try {
    await speechService.speak({
      text: 'Hello, this is a chunk listening lab voice preview.',
      voiceName: name,
      rate: 1,
    });
  } catch {
    // ignore
  }
}

watch(
  step,
  async (s) => {
    if (s === 4 && englishVoices.value.length === 0) {
      await speechService.ensureVoicesLoaded();
      englishVoices.value = speechService.getEnglishVoices();
      if (!voiceLocal.value && englishVoices.value[0]) {
        voiceLocal.value = englishVoices.value[0].name;
      }
    }
  },
);

onMounted(() => {
  // Default selected topics: pick a sensible starter set
  if (topicsLocal.value.length === 0) {
    topicsLocal.value = ['standup', 'interview', 'angular'];
  }
});
</script>

<template>
  <section class="ob night-bg">
    <header class="ob__head safe-pt">
      <button
        class="ob__icon-btn tap"
        :class="{ 'is-hidden': step === 0 }"
        :aria-label="'Quay lại'"
        @click="back"
      >
        <Icon name="chevron-left" :size="20" />
      </button>
      <div class="ob__head-info">
        <p class="ob__counter mono">{{ step + 1 }} / {{ TOTAL_STEPS }}</p>
        <div class="ob__progress">
          <div
            v-for="i in TOTAL_STEPS"
            :key="`seg-${i}`"
            class="ob__seg"
            :class="{ 'is-filled': i <= step + 1 }"
          />
        </div>
      </div>
      <button class="ob__skip tap" :aria-label="'Bỏ qua'" @click="skip">Skip</button>
    </header>

    <div class="ob__body no-scrollbar">
      <!-- Step 0: Welcome -->
      <template v-if="step === 0">
        <div class="ob__hero">
          <div class="ob__hero-circle">
            <Icon name="ear" :size="48" />
          </div>
          <h1 class="ob__title grad-text">Chunk Listening Lab</h1>
          <p class="ob__lead">
            Học English bằng cụm từ tái sử dụng. Nghe — ghi nhớ — luyện nói trong vài phút mỗi ngày.
          </p>
        </div>

        <div class="ob__features">
          <article v-for="f in features" :key="f.num" class="ob__feat glass">
            <span class="ob__feat-num">{{ f.num }}</span>
            <div>
              <p class="ob__feat-title">{{ f.title }}</p>
              <p class="ob__feat-hint">{{ f.hint }}</p>
            </div>
          </article>
        </div>
      </template>

      <!-- Step 1: Daily goal -->
      <template v-else-if="step === 1">
        <h2 class="ob__step-title">Mục tiêu mỗi ngày</h2>
        <p class="ob__step-hint">Bao nhiêu chunk bạn muốn nghe mỗi ngày?</p>

        <div class="ob__goal">
          <span class="ob__goal-num mono">{{ goalLocal }}</span>
          <span class="ob__goal-sub">chunks/ngày</span>
        </div>

        <input
          v-model.number="goalLocal"
          type="range"
          min="10"
          max="80"
          step="5"
          class="ob__slider"
          :aria-label="'Mục tiêu hàng ngày'"
        />

        <div class="ob__presets">
          <button
            v-for="p in goalPresets"
            :key="p.value"
            class="ob__preset tap"
            :class="{ 'is-active': goalLocal === p.value }"
            @click="pickPreset(p.value)"
          >
            <span class="ob__preset-label">{{ p.label }}</span>
            <span class="ob__preset-num">{{ p.value }}</span>
            <span class="ob__preset-sub">{{ p.sub }}</span>
          </button>
        </div>
      </template>

      <!-- Step 2: Level -->
      <template v-else-if="step === 2">
        <h2 class="ob__step-title">Trình độ hiện tại</h2>
        <p class="ob__step-hint">Để app gợi ý chunk phù hợp.</p>

        <div class="ob__levels">
          <button
            v-for="l in levels"
            :key="l.id"
            class="ob__level tap"
            :class="{ 'is-active': levelLocal === l.id }"
            @click="levelLocal = l.id"
          >
            <span class="ob__level-radio">
              <span v-if="levelLocal === l.id" class="ob__level-dot"><Icon name="check" :size="14" /></span>
            </span>
            <div>
              <p class="ob__level-label">{{ l.label }}</p>
              <p class="ob__level-hint">{{ l.hint }}</p>
            </div>
          </button>
        </div>
      </template>

      <!-- Step 3: Topics -->
      <template v-else-if="step === 3">
        <h2 class="ob__step-title">Chủ đề bạn quan tâm</h2>
        <p class="ob__step-hint">Chọn ≥ 1 chủ đề. Có thể đổi sau trong Library.</p>

        <div class="ob__topics">
          <button
            v-for="t in chunks.topics"
            :key="t.id"
            class="ob__topic tap glass"
            :class="{ 'is-active': topicsLocal.includes(t.id) }"
            :style="{ '--c': t.color }"
            @click="toggleTopic(t.id)"
          >
            <span class="ob__topic-icon"><TopicIcon :name="t.id" :size="20" /></span>
            <span class="ob__topic-name">{{ t.name }}</span>
            <span v-if="topicsLocal.includes(t.id)" class="ob__topic-check">
              <Icon name="check" :size="12" />
            </span>
          </button>
        </div>
      </template>

      <!-- Step 4: Voice -->
      <template v-else>
        <h2 class="ob__step-title">Chọn giọng đọc</h2>
        <p class="ob__step-hint">Pick một giọng quen, hoặc bật mix để đổi mỗi chunk.</p>

        <div class="ob__voices">
          <p v-if="englishVoices.length === 0" class="ob__voices-empty">
            Không tìm thấy giọng tiếng Anh trên thiết bị này. Bạn vẫn dùng được mặc định.
          </p>
          <button
            v-for="v in englishVoices"
            :key="v.name"
            class="ob__voice tap"
            :class="{ 'is-active': voiceLocal === v.name }"
            @click="voiceLocal = v.name"
          >
            <span class="ob__voice-circle"><Icon name="voice" :size="16" /></span>
            <span class="ob__voice-info">
              <span class="ob__voice-name">{{ v.name }}</span>
              <span class="ob__voice-lang mono">{{ v.lang }}</span>
            </span>
            <button class="ob__voice-play tap" :aria-label="'Nghe thử'" @click="(e) => previewVoice(v.name, e)">
              <Icon name="play" :size="12" />
            </button>
          </button>
        </div>

        <div class="ob__mix">
          <div>
            <p class="ob__mix-label">Mix voice mỗi chunk</p>
            <p class="ob__mix-hint">Random giọng để quen nhiều accent.</p>
          </div>
          <label class="ob__switch">
            <input type="checkbox" v-model="mixVoiceLocal" />
            <span class="ob__switch-track" :class="{ 'is-on': mixVoiceLocal }">
              <span class="ob__switch-thumb" />
            </span>
          </label>
        </div>
      </template>
    </div>

    <div class="ob__footer">
      <AppButton
        variant="primary"
        size="lg"
        block
        :disabled="!canContinue"
        @click="next"
      >
        {{ step === TOTAL_STEPS - 1 ? 'Bắt đầu' : 'Tiếp tục' }}
        <Icon name="arrow-right" :size="14" />
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.ob {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0;
}

.ob__head {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  padding-top: max(env(safe-area-inset-top), 12px);
}
.ob__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ob__icon-btn.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.ob__head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ob__counter {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-3);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.ob__progress {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  width: 160px;
  height: 4px;
}
.ob__seg {
  background: var(--color-surface-2);
  border-radius: 999px;
}
.ob__seg.is-filled {
  background: var(--grad-primary);
}
.ob__skip {
  font-size: 12px;
  color: var(--color-text-3);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 6px 8px;
}

.ob__body {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 12px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Welcome */
.ob__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  margin-top: 8px;
  padding-top: 12px;
}
.ob__hero-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background:
    radial-gradient(120% 70% at 30% 30%, rgba(34, 211, 238, 0.36), transparent 60%),
    var(--color-surface-2);
  border: 1px solid var(--color-border-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-cyan);
  position: relative;
}
.ob__hero-circle::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.18), transparent 60%);
  z-index: -1;
}
.ob__title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ob__lead {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-2);
  max-width: 320px;
}
.ob__features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ob__feat {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
}
.ob__feat-num {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cyan) 35%, transparent);
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.ob__feat-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.ob__feat-hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.4;
}

/* Step titles */
.ob__step-title {
  margin: 8px 0 0;
  font-family: var(--font-ui);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-1);
}
.ob__step-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

/* Goal */
.ob__goal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 0;
}
.ob__goal-num {
  font-family: var(--font-mono);
  font-size: 64px;
  font-weight: 800;
  line-height: 0.95;
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}
.ob__goal-sub {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.ob__slider {
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--color-surface-2);
  accent-color: var(--color-cyan);
  outline: none;
}
.ob__presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ob__preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
}
.ob__preset.is-active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
.ob__preset-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ob__preset-num {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-1);
}
.ob__preset.is-active .ob__preset-num {
  color: var(--color-cyan);
}
.ob__preset-sub {
  font-size: 10px;
  color: var(--color-text-3);
}

/* Level */
.ob__levels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ob__level {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
  text-align: left;
}
.ob__level.is-active {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(167, 139, 250, 0.22), transparent 55%),
    var(--color-surface-2);
  border-color: color-mix(in oklch, var(--color-violet) 45%, transparent);
}
.ob__level-radio {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-border-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ob__level.is-active .ob__level-radio {
  border-color: var(--color-violet);
  background: var(--color-violet);
  color: white;
}
.ob__level-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.ob__level-hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}

/* Topics */
.ob__topics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.ob__topic {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border-color: color-mix(in oklch, var(--c) 24%, transparent);
}
.ob__topic.is-active {
  background:
    radial-gradient(120% 70% at 0% 0%, color-mix(in oklch, var(--c) 28%, transparent), transparent 55%),
    var(--color-surface-2);
  border-color: color-mix(in oklch, var(--c) 55%, transparent);
}
.ob__topic-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--c) 20%, transparent);
  color: var(--c);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ob__topic-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
}
.ob__topic-check {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--c);
  color: var(--color-bg-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Voice */
.ob__voices {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ob__voices-empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
  padding: 10px;
  border-radius: 12px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.ob__voice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-1);
}
.ob__voice.is-active {
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
}
.ob__voice-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface-2);
  color: var(--color-cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ob__voice-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ob__voice-name {
  font-size: 14px;
  font-weight: 700;
}
.ob__voice-lang {
  font-size: 11px;
  color: var(--color-text-3);
}
.ob__voice-play {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ob__mix {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border-radius: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.ob__mix-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.ob__mix-hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.ob__switch {
  position: relative;
  display: inline-block;
}
.ob__switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}
.ob__switch-track {
  display: inline-block;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  position: relative;
  transition: background 0.18s ease;
}
.ob__switch-track.is-on {
  background: var(--color-cyan);
  border-color: var(--color-cyan);
}
.ob__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 0.18s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.ob__switch-track.is-on .ob__switch-thumb {
  transform: translateX(18px);
}

/* Footer */
.ob__footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
</style>
