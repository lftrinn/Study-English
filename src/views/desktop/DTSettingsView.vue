<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import Icon from '@/components/common/Icon.vue';
import MiniSwitch from '@/components/common/MiniSwitch.vue';

import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useUiStore } from '@/stores/uiStore';
import { speechService } from '@/services/speechService';
import { storageService } from '@/services/storageService';

const router = useRouter();
const settings = useSettingsStore();
const progress = useProgressStore();
const chunks = useChunkStore();
const ui = useUiStore();

type GroupId = 'profile' | 'audio' | 'practice' | 'appearance' | 'notifications' | 'data' | 'about';

const groups: Array<{ id: GroupId; label: string; icon: string }> = [
  { id: 'profile', label: 'Profile', icon: 'edit' },
  { id: 'audio', label: 'Audio', icon: 'speaker' },
  { id: 'practice', label: 'Practice', icon: 'brain' },
  { id: 'appearance', label: 'Appearance', icon: 'moon' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'data', label: 'Data', icon: 'download' },
  { id: 'about', label: 'About', icon: 'sparkle' },
];

const tab = ref<GroupId>('audio');

// ────── Audio
const voicePickerOpen = ref(false);
const voices = ref<SpeechSynthesisVoice[]>([]);

onMounted(async () => {
  try {
    voices.value = await speechService.ensureVoicesLoaded();
  } catch {
    voices.value = speechService.getVoices();
  }
});

const englishVoices = computed(() =>
  voices.value
    .filter((v) => v.lang?.toLowerCase().startsWith('en'))
    .slice(0, 16),
);

function pickVoice(name: string | null) {
  settings.selectedVoiceName = name;
  voicePickerOpen.value = false;
}
function previewVoice(name: string) {
  void speechService.speak({ text: 'Hello, this is your voice.', voiceName: name, rate: settings.defaultSpeed });
}

// ────── Steppers
function bumpSpeed(dir: 1 | -1) {
  const v = Math.max(0.5, Math.min(1.5, +(settings.defaultSpeed + dir * 0.05).toFixed(2)));
  settings.defaultSpeed = v;
}
function bumpGap(dir: 1 | -1) {
  const v = Math.max(0, Math.min(5000, settings.defaultGap + dir * 250));
  settings.defaultGap = v;
}
function bumpGoal(dir: 1 | -1) {
  const v = Math.max(5, Math.min(200, settings.dailyGoal + dir * 5));
  settings.dailyGoal = v;
}
function bumpRepeat(dir: 1 | -1) {
  const v = Math.max(1, Math.min(9, settings.defaultRepeatEach + dir));
  settings.defaultRepeatEach = v;
}

// ────── Data ops
const fileRef = ref<HTMLInputElement | null>(null);

function triggerImport() {
  fileRef.value?.click();
}
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    let list: any[];
    if (file.name.endsWith('.json')) {
      list = JSON.parse(text);
    } else {
      // simple CSV/TSV: text,meaning,topic,level
      const sep = file.name.endsWith('.tsv') ? '\t' : ',';
      list = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, idx) => {
          const cols = line.split(sep).map((c) => c.trim());
          return {
            id: `custom-${Date.now()}-${idx}`,
            text: cols[0] ?? '',
            meaning: cols[1] ?? '',
            topic: cols[2] || 'standup',
            level: (cols[3] as any) || 'A2',
            source: 'custom',
            tags: [],
          };
        });
    }
    let n = 0;
    for (const c of list) {
      if (!c.text || !c.meaning) continue;
      await chunks.upsertCustomChunk({
        id: c.id || `custom-${Date.now()}-${n}`,
        text: c.text,
        meaning: c.meaning,
        topic: c.topic || 'standup',
        level: c.level || 'A2',
        source: 'custom',
        tags: c.tags || [],
        examples: c.examples,
        phonetic: c.phonetic,
        note: c.note,
      });
      n += 1;
    }
    window.alert(`Đã import ${n} chunks.`);
  } catch (err) {
    window.alert('Import lỗi: ' + (err as Error).message);
  } finally {
    input.value = '';
  }
}

