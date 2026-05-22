<script setup lang="ts">
/**
 * Literal port of screens-player.jsx SettingsScreen (lines 417-518).
 * Row + Group + MiniSwitch + ThemeToggle anatomies copied verbatim.
 */
import { computed, onMounted, ref } from 'vue';

import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { speechService } from '@/services/speechService';
import { storageService, type BackupShape } from '@/services/storageService';
import type { Chunk } from '@/types/chunk';

import AppSheet from '@/components/common/AppSheet.vue';
import ChunkFormSheet from '@/components/chunk/ChunkFormSheet.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import Icon from '@/components/common/Icon.vue';
import MiniSwitch from '@/components/common/MiniSwitch.vue';

const settings = useSettingsStore();
const progress = useProgressStore();
const chunks = useChunkStore();
const ui = useUiStore();
const player = usePlayerStore();

const canInstallPwa = computed(() => Boolean(ui.installPromptEvent));
const installStatus = ref<'idle' | 'installed' | 'dismissed'>('idle');

async function installPwa() {
  const evt = ui.installPromptEvent;
  if (!evt) return;
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    installStatus.value = choice.outcome === 'accepted' ? 'installed' : 'dismissed';
    if (choice.outcome === 'dismissed') settings.dismissInstallPrompt();
  } catch {
    /* ignore */
  } finally {
    ui.setInstallPromptEvent(null);
  }
}

const voiceSheetOpen = ref(false);
const speedSheetOpen = ref(false);
const gapSheetOpen = ref(false);
const repeatSheetOpen = ref(false);
const goalSheetOpen = ref(false);
const hintSheetOpen = ref(false);
const confirmClearOpen = ref(false);
const profileSheetOpen = ref(false);
const profileDraft = ref({ displayName: '', role: '', level: 'A2' as 'A1' | 'A2' | 'B1' });

function openProfileEdit() {
  profileDraft.value = {
    displayName: settings.displayName,
    role: settings.role,
    level: settings.level,
  };
  profileSheetOpen.value = true;
}
function saveProfile() {
  const name = profileDraft.value.displayName.trim();
  const role = profileDraft.value.role.trim();
  settings.displayName = name || 'Bạn';
  settings.role = role || 'Learner';
  settings.level = profileDraft.value.level;
  profileSheetOpen.value = false;
}

const HINT_POSITION_LABELS: Record<'below' | 'above' | 'inline', string> = {
  below: 'Phía dưới English',
  above: 'Phía trên English',
  inline: 'Cùng dòng (—)',
};
const hintPositionLabel = computed(() => HINT_POSITION_LABELS[settings.vietnameseHintPosition]);
const formOpen = ref(false);
const editingChunk = ref<Chunk | undefined>(undefined);
const englishVoices = ref<SpeechSynthesisVoice[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const importStatus = ref<{ kind: 'idle' | 'success' | 'error'; message?: string }>({
  kind: 'idle',
});

const currentVoiceLabel = computed(() => settings.selectedVoiceName ?? 'Mặc định trình duyệt');
const voiceHint = computed(() => {
  const v = englishVoices.value.find((x) => x.name === settings.selectedVoiceName);
  if (!v) return 'Aria · US · Female · Clear';
  return `${v.name} · ${v.lang}${v.localService ? ' · local' : ''}`;
});

onMounted(async () => {
  await speechService.ensureVoicesLoaded();
  englishVoices.value = speechService.getEnglishVoices();
});

function setTheme(t: 'dark' | 'light') {
  settings.setTheme(t);
}
function pickVoice(name: string) {
  settings.selectedVoiceName = name;
  voiceSheetOpen.value = false;
}
async function previewVoice(name: string, e: Event) {
  e.stopPropagation();
  // Web Speech API has a single global queue: pausing isn't enough — the
  // preview would be appended after the currently speaking utterance (and any
  // chunk the player's loop is about to enqueue). Stop the player to clear
  // the queue, play the preview, then resume from the same chunk index.
  const shouldResume = player.isPlaying;
  if (player.isPlaying) {
    player.stop();
  } else {
    speechService.cancel();
  }
  try {
    await speechService.speak({
      text: 'Hello, this is a chunk listening lab voice preview.',
      voiceName: name,
      rate: settings.defaultSpeed,
    });
  } catch {
    /* ignore */
  }
  if (shouldResume) {
    void player.play();
  }
}
function adjustSpeed(delta: number) {
  const v = Math.round((settings.defaultSpeed + delta) * 10) / 10;
  settings.defaultSpeed = Math.max(0.5, Math.min(2, v));
}
function adjustGap(delta: number) {
  settings.defaultGap = Math.max(0, Math.min(5000, settings.defaultGap + delta));
}
function adjustRepeat(delta: number) {
  settings.defaultRepeatEach = Math.max(1, Math.min(10, settings.defaultRepeatEach + delta));
}
function adjustGoal(delta: number) {
  settings.dailyGoal = Math.max(5, Math.min(200, settings.dailyGoal + delta));
}

async function exportData() {
  try {
    const data = await storageService.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunk-listening-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}
function triggerImport() {
  fileInput.value?.click();
}
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as BackupShape;
    await storageService.importBackup(parsed);
    await progress.hydrate();
    importStatus.value = { kind: 'success', message: `Imported ${parsed.progress?.length ?? 0} progress entries.` };
  } catch (err) {
    importStatus.value = { kind: 'error', message: err instanceof Error ? err.message : 'Import lỗi' };
  } finally {
    input.value = '';
  }
}
async function clearAllData() {
  await progress.clearAll();
  settings.resetAll();
  confirmClearOpen.value = false;
}
function openNewChunk() {
  editingChunk.value = undefined;
  formOpen.value = true;
}
function openEditChunk(c: Chunk) {
  editingChunk.value = c;
  formOpen.value = true;
}
async function deleteCustom(c: Chunk) {
  await chunks.deleteCustomChunkById(c.id);
}
</script>

