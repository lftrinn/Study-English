<script setup lang="ts">
/**
 * Literal port of onboarding.jsx OnboardingFlow + 5 step components.
 * All inline styles preserved through :style binding.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { speechService } from '@/services/speechService';
import type { ChunkLevel } from '@/types/chunk';

import TopicIcon from '@/components/chunk/TopicIcon.vue';
import LevelPill from '@/components/chunk/LevelPill.vue';
import Icon from '@/components/common/Icon.vue';

const router = useRouter();
const settings = useSettingsStore();
const chunks = useChunkStore();

const TOTAL = 5;
const step = ref(0);

const goal = ref(settings.dailyGoal || 30);
const levelLocal = ref<ChunkLevel>(settings.level);
const picks = ref<string[]>(settings.selectedTopics.length > 0 ? [...settings.selectedTopics] : ['interview', 'standup', 'angular']);
const voice = ref<string | null>(settings.selectedVoiceName);
const mix = ref<boolean>(settings.mixVoice);

const englishVoices = ref<SpeechSynthesisVoice[]>([]);

const canAdvance = computed(() => step.value !== 3 || picks.value.length > 0);
const isFinal = computed(() => step.value === TOTAL - 1);

function back() {
  if (step.value > 0) step.value -= 1;
}
function next() {
  if (!canAdvance.value) return;
  if (step.value < TOTAL - 1) {
    step.value += 1;
  } else {
    finish();
  }
}
function finish() {
  settings.dailyGoal = goal.value;
  settings.level = levelLocal.value;
  settings.selectedTopics = [...picks.value];
  settings.selectedVoiceName = voice.value;
  settings.mixVoice = mix.value;
  settings.completeOnboarding();
  router.replace('/');
}
function togglePick(id: string) {
  const idx = picks.value.indexOf(id);
  if (idx >= 0) picks.value.splice(idx, 1);
  else picks.value.push(id);
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
    /* ignore */
  }
}

watch(step, async (s) => {
  if (s === 4 && englishVoices.value.length === 0) {
    await speechService.ensureVoicesLoaded();
    englishVoices.value = speechService.getEnglishVoices();
    if (!voice.value && englishVoices.value[0]) voice.value = englishVoices.value[0].name;
  }
});

onMounted(async () => {
  await speechService.ensureVoicesLoaded();
  englishVoices.value = speechService.getEnglishVoices();
});

const features = [
  ['Listen many times', 'cho đến khi chunk thành phản xạ tự nhiên'],
  ['Practice actively', 'flashcards · dictation · matches'],
  ['Track your streak', 'thắng nhỏ mỗi ngày → tiến bộ lớn cả năm'],
];

const levelOpts: Array<{ k: ChunkLevel; name: string; hint: string }> = [
  { k: 'A1', name: 'Mới bắt đầu', hint: 'Chunk ngắn, đơn giản · "What time is it?"' },
  { k: 'A2', name: 'Xây căn bản', hint: 'Chunk công việc hằng ngày · "I will check the bug."' },
  { k: 'B1', name: 'Khá tự tin', hint: 'Chunk dài hơn · "I was responsible for…"' },
];

const presets = [
  { v: 15, l: 'Gentle' },
  { v: 30, l: 'Steady' },
  { v: 50, l: 'Intense' },
];
</script>