function exportLog() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: {
      displayName: settings.displayName,
      level: settings.level,
      dailyGoal: settings.dailyGoal,
    },
    progress: Array.from(progress.progressMap.values()),
    recentLogs: progress.recentLogs,
    customChunks: chunks.customChunks,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chunklab-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function installPwa() {
  const ev = ui.installPromptEvent;
  if (!ev) {
    window.alert('Trình duyệt chưa sẵn sàng để cài. Hãy thử mở app trên Chrome/Edge.');
    return;
  }
  try {
    await ev.prompt();
    await ev.userChoice;
    ui.setInstallPromptEvent(null);
  } catch {
    /* ignore */
  }
}

async function clearAll() {
  if (!window.confirm('Xoá toàn bộ progress + custom chunks? Không hoàn tác được.')) return;
  await progress.clearAll();
  try {
    await storageService.clearAll();
  } catch {
    /* ignore */
  }
  if (typeof localStorage !== 'undefined') {
    try { localStorage.removeItem('cll.settings.v1'); } catch { /* ignore */ }
  }
  window.alert('Đã xoá. App sẽ reload.');
  window.location.reload();
}

// ────── Profile
const avatarEmojis = ['🦊', '🐼', '🐯', '🦁', '🐨', '🐸', '🐙', '🦄', '🌟', '⚡', '🌈', '🎧'];
function cycleAvatar() {
  const cur = settings.displayName;
  const idx = avatarEmojis.findIndex((e) => cur.startsWith(e));
  const next = avatarEmojis[(idx + 1) % avatarEmojis.length];
  const name = cur.replace(/^[^\w\s]+\s*/, '').trim() || 'Bạn';
  settings.displayName = `${next} ${name}`;
}

const avatarChar = computed(() => {
  const n = (settings.displayName ?? '').trim();
  if (!n) return 'M';
  const first = Array.from(n)[0];
  return /^[a-zA-Z]/.test(first) ? first.toUpperCase() : first;
});

const hintLabels: Record<'below' | 'above' | 'inline', string> = {
  below: 'Dưới English',
  above: 'Trên English',
  inline: 'Cùng dòng',
};
function cycleHintPosition() {
  const order: Array<'below' | 'above' | 'inline'> = ['below', 'above', 'inline'];
  const idx = order.indexOf(settings.vietnameseHintPosition);
  settings.vietnameseHintPosition = order[(idx + 1) % order.length];
}
</script>