<template>
  <div class="scrollarea" :style="{ paddingTop: '56px' }">
    <div :style="{ padding: '8px 20px 18px' }">
      <h1 :style="{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }">Settings</h1>
      <div :style="{ fontSize: '13px', color: 'var(--color-text-3)', marginTop: '2px' }">Tinh chỉnh listening lab</div>
    </div>

    <!-- TOEIC Training Center entry -->
    <router-link
      to="/toeic"
      class="btn tap toeic-entry"
      :style="{
        margin: '0 20px 14px',
        padding: '16px',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        background:
          'linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(167, 139, 250, 0.14))',
        border: '1px solid color-mix(in oklch, #22D3EE 32%, transparent)',
        textDecoration: 'none',
        color: 'inherit',
      }"
    >
      <span :style="{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #F59E0B, #FB7185)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        boxShadow: '0 8px 22px rgba(245,158,11,0.35), 0 1px 0 rgba(255,255,255,0.3) inset',
      }">
        <Icon name="trophy" :size="22" :style="{ color: '#fff', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.22))' }" />
      </span>
      <div :style="{ flex: 1, minWidth: 0 }">
        <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-cyan)', letterSpacing: '.05em', textTransform: 'uppercase' }">
          TOEIC Training Center
        </div>
        <div :style="{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }">
          Luyện 450 → 550 theo lộ trình
        </div>
        <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
          7 Part · Mini Test · Exam Mode · Mistake Notebook
        </div>
      </div>
      <Icon name="chevron-right" :size="18" :style="{ color: 'var(--color-cyan)' }" />
    </router-link>

    <!-- Profile card -->
    <div
      class="glass-strong"
      :style="{ margin: '0 20px 18px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }"
    >
      <div
        :style="{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--grad-primary)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '20px',
          fontWeight: 700,
          color: '#0B0F22',
        }"
      >{{ (settings.displayName || 'B').trim().charAt(0).toUpperCase() }}</div>
      <div :style="{ flex: 1, minWidth: 0 }">
        <div :style="{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ settings.displayName }} · {{ settings.role }}</div>
        <div :style="{ fontSize: '12px', color: 'var(--color-text-3)' }">
          Cấp {{ settings.level }} · Mục tiêu {{ settings.dailyGoal }}/ngày · {{ chunks.chunks.length }} chunks
        </div>
      </div>
      <button
        class="btn tap"
        :style="{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', display: 'grid', placeItems: 'center' }"
        :aria-label="'Sửa hồ sơ'"
        @click="openProfileEdit"
      >
        <Icon name="edit" :size="16" />
      </button>
    </div>

    <!-- AUDIO -->
    <div :style="{ marginBottom: '18px' }">
      <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 20px 8px' }">Audio</div>
      <div class="glass" :style="{ margin: '0 20px' }">
        <button
          class="btn tap settings__row"
          :style="{ borderBottom: '1px solid var(--color-border-1)' }"
          @click="voiceSheetOpen = true"
        >
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #22D3EE 22%, transparent)', color: '#22D3EE' }">
            <Icon name="mic" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Default voice</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">{{ voiceHint }}</div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>

        <div class="settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #A78BFA 22%, transparent)', color: '#A78BFA' }">
            <Icon name="speaker" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Mix voices</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">Đổi giọng mỗi chunk</div>
          </div>
          <button
            class="btn tap"
            :aria-pressed="settings.mixVoice"
            :style="{
              width: '42px',
              height: '26px',
              borderRadius: '99px',
              background: settings.mixVoice ? 'var(--color-cyan)' : 'var(--color-surface-3)',
              position: 'relative',
              transition: 'background .15s',
            }"
            @click.stop="settings.mixVoice = !settings.mixVoice"
          >
            <span :style="{
              position: 'absolute',
              top: '3px',
              left: settings.mixVoice ? '19px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .15s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,.2)',
            }" />
          </button>
        </div>

        <button
          class="btn tap settings__row"
          :style="{ borderBottom: '1px solid var(--color-border-1)' }"
          @click="speedSheetOpen = true"
        >
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #F59E0B 22%, transparent)', color: '#F59E0B' }">
            <Icon name="bolt" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Default speed</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">{{ settings.defaultSpeed.toFixed(2) }}×</span> · normal
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>

        <button class="btn tap settings__row" @click="gapSheetOpen = true">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #34D399 22%, transparent)', color: '#34D399' }">
            <Icon name="clock" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Gap between chunks</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">{{ settings.defaultGap }}ms</span>
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>
      </div>
    </div>

    <!-- PRACTICE -->
    <div :style="{ marginBottom: '18px' }">
      <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 20px 8px' }">Practice</div>
      <div class="glass" :style="{ margin: '0 20px' }">
        <button class="btn tap settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }" @click="repeatSheetOpen = true">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #60A5FA 22%, transparent)', color: '#60A5FA' }">
            <Icon name="repeat" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Lặp mỗi chunk</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">×{{ settings.defaultRepeatEach }}</span>
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>
        <button class="btn tap settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }" @click="goalSheetOpen = true">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #FB7185 22%, transparent)', color: '#FB7185' }">
            <Icon name="target" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Mục tiêu hàng ngày</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              <span class="mono">{{ settings.dailyGoal }}</span> chunks ·
              <span :style="{ color: 'var(--color-emerald)' }">on track</span>
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>
        <div class="settings__row">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #A78BFA 22%, transparent)', color: '#A78BFA' }">
            <Icon name="brain" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Spaced repetition</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">Smart review · SM-2 algorithm</div>
          </div>
          <MiniSwitch v-model="settings.spacedRepetition" accent="var(--color-violet)" />
        </div>
      </div>
    </div>

    <!-- APPEARANCE -->
    <div :style="{ marginBottom: '18px' }">
      <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 20px 8px' }">Appearance</div>
      <div class="glass" :style="{ margin: '0 20px' }">
        <div class="settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #22D3EE 22%, transparent)', color: '#22D3EE' }">
            <Icon :name="settings.theme === 'dark' ? 'moon' : 'sun'" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Giao diện</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              {{ settings.theme === 'dark' ? 'Midnight lab' : 'Bright lab' }}
            </div>
          </div>
          <div
            :style="{
              display: 'flex',
              background: 'var(--color-surface-1)',
              borderRadius: '999px',
              padding: '3px',
              gap: '2px',
              border: '1px solid var(--color-border-1)',
            }"
          >
            <button
              v-for="k in (['dark', 'light'] as const)"
              :key="k"
              class="btn tap"
              :style="{
                width: '30px',
                height: '24px',
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                background: settings.theme === k ? 'var(--color-surface-3)' : 'transparent',
                color: settings.theme === k ? 'var(--color-cyan)' : 'var(--color-text-3)',
              }"
              @click="setTheme(k)"
            >
              <Icon :name="k === 'dark' ? 'moon' : 'sun'" :size="13" />
            </button>
          </div>
        </div>
        <button class="btn tap settings__row" @click="hintSheetOpen = true">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #34D399 22%, transparent)', color: '#34D399' }">
            <Icon name="globe" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Vị trí nghĩa Việt</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              {{ hintPositionLabel }}
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>
      </div>
    </div>

    <!-- CUSTOM CHUNKS -->
    <div :style="{ marginBottom: '18px' }">
      <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }">
        <span>Custom chunks</span>
        <button
          class="btn tap"
          :style="{
            fontSize: '11px',
            color: 'var(--color-cyan)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
          }"
          @click="openNewChunk"
        ><Icon name="plus" :size="12" />Thêm</button>
      </div>
      <div class="glass" :style="{ margin: '0 20px' }" v-if="chunks.customChunks.length > 0">
        <div
          v-for="(c, i) in chunks.customChunks"
          :key="c.id"
          class="settings__row"
          :style="{ borderBottom: i < chunks.customChunks.length - 1 ? '1px solid var(--color-border-1)' : 'none' }"
        >
          <TopicChip :topic-id="c.topic" :show-icon="true" size="sm" />
          <div :style="{ flex: 1, textAlign: 'left', minWidth: 0 }">
            <div :style="{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.text }}</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ c.meaning }}</div>
          </div>
          <button class="btn tap" :style="{ padding: '6px', color: 'var(--color-text-3)' }" @click="openEditChunk(c)">
            <Icon name="edit" :size="14" />
          </button>
          <button class="btn tap" :style="{ padding: '6px', color: 'var(--color-rose)' }" @click="deleteCustom(c)">
            <Icon name="trash" :size="14" />
          </button>
        </div>
      </div>
      <div
        v-else
        :style="{ padding: '12px 20px', fontSize: '12px', color: 'var(--color-text-3)', textAlign: 'center' }"
      >Chưa có chunk tự tạo.</div>
    </div>

    <!-- DATA -->
    <div :style="{ marginBottom: '18px' }">
      <div :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 20px 8px' }">Data</div>
      <div class="glass" :style="{ margin: '0 20px' }">
        <button class="btn tap settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }" @click="triggerImport">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #60A5FA 22%, transparent)', color: '#60A5FA' }">
            <Icon name="upload" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Import backup</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">JSON file</div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>
        <input ref="fileInput" type="file" accept="application/json" :style="{ display: 'none' }" @change="onFile" />

        <button class="btn tap settings__row" :style="{ borderBottom: '1px solid var(--color-border-1)' }" @click="exportData">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #34D399 22%, transparent)', color: '#34D399' }">
            <Icon name="download" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Export full backup</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">Progress + logs + custom chunks</div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>

        <button
          class="btn tap settings__row"
          :style="{ borderBottom: '1px solid var(--color-border-1)', opacity: canInstallPwa ? 1 : 0.55 }"
          :disabled="!canInstallPwa"
          @click="installPwa"
        >
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #F59E0B 22%, transparent)', color: '#F59E0B' }">
            <Icon name="trophy" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Install as PWA</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">
              {{ installStatus === 'installed'
                ? 'Đã cài — mở từ home screen'
                : canInstallPwa
                  ? 'Thêm vào home screen'
                  : 'Trình duyệt chưa hỗ trợ hoặc đã cài' }}
            </div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>

        <button class="btn tap settings__row" @click="confirmClearOpen = true">
          <span class="settings__icon" :style="{ background: 'color-mix(in oklch, #FB7185 22%, transparent)', color: '#FB7185' }">
            <Icon name="trash" :size="16" />
          </span>
          <div :style="{ flex: 1, textAlign: 'left' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">Clear local data</div>
            <div :style="{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }">Không hoàn tác được</div>
          </div>
          <Icon name="chevron-right" :size="16" :style="{ color: 'var(--color-text-4)' }" />
        </button>

        <p
          v-if="importStatus.kind !== 'idle'"
          :style="{
            margin: 0,
            padding: '10px 14px',
            fontSize: '12px',
            color: importStatus.kind === 'success' ? 'var(--color-emerald)' : 'var(--color-rose)',
            borderTop: '1px solid var(--color-border-1)',
          }"
        >{{ importStatus.message }}</p>
      </div>
    </div>

    <div :style="{ padding: '0 20px 20px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-4)' }">
      Chunk Listening Lab · v1.0.0
    </div>

    <!-- Sheets -->
    <AppSheet :open="voiceSheetOpen" title="Chọn giọng đọc" @close="voiceSheetOpen = false">
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
        <p v-if="englishVoices.length === 0" :style="{ fontSize: '13px', color: 'var(--color-text-3)' }">
          Không tìm thấy giọng English.
        </p>
        <button
          v-for="v in englishVoices"
          :key="v.name"
          class="btn tap"
          :style="{
            display: 'grid',
            gridTemplateColumns: '38px 1fr auto 34px',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '14px',
            background: settings.selectedVoiceName === v.name ? 'color-mix(in oklch, var(--color-cyan) 14%, transparent)' : 'var(--color-surface-1)',
            border: settings.selectedVoiceName === v.name ? '1px solid color-mix(in oklch, var(--color-cyan) 40%, transparent)' : '1px solid var(--color-border-1)',
            textAlign: 'left',
          }"
          @click="pickVoice(v.name)"
        >
          <span :style="{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--color-surface-2)', color: 'var(--color-text-2)', display: 'grid', placeItems: 'center' }">
            <Icon name="mic" :size="16" />
          </span>
          <span :style="{ minWidth: 0 }">
            <span :style="{ display: 'block', fontSize: '14px', fontWeight: 700 }">{{ v.name }}</span>
            <span :style="{ display: 'block', fontSize: '11px', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }">{{ v.lang }}</span>
          </span>
          <span :style="{ fontSize: '11px', color: settings.selectedVoiceName === v.name ? 'var(--color-cyan)' : 'var(--color-text-3)', fontWeight: 700 }">
            {{ settings.selectedVoiceName === v.name ? 'Đang dùng' : '' }}
          </span>
          <button class="btn tap" :style="{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--color-text-2)' }" @click="(e) => previewVoice(v.name, e)">
            <Icon name="play" :size="12" />
          </button>
        </button>
      </div>
    </AppSheet>

    <AppSheet :open="speedSheetOpen" title="Default speed" @close="speedSheetOpen = false">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--color-surface-1)' }">
        <button class="btn tap stepper-btn" @click="adjustSpeed(-0.1)">
          <Icon name="minus" :size="14" />
        </button>
        <span class="mono" :style="{ fontSize: '24px', fontWeight: 700 }">{{ settings.defaultSpeed.toFixed(2) }}×</span>
        <button class="btn tap stepper-btn" @click="adjustSpeed(0.1)">
          <Icon name="plus" :size="14" />
        </button>
      </div>
    </AppSheet>
    <AppSheet :open="gapSheetOpen" title="Gap (ms)" @close="gapSheetOpen = false">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--color-surface-1)' }">
        <button class="btn tap stepper-btn" @click="adjustGap(-100)">
          <Icon name="minus" :size="14" />
        </button>
        <span class="mono" :style="{ fontSize: '24px', fontWeight: 700 }">{{ settings.defaultGap }}</span>
        <button class="btn tap stepper-btn" @click="adjustGap(100)">
          <Icon name="plus" :size="14" />
        </button>
      </div>
    </AppSheet>
    <AppSheet :open="repeatSheetOpen" title="Lặp mỗi chunk" @close="repeatSheetOpen = false">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--color-surface-1)' }">
        <button class="btn tap stepper-btn" @click="adjustRepeat(-1)">
          <Icon name="minus" :size="14" />
        </button>
        <span class="mono" :style="{ fontSize: '24px', fontWeight: 700 }">×{{ settings.defaultRepeatEach }}</span>
        <button class="btn tap stepper-btn" @click="adjustRepeat(1)">
          <Icon name="plus" :size="14" />
        </button>
      </div>
    </AppSheet>
    <AppSheet :open="goalSheetOpen" title="Mục tiêu hàng ngày" @close="goalSheetOpen = false">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--color-surface-1)' }">
        <button class="btn tap stepper-btn" @click="adjustGoal(-5)">
          <Icon name="minus" :size="14" />
        </button>
        <span class="mono" :style="{ fontSize: '24px', fontWeight: 700 }">{{ settings.dailyGoal }}</span>
        <button class="btn tap stepper-btn" @click="adjustGoal(5)">
          <Icon name="plus" :size="14" />
        </button>
      </div>
    </AppSheet>

    <AppSheet :open="hintSheetOpen" title="Vị trí nghĩa Việt" @close="hintSheetOpen = false">
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
        <button
          v-for="opt in (['below', 'above', 'inline'] as const)"
          :key="opt"
          class="btn tap"
          :style="{
            padding: '14px',
            borderRadius: '14px',
            textAlign: 'left',
            background: settings.vietnameseHintPosition === opt ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
            border: settings.vietnameseHintPosition === opt ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: 600,
          }"
          @click="settings.vietnameseHintPosition = opt; hintSheetOpen = false"
        >
          <span :style="{ flex: 1 }">{{ HINT_POSITION_LABELS[opt] }}</span>
          <Icon v-if="settings.vietnameseHintPosition === opt" name="check" :size="18" :style="{ color: 'var(--color-cyan)' }" />
        </button>
      </div>
    </AppSheet>

    <AppSheet :open="confirmClearOpen" title="Xoá dữ liệu?" @close="confirmClearOpen = false">
      <p :style="{ fontSize: '14px', color: 'var(--color-text-2)' }">
        Hành động này sẽ xoá tất cả progress, log, cài đặt cá nhân khỏi thiết bị này. Không thể hoàn tác.
      </p>
      <template #actions>
        <button class="btn tap glass" :style="{ flex: 1, padding: '14px 0', borderRadius: '16px', fontSize: '14px', fontWeight: 700 }" @click="confirmClearOpen = false">Huỷ</button>
        <button class="btn tap" :style="{ flex: 1, padding: '14px 0', borderRadius: '16px', fontSize: '14px', fontWeight: 700, background: 'var(--color-rose)', color: '#fff' }" @click="clearAllData">Xoá hết</button>
      </template>
    </AppSheet>

    <AppSheet :open="profileSheetOpen" title="Sửa hồ sơ" @close="profileSheetOpen = false">
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '14px' }">
        <label :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <span :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }">Tên hiển thị</span>
          <input
            v-model="profileDraft.displayName"
            type="text"
            maxlength="40"
            placeholder="Tên của bạn"
            :style="{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-2)',
              color: 'var(--color-text-1)',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
            }"
          />
        </label>
        <label :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <span :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }">Vai trò / nghề nghiệp</span>
          <input
            v-model="profileDraft.role"
            type="text"
            maxlength="40"
            placeholder="VD: Frontend Dev"
            :style="{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-2)',
              color: 'var(--color-text-1)',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
            }"
          />
        </label>
        <div :style="{ display: 'flex', flexDirection: 'column', gap: '6px' }">
          <span :style="{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }">Cấp độ</span>
          <div :style="{ display: 'flex', gap: '8px' }">
            <button
              v-for="opt in (['A1', 'A2', 'B1'] as const)"
              :key="opt"
              class="btn tap"
              :style="{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: profileDraft.level === opt ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
                border: profileDraft.level === opt ? '1px solid var(--color-cyan)' : '1px solid var(--color-border-1)',
                fontSize: '14px',
                fontWeight: 700,
                color: profileDraft.level === opt ? 'var(--color-text-1)' : 'var(--color-text-2)',
              }"
              @click="profileDraft.level = opt"
            >{{ opt }}</button>
          </div>
        </div>
      </div>
      <template #actions>
        <button class="btn tap glass" :style="{ flex: 1, padding: '14px 0', borderRadius: '16px', fontSize: '14px', fontWeight: 700 }" @click="profileSheetOpen = false">Huỷ</button>
        <button
          class="btn tap"
          :style="{
            flex: 1,
            padding: '14px 0',
            borderRadius: '16px',
            background: 'var(--grad-primary)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            textShadow: '0 1px 1.5px rgba(0,0,0,0.18)',
          }"
          @click="saveProfile"
        >Lưu</button>
      </template>
    </AppSheet>

    <ChunkFormSheet :open="formOpen" :initial="editingChunk" @close="formOpen = false" />
  </div>
</template>

<style scoped>
.scrollarea {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.scrollarea::-webkit-scrollbar {
  display: none;
}
.settings__row {
  width: 100%;
  padding: 13px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
}
.settings__icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.stepper-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
  color: var(--color-text-2);
}
</style>