<template>
  <div
    :style="{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-0)',
      zIndex: 95,
    }"
  >
    <!-- Top bar -->
    <div
      :style="{
        padding: '54px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }"
    >
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
        <button
          class="btn tap"
          :disabled="step === 0"
          :style="{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--color-surface-2)',
            opacity: step === 0 ? 0 : 1,
            color: 'var(--color-text-1)',
          }"
          @click="back"
        >
          <Icon name="chevron-left" :size="18" />
        </button>
        <div
          :style="{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-text-3)',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
          }"
        >
          Step <span class="mono" :style="{ color: 'var(--color-text-1)' }">{{ step + 1 }}</span> of <span class="mono">{{ TOTAL }}</span>
        </div>
        <button
          class="btn tap"
          :style="{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)' }"
          @click="finish"
        >Skip</button>
      </div>
      <div :style="{ display: 'flex', gap: '4px' }">
        <div
          v-for="i in TOTAL"
          :key="i"
          :style="{
            flex: 1,
            height: '3px',
            borderRadius: '2px',
            background: i - 1 <= step ? 'var(--grad-primary)' : 'var(--color-surface-2)',
            transition: 'background .3s',
          }"
        />
      </div>
    </div>

    <!-- Body -->
    <div :style="{ flex: 1, overflowY: 'auto' }">
      <!-- Step 0: Welcome -->
      <div
        v-if="step === 0"
        :style="{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }"
      >
        <div :style="{ position: 'relative', width: '140px', height: '140px', marginTop: '30px' }">
          <div :style="{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.4), transparent 60%)', filter: 'blur(20px)' }" />
          <div
            :style="{
              position: 'absolute',
              inset: '12px',
              borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'grid',
              placeItems: 'center',
              color: '#0B0F22',
              boxShadow: '0 20px 60px rgba(34,211,238,0.20)',
            }"
          >
            <Icon name="headphones" :size="56" />
          </div>
        </div>
        <h1 :style="{ margin: '20px 0 0', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em' }">
          Chào — chào mừng đến <span class="grad-text">Chunk Lab</span>
        </h1>
        <div :style="{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.5, maxWidth: '300px' }">
          Bạn sẽ học English bằng các <b :style="{ color: 'var(--color-text-1)' }">chunk</b> — câu/cụm tái sử dụng để dùng ở standup, phỏng vấn, và làm việc với client.
        </div>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', width: '100%' }">
          <div
            v-for="(f, i) in features"
            :key="i"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '14px',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-1)',
            }"
          >
            <div
              :style="{
                width: '28px',
                height: '28px',
                borderRadius: '9px',
                background: 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'var(--color-cyan)',
                fontWeight: 700,
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }"
            >{{ i + 1 }}</div>
            <div :style="{ textAlign: 'left' }">
              <div :style="{ fontSize: '13px', fontWeight: 600 }">{{ f[0] }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">{{ f[1] }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: Goal -->
      <div
        v-else-if="step === 1"
        :style="{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }"
      >
        <div>
          <h2 :style="{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.015em' }">Mỗi ngày nghe bao nhiêu chunk?</h2>
          <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '6px', lineHeight: 1.5 }">
            Có thể đổi bất cứ lúc nào. Đa số học viên chọn 20–40.
          </div>
        </div>

        <div
          class="glass-strong"
          :style="{
            padding: '32px 20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(34,211,238,0.16), rgba(167,139,250,0.06)), var(--color-surface-2)',
          }"
        >
          <div :style="{ position: 'absolute', inset: 0, background: 'radial-gradient(50% 60% at 50% 10%, rgba(34,211,238,0.25), transparent)' }" />
          <div :style="{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }">
            <span class="mono" :style="{ fontSize: '64px', fontWeight: 700, letterSpacing: '-0.02em' }">{{ goal }}</span>
            <span :style="{ fontSize: '14px', color: 'var(--color-text-3)', fontWeight: 600 }">chunks/ngày</span>
          </div>
          <div :style="{ position: 'relative', fontSize: '12px', color: 'var(--color-text-3)', marginTop: '6px' }">
            ≈ <span class="mono" :style="{ color: 'var(--color-cyan)' }">{{ Math.round(goal * 0.65) }}</span> phút nghe
          </div>
        </div>

        <div>
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            :value="goal"
            :style="{ width: '100%', accentColor: '#22D3EE' }"
            @input="goal = Number(($event.target as HTMLInputElement).value)"
          />
          <div :style="{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-4)', fontFamily: 'var(--font-mono)' }">
            <span>10</span><span>40</span><span>80</span>
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '8px' }">
          <button
            v-for="p in presets"
            :key="p.v"
            class="btn tap"
            :style="{
              flex: 1,
              padding: '12px 0',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              background: goal === p.v ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
              border: goal === p.v ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
              color: goal === p.v ? 'var(--color-cyan)' : 'var(--color-text-2)',
            }"
            @click="goal = p.v"
          >
            <div class="mono" :style="{ fontWeight: 700, fontSize: '16px' }">{{ p.v }}</div>
            <div :style="{ fontSize: '10px', fontWeight: 600, marginTop: '2px' }">{{ p.l }}</div>
          </button>
        </div>
      </div>

      <!-- Step 2: Level -->
      <div
        v-else-if="step === 2"
        :style="{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }"
      >
        <div>
          <h2 :style="{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.015em' }">Trình độ hiện tại?</h2>
          <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '6px', lineHeight: 1.5 }">
            App sẽ mix nhiều level — nhưng bắt đầu nơi bạn thoải mái.
          </div>
        </div>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
          <button
            v-for="o in levelOpts"
            :key="o.k"
            class="btn tap"
            :style="{
              padding: '16px',
              borderRadius: '16px',
              textAlign: 'left',
              background: levelLocal === o.k
                ? 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(167,139,250,0.04))'
                : 'var(--color-surface-2)',
              border: levelLocal === o.k ? '1px solid var(--color-violet)' : '1px solid var(--color-border-1)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }"
            @click="levelLocal = o.k"
          >
            <LevelPill :level="o.k" />
            <div :style="{ flex: 1 }">
              <div :style="{ fontSize: '14px', fontWeight: 700 }">{{ o.name }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }">{{ o.hint }}</div>
            </div>
            <div
              v-if="levelLocal === o.k"
              :style="{
                width: '22px',
                height: '22px',
                borderRadius: '11px',
                background: 'var(--color-violet)',
                display: 'grid',
                placeItems: 'center',
                color: '#0B0F22',
              }"
            >
              <Icon name="check" :size="14" />
            </div>
          </button>
        </div>
        <div
          :style="{
            marginTop: '4px',
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--color-surface-1)',
            border: '1px dashed var(--color-border-2)',
            display: 'flex',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--color-text-3)',
          }"
        >
          <Icon name="sparkles" :size="14" :style="{ color: 'var(--color-cyan)', marginTop: '1px', flexShrink: 0 }" />
          <span>Không cần lo — mọi chunk đều được tag, Smart Review sẽ tự surface độ khó phù hợp.</span>
        </div>
      </div>

      <!-- Step 3: Topics -->
      <div
        v-else-if="step === 3"
        :style="{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }"
      >
        <div>
          <h2 :style="{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.015em' }">Chọn chủ đề</h2>
          <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '6px', lineHeight: 1.5 }">
            Library sẽ seed theo đây. Chọn ít nhất 1 —
            <span class="mono" :style="{ color: picks.length >= 3 ? 'var(--color-emerald)' : 'var(--color-text-2)' }">{{ picks.length }}</span>
            đã chọn.
          </div>
        </div>
        <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }">
          <button
            v-for="t in chunks.topics"
            :key="t.id"
            class="btn tap"
            :style="{
              padding: '14px',
              borderRadius: '16px',
              textAlign: 'left',
              background: picks.includes(t.id)
                ? `linear-gradient(135deg, color-mix(in oklch, ${t.color} 22%, transparent), color-mix(in oklch, ${t.color} 6%, transparent)), var(--color-surface-2)`
                : 'var(--color-surface-2)',
              border: picks.includes(t.id)
                ? `1px solid color-mix(in oklch, ${t.color} 50%, transparent)`
                : '1px solid var(--color-border-1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
            }"
            @click="togglePick(t.id)"
          >
            <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
              <div
                :style="{
                  width: '36px',
                  height: '36px',
                  borderRadius: '11px',
                  background: `color-mix(in oklch, ${t.color} ${picks.includes(t.id) ? 28 : 16}%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${t.color} ${picks.includes(t.id) ? 40 : 20}%, transparent)`,
                  display: 'grid',
                  placeItems: 'center',
                  color: t.color,
                }"
              >
                <TopicIcon :name="t.id" :size="18" />
              </div>
              <div
                v-if="picks.includes(t.id)"
                :style="{
                  width: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  background: t.color,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#0B0F22',
                }"
              >
                <Icon name="check" :size="12" />
              </div>
            </div>
            <div>
              <div :style="{ fontSize: '12px', fontWeight: 700 }">{{ t.name }}</div>
              <div class="mono" :style="{ fontSize: '10px', color: 'var(--color-text-3)', marginTop: '2px' }">
                ~{{ t.count }} chunks
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 4: Voice -->
      <div
        v-else
        :style="{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }"
      >
        <div>
          <h2 :style="{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.015em' }">Chọn giọng đọc mặc định</h2>
          <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '6px', lineHeight: 1.5 }">
            Tap để nghe thử. Bạn có thể mix nhiều giọng để đỡ ngán.
          </div>
        </div>

        <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
          <p
            v-if="englishVoices.length === 0"
            :style="{ fontSize: '13px', color: 'var(--color-text-3)' }"
          >Không tìm thấy giọng English trên thiết bị này — bạn vẫn dùng được mặc định.</p>
          <div
            v-for="v in englishVoices"
            :key="v.name"
            role="button"
            class="tap"
            :style="{
              padding: '14px 16px',
              borderRadius: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              background: voice === v.name ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
              border: voice === v.name ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }"
            @click="voice = v.name"
          >
            <div
              :style="{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: voice === v.name ? 'var(--grad-primary)' : 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                color: voice === v.name ? '#0B0F22' : 'var(--color-text-1)',
              }"
            >
              <Icon name="mic" :size="20" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ fontSize: '14px', fontWeight: 700 }">{{ v.name }}</div>
              <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
                {{ v.lang }}{{ v.localService ? ' · local' : ' · cloud' }}
              </div>
            </div>
            <button
              class="btn tap"
              :style="{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-surface-3)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'var(--color-text-1)',
              }"
              @click="(e) => previewVoice(v.name, e)"
            >
              <Icon name="play" :size="12" :style="{ marginLeft: '1px' }" />
            </button>
          </div>
        </div>

        <div
          class="glass"
          :style="{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }"
        >
          <div
            :style="{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'color-mix(in oklch, var(--color-violet) 22%, transparent)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: 'var(--color-violet)',
            }"
          >
            <Icon name="speaker" :size="16" />
          </div>
          <div :style="{ flex: 1 }">
            <div :style="{ fontSize: '13px', fontWeight: 700 }">Mix voices mỗi chunk</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              Đổi giọng — dễ chịu hơn khi nghe lâu
            </div>
          </div>
          <button
            class="btn tap"
            :style="{
              width: '42px',
              height: '26px',
              borderRadius: '99px',
              position: 'relative',
              flexShrink: 0,
              background: mix ? 'var(--color-cyan)' : 'var(--color-surface-3)',
              transition: 'background .15s',
            }"
            @click="mix = !mix"
          >
            <span
              :style="{
                position: 'absolute',
                top: '3px',
                left: mix ? '19px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .15s',
                boxShadow: '0 2px 4px rgba(0,0,0,.2)',
              }"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Continue button -->
    <div :style="{ padding: '12px 20px 28px' }">
      <button
        class="btn tap"
        :disabled="!canAdvance"
        :style="{
          width: '100%',
          padding: '16px',
          borderRadius: '16px',
          fontSize: '15px',
          fontWeight: 700,
          background: canAdvance ? 'var(--grad-primary)' : 'var(--color-surface-2)',
          color: canAdvance ? '#0B0F22' : 'var(--color-text-3)',
          opacity: canAdvance ? 1 : 0.6,
          boxShadow: canAdvance ? '0 12px 30px rgba(34,211,238,0.12)' : 'none',
        }"
        @click="next"
      >{{ isFinal ? "I'm ready · bắt đầu" : 'Continue →' }}</button>
    </div>
  </div>
</template>