<template>
  <div class="scrollarea dt-st">
    <h1 class="dt-st__title">Settings</h1>
    <div class="dt-st__sub">Tune your listening lab.</div>

    <div class="dt-st__grid">
      <!-- Side nav -->
      <div class="dt-st__nav">
        <button
          v-for="g in groups"
          :key="g.id"
          class="btn tap dt-st__nav-btn"
          :class="{ 'is-active': tab === g.id }"
          @click="tab = g.id"
        >
          <Icon
            :name="g.icon as any"
            :size="15"
            :style="{ color: tab === g.id ? 'var(--color-cyan)' : 'var(--color-text-3)' }"
          />
          <span :style="{ fontWeight: tab === g.id ? 700 : 600 }">{{ g.label }}</span>
        </button>
      </div>

      <!-- Panel -->
      <div class="glass dt-st__panel">
        <!-- Profile -->
        <template v-if="tab === 'profile'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Profile</div>
            <div class="dt-st__h-hint">The person behind the listening lab.</div>
          </div>
          <div class="dt-st__profile">
            <div class="dt-st__avatar">{{ avatarChar }}</div>
            <div class="dt-st__profile-meta">
              <div class="dt-st__profile-name">{{ settings.displayName || 'Bạn' }} · {{ settings.role || 'Frontend Dev' }}</div>
              <div class="dt-st__profile-sub">Level {{ settings.level }} · Goal {{ settings.dailyGoal }}/day</div>
            </div>
            <button class="btn tap dt-st__edit-btn" @click="cycleAvatar">Đổi avatar</button>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Display name</div>
              <input v-model="settings.displayName" class="dt-st__input" placeholder="Bạn" />
            </div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Role / nghề</div>
              <input v-model="settings.role" class="dt-st__input" placeholder="Frontend Dev" />
            </div>
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">English level</div>
              <div class="dt-st__seg">
                <button
                  v-for="l in ['A1','A2','B1']"
                  :key="l"
                  class="btn tap dt-st__seg-btn"
                  :class="{ 'is-on': settings.level === l }"
                  @click="settings.level = l as any"
                >{{ l }}</button>
              </div>
            </div>
          </div>
        </template>

        <!-- Audio -->
        <template v-if="tab === 'audio'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Audio</div>
            <div class="dt-st__h-hint">How chunks play and rotate.</div>
          </div>
          <div class="dt-st__row dt-st__row--btn" @click="voicePickerOpen = true">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default voice</div>
              <div class="dt-st__row-hint">{{ settings.selectedVoiceName ?? 'Auto · system default' }}</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Mix voices</div>
              <div class="dt-st__row-hint">Rotate voices each chunk</div>
            </div>
            <MiniSwitch v-model="settings.mixVoice" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default speed</div>
              <div class="dt-st__row-hint">{{ settings.defaultSpeed.toFixed(2) }}× · {{ settings.defaultSpeed === 1 ? 'normal' : settings.defaultSpeed < 1 ? 'slower' : 'faster' }}</div>
            </div>
            <div class="dt-st__stepper">
              <button class="btn tap dt-st__step-btn" @click="bumpSpeed(-1)"><Icon name="minus" :size="12" /></button>
              <span class="mono">{{ settings.defaultSpeed.toFixed(2) }}×</span>
              <button class="btn tap dt-st__step-btn" @click="bumpSpeed(1)"><Icon name="plus" :size="12" /></button>
            </div>
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Gap between chunks</div>
              <div class="dt-st__row-hint">{{ (settings.defaultGap / 1000).toFixed(2) }}s</div>
            </div>
            <div class="dt-st__stepper">
              <button class="btn tap dt-st__step-btn" @click="bumpGap(-1)"><Icon name="minus" :size="12" /></button>
              <span class="mono">{{ (settings.defaultGap / 1000).toFixed(2) }}s</span>
              <button class="btn tap dt-st__step-btn" @click="bumpGap(1)"><Icon name="plus" :size="12" /></button>
            </div>
          </div>

          <!-- Voice picker -->
          <transition name="fade">
            <div v-if="voicePickerOpen" class="dt-st__popover-backdrop" @click="voicePickerOpen = false">
              <div class="dt-st__popover glass-strong" @click.stop>
                <div class="dt-st__popover-head">
                  <span>Chọn voice</span>
                  <button class="btn tap" @click="voicePickerOpen = false"><Icon name="x" :size="14" /></button>
                </div>
                <button
                  class="btn tap dt-st__voice"
                  :class="{ 'is-on': !settings.selectedVoiceName }"
                  @click="pickVoice(null)"
                >
                  <span>System default</span>
                  <span class="dt-st__voice-tag">Auto</span>
                </button>
                <button
                  v-for="v in englishVoices"
                  :key="v.voiceURI"
                  class="btn tap dt-st__voice"
                  :class="{ 'is-on': settings.selectedVoiceName === v.name }"
                  @click="pickVoice(v.name)"
                >
                  <span>{{ v.name }}</span>
                  <span class="dt-st__voice-tag">{{ v.lang }}</span>
                  <button class="btn tap dt-st__voice-play" @click.stop="previewVoice(v.name)" aria-label="Preview">
                    <Icon name="play" :size="11" />
                  </button>
                </button>
                <div v-if="englishVoices.length === 0" class="dt-st__voice-empty">
                  Trình duyệt chưa có English voice — thử Chrome / Safari.
                </div>
              </div>
            </div>
          </transition>
        </template>

        <!-- Practice -->
        <template v-if="tab === 'practice'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Practice</div>
            <div class="dt-st__h-hint">How your study loop is shaped.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default repeat</div>
              <div class="dt-st__row-hint">Each chunk × {{ settings.defaultRepeatEach }}</div>
            </div>
            <div class="dt-st__stepper">
              <button class="btn tap dt-st__step-btn" @click="bumpRepeat(-1)"><Icon name="minus" :size="12" /></button>
              <span class="mono">{{ settings.defaultRepeatEach }}×</span>
              <button class="btn tap dt-st__step-btn" @click="bumpRepeat(1)"><Icon name="plus" :size="12" /></button>
            </div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Daily goal</div>
              <div class="dt-st__row-hint">{{ settings.dailyGoal }} chunks · {{ progress.todayListenCount }}/{{ settings.dailyGoal }} hôm nay</div>
            </div>
            <div class="dt-st__stepper">
              <button class="btn tap dt-st__step-btn" @click="bumpGoal(-1)"><Icon name="minus" :size="12" /></button>
              <span class="mono">{{ settings.dailyGoal }}</span>
              <button class="btn tap dt-st__step-btn" @click="bumpGoal(1)"><Icon name="plus" :size="12" /></button>
            </div>
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Spaced repetition</div>
              <div class="dt-st__row-hint">Smart review · SM-2 algorithm</div>
            </div>
            <MiniSwitch v-model="settings.spacedRepetition" />
          </div>
        </template>

        <!-- Appearance -->
        <template v-if="tab === 'appearance'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Appearance</div>
            <div class="dt-st__h-hint">Light at the desk, dark on the train.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Theme</div>
              <div class="dt-st__row-hint">{{ settings.theme === 'dark' ? 'Midnight lab' : 'Bright lab' }}</div>
            </div>
            <div class="dt-st__theme">
              <button
                class="btn tap dt-st__theme-btn"
                :class="{ 'is-on': settings.theme === 'dark' }"
                @click="settings.setTheme('dark')"
                aria-label="Dark"
              ><Icon name="moon" :size="14" /></button>
              <button
                class="btn tap dt-st__theme-btn"
                :class="{ 'is-on': settings.theme === 'light' }"
                @click="settings.setTheme('light')"
                aria-label="Light"
              ><Icon name="sun" :size="14" /></button>
            </div>
          </div>
          <div class="dt-st__row is-last dt-st__row--btn" @click="cycleHintPosition">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Vietnamese hint position</div>
              <div class="dt-st__row-hint">{{ hintLabels[settings.vietnameseHintPosition] }}</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
        </template>

        <!-- Notifications -->
        <template v-if="tab === 'notifications'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Notifications</div>
            <div class="dt-st__h-hint">Gentle nudges, nothing else.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Daily reminder</div>
              <div class="dt-st__row-hint">9:00 — soft tone</div>
            </div>
            <MiniSwitch v-model="settings.notifyDailyReminder" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Streak alert</div>
              <div class="dt-st__row-hint">Before midnight only</div>
            </div>
            <MiniSwitch v-model="settings.notifyStreakAlert" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Weekly recap</div>
              <div class="dt-st__row-hint">Sunday morning</div>
            </div>
            <MiniSwitch v-model="settings.notifyWeeklyRecap" />
          </div>
        </template>

        <!-- Data -->
        <template v-if="tab === 'data'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Data</div>
            <div class="dt-st__h-hint">Bring chunks in, take your log out.</div>
          </div>
          <input ref="fileRef" type="file" accept=".json,.csv,.tsv" hidden @change="onFile" />
          <div class="dt-st__row dt-st__row--btn" @click="triggerImport">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Import chunks</div>
              <div class="dt-st__row-hint">CSV · TSV · JSON</div>
            </div>
            <Icon name="upload" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
          <div class="dt-st__row dt-st__row--btn" @click="exportLog">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Export listening log</div>
              <div class="dt-st__row-hint">Tải JSON full progress + custom chunks</div>
            </div>
            <Icon name="download" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
          <div class="dt-st__row dt-st__row--btn" @click="installPwa">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Install as PWA</div>
              <div class="dt-st__row-hint">{{ ui.installPromptEvent ? 'Cài app lên desktop' : 'Đã cài hoặc trình duyệt chưa support' }}</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
          <div class="dt-st__row is-last dt-st__row--btn" @click="clearAll">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl is-danger">Clear local data</div>
              <div class="dt-st__row-hint">This cannot be undone</div>
            </div>
            <Icon name="trash" :size="14" :style="{ color: 'var(--color-rose)' }" />
          </div>
        </template>

        <!-- About -->
        <template v-if="tab === 'about'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">About</div>
          </div>
          <div class="dt-st__about">
            Chunk Listening Lab — listening app cho frontend dev Việt học English.
            Build trên phương pháp chunking: đừng học từ rời, build cả cụm.
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Version</div>
              <div class="dt-st__row-hint">1.0.0 · build 24</div>
            </div>
          </div>
          <div
            class="dt-st__row is-last dt-st__row--btn"
            @click="router.push('/onboarding')"
          >
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Chạy lại onboarding</div>
              <div class="dt-st__row-hint">5 bước setup mục tiêu / level / topic</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-3)' }" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-st { padding: 28px; }
.dt-st__title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
.dt-st__sub { font-size: 13px; color: var(--color-text-3); margin-top: 2px; margin-bottom: 22px; }
.dt-st__grid { display: grid; grid-template-columns: 220px 1fr; gap: 22px; }

.dt-st__nav { display: flex; flex-direction: column; gap: 2px; }
.dt-st__nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-2); text-align: left;
  font-size: 13px;
}
.dt-st__nav-btn.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-border-2);
  color: var(--color-text-1);
}

.dt-st__panel { padding: 24px; position: relative; }
.dt-st__h { margin-bottom: 16px; }
.dt-st__h-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
.dt-st__h-hint { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.dt-st__row {
  padding: 12px 0; border-bottom: 1px solid var(--color-border-1);
  display: flex; align-items: center; gap: 12px;
}
.dt-st__row.is-last { border-bottom: 0; }
.dt-st__row--btn { cursor: pointer; }
.dt-st__row--btn:hover { background: var(--color-surface-1); border-radius: 8px; padding-left: 8px; padding-right: 8px; margin: 0 -8px; }
.dt-st__row-text { flex: 1; }
.dt-st__row-lbl { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.dt-st__row-lbl.is-danger { color: var(--color-rose); }
.dt-st__row-hint { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }

.dt-st__profile { display: flex; align-items: center; gap: 16px; padding: 6px 0 14px; }
.dt-st__avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--grad-primary);
  display: grid; place-items: center;
  font-size: 24px; font-weight: 700; color: #0b0f22;
}
.dt-st__profile-meta { flex: 1; }
.dt-st__profile-name { font-size: 16px; font-weight: 700; }
.dt-st__profile-sub { font-size: 12px; color: var(--color-text-3); }
.dt-st__edit-btn {
  padding: 8px 14px; border-radius: 10px;
  background: var(--color-surface-2); border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-2);
}

.dt-st__input {
  margin-top: 4px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px; color: var(--color-text-1);
  font-family: inherit;
  width: 240px;
}

.dt-st__seg { display: flex; gap: 6px; margin-top: 6px; }
.dt-st__seg-btn {
  padding: 6px 14px; border-radius: 8px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-3);
}
.dt-st__seg-btn.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-violet);
  color: var(--color-violet);
}

.dt-st__theme {
  display: flex; gap: 4px;
  background: var(--color-surface-1);
  padding: 3px; border-radius: 10px; border: 1px solid var(--color-border-1);
}
.dt-st__theme-btn {
  width: 32px; height: 28px; border-radius: 7px;
  display: grid; place-items: center;
  color: var(--color-text-3);
}
.dt-st__theme-btn.is-on { background: var(--color-surface-3); color: var(--color-cyan); }

.dt-st__stepper {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
  border-radius: 10px; padding: 4px 8px;
  font-size: 13px; font-weight: 700;
  min-width: 116px; justify-content: space-between;
}
.dt-st__step-btn {
  width: 22px; height: 22px; border-radius: 6px;
  display: grid; place-items: center;
  background: var(--color-surface-2);
  color: var(--color-text-2);
}
.dt-st__step-btn:hover { background: var(--color-surface-3); }

.dt-st__about {
  padding: 8px 0 14px; font-size: 13px; color: var(--color-text-2); line-height: 1.6;
}

.dt-st__popover-backdrop {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(2,4,15,0.6);
  backdrop-filter: blur(8px);
  display: grid; place-items: center;
}
.dt-st__popover {
  width: min(420px, 90vw);
  max-height: 70vh; overflow: auto;
  padding: 12px; border-radius: 16px;
  display: flex; flex-direction: column; gap: 4px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.dt-st__popover-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 6px 10px;
  border-bottom: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-2);
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.dt-st__voice {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 10px;
  background: var(--color-surface-1); border: 1px solid var(--color-border-1);
  text-align: left; font-size: 13px; color: var(--color-text-2);
}
.dt-st__voice:hover { background: var(--color-surface-2); }
.dt-st__voice.is-on {
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border-color: var(--color-cyan); color: var(--color-cyan);
}
.dt-st__voice > span:first-child { flex: 1; font-weight: 600; }
.dt-st__voice-tag {
  font-size: 10px; color: var(--color-text-4);
  padding: 2px 6px; border-radius: 99px;
  background: var(--color-surface-2);
}
.dt-st__voice-play {
  width: 24px; height: 24px; border-radius: 6px;
  display: grid; place-items: center;
  background: var(--color-surface-3); color: var(--color-text-2);
}
.dt-st__voice-empty {
  padding: 16px; text-align: center; font-size: 12px; color: var(--color-text-3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
