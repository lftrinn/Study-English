<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useChunkStore } from '@/stores/chunkStore';
import { speechService } from '@/services/speechService';
import { storageService, type BackupShape } from '@/services/storageService';
import type { Chunk } from '@/types/chunk';

import AppCard from '@/components/common/AppCard.vue';
import AppButton from '@/components/common/AppButton.vue';
import AppSheet from '@/components/common/AppSheet.vue';
import ChunkFormSheet from '@/components/chunk/ChunkFormSheet.vue';
import TopicChip from '@/components/chunk/TopicChip.vue';
import Icon from '@/components/common/Icon.vue';

const settings = useSettingsStore();
const progress = useProgressStore();
const chunks = useChunkStore();

const voiceSheetOpen = ref(false);
const confirmClearOpen = ref(false);
const formOpen = ref(false);
const editingChunk = ref<Chunk | undefined>(undefined);
const englishVoices = ref<SpeechSynthesisVoice[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const importStatus = ref<{ kind: 'idle' | 'success' | 'error'; message?: string }>({
  kind: 'idle',
});

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

onMounted(async () => {
  await speechService.ensureVoicesLoaded();
  englishVoices.value = speechService.getEnglishVoices();
});

const currentVoiceLabel = computed(
  () => settings.selectedVoiceName ?? 'Mặc định trình duyệt',
);

function setTheme(t: 'dark' | 'light') {
  settings.setTheme(t);
}
function pickVoice(name: string) {
  settings.selectedVoiceName = name;
  voiceSheetOpen.value = false;
}
async function previewVoice(name: string, e: Event) {
  e.stopPropagation();
  try {
    await speechService.speak({
      text: 'Hello, this is a chunk listening lab voice preview.',
      voiceName: name,
      rate: settings.defaultSpeed,
    });
  } catch {
    // ignore
  }
}

function adjustSpeed(delta: number) {
  const next = Math.round((settings.defaultSpeed + delta) * 10) / 10;
  settings.defaultSpeed = Math.max(0.5, Math.min(2, next));
}
function adjustGap(delta: number) {
  settings.defaultGap = Math.max(0, Math.min(5000, settings.defaultGap + delta));
}
function adjustRepeatEach(delta: number) {
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
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `chunk-listening-lab-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
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
    importStatus.value = {
      kind: 'success',
      message: `Đã import ${parsed.progress?.length ?? 0} progress + ${
        parsed.listeningLogs?.length ?? 0
      } log.`,
    };
  } catch (err) {
    importStatus.value = {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Import lỗi',
    };
  } finally {
    input.value = '';
  }
}

async function clearAllData() {
  await progress.clearAll();
  settings.resetAll();
  confirmClearOpen.value = false;
}
</script>

<template>
  <section class="set">
    <header class="set__head safe-pt">
      <p class="text-caption text-text-3">Cài đặt</p>
      <h1 class="text-title-1">Settings</h1>
    </header>

    <!-- Theme -->
    <AppCard variant="glass-strong" padding="md">
      <div class="set__row">
        <div>
          <p class="set__label">Giao diện</p>
          <p class="set__hint">Chuyển dark/light. Mặc định dark.</p>
        </div>
        <div class="set__theme">
          <button
            class="set__theme-btn tap"
            :class="{ 'is-active': settings.theme === 'dark' }"
            @click="setTheme('dark')"
          >
            <Icon name="moon" :size="16" /> Dark
          </button>
          <button
            class="set__theme-btn tap"
            :class="{ 'is-active': settings.theme === 'light' }"
            @click="setTheme('light')"
          >
            <Icon name="sun" :size="16" /> Light
          </button>
        </div>
      </div>
    </AppCard>

    <!-- Voice -->
    <AppCard padding="md">
      <button class="set__row set__row--btn tap" @click="voiceSheetOpen = true">
        <div>
          <p class="set__label">Giọng đọc</p>
          <p class="set__hint">{{ currentVoiceLabel }}</p>
        </div>
        <Icon name="chevron-right" :size="18" />
      </button>
      <hr class="set__divider" />
      <div class="set__row">
        <div>
          <p class="set__label">Mix voice mỗi chunk</p>
          <p class="set__hint">Random giọng để bạn quen với nhiều accent.</p>
        </div>
        <label class="set__switch">
          <input type="checkbox" v-model="settings.mixVoice" />
          <span class="set__switch-track" :class="{ 'is-on': settings.mixVoice }">
            <span class="set__switch-thumb" />
          </span>
        </label>
      </div>
    </AppCard>

    <!-- Playback defaults -->
    <AppCard padding="md" class="set__playback">
      <p class="set__label">Mặc định phát</p>
      <div class="set__tuners">
        <div class="set__tuner">
          <p class="set__tuner-label">Tốc độ</p>
          <div class="set__tuner-row">
            <button class="set__tuner-btn tap" @click="adjustSpeed(-0.1)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="set__tuner-value">{{ settings.defaultSpeed.toFixed(1) }}×</span>
            <button class="set__tuner-btn tap" @click="adjustSpeed(0.1)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
        <div class="set__tuner">
          <p class="set__tuner-label">Gap (ms)</p>
          <div class="set__tuner-row">
            <button class="set__tuner-btn tap" @click="adjustGap(-100)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="set__tuner-value">{{ settings.defaultGap }}</span>
            <button class="set__tuner-btn tap" @click="adjustGap(100)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
        <div class="set__tuner">
          <p class="set__tuner-label">Lặp mỗi chunk</p>
          <div class="set__tuner-row">
            <button class="set__tuner-btn tap" @click="adjustRepeatEach(-1)">
              <Icon name="minus" :size="14" />
            </button>
            <span class="set__tuner-value">×{{ settings.defaultRepeatEach }}</span>
            <button class="set__tuner-btn tap" @click="adjustRepeatEach(1)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Daily goal -->
    <AppCard padding="md">
      <div class="set__row">
        <div>
          <p class="set__label">Mục tiêu hôm nay</p>
          <p class="set__hint">{{ settings.dailyGoal }} chunks / ngày</p>
        </div>
        <div class="set__tuner-row">
          <button class="set__tuner-btn tap" @click="adjustGoal(-5)">
            <Icon name="minus" :size="14" />
          </button>
          <span class="set__tuner-value">{{ settings.dailyGoal }}</span>
          <button class="set__tuner-btn tap" @click="adjustGoal(5)">
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </div>
    </AppCard>

    <!-- Data -->
    <AppCard padding="md">
      <p class="set__label">Dữ liệu</p>
      <div class="set__data-row">
        <AppButton variant="glass" size="md" @click="exportData">
          <Icon name="download" :size="14" />
          Xuất backup
        </AppButton>
        <AppButton variant="glass" size="md" @click="triggerImport">
          <Icon name="upload" :size="14" />
          Nhập backup
        </AppButton>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="set__file-input"
        @change="onFile"
      />
      <p
        v-if="importStatus.kind !== 'idle'"
        class="set__import-status"
        :class="importStatus.kind"
      >
        {{ importStatus.message }}
      </p>
      <hr class="set__divider" />
      <AppButton variant="danger" size="md" block @click="confirmClearOpen = true">
        <Icon name="trash" :size="14" />
        Xoá toàn bộ dữ liệu local
      </AppButton>
    </AppCard>

    <!-- Custom chunks -->
    <AppCard padding="md">
      <div class="set__row">
        <div>
          <p class="set__label">Chunks tự tạo</p>
          <p class="set__hint">{{ chunks.customChunks.length }} chunk · lưu trong IndexedDB</p>
        </div>
        <AppButton variant="primary" size="sm" @click="openNewChunk">
          <Icon name="plus" :size="14" /> Thêm
        </AppButton>
      </div>
      <div v-if="chunks.customChunks.length > 0" class="set__custom-list">
        <article
          v-for="c in chunks.customChunks"
          :key="c.id"
          class="set__custom"
        >
          <div class="set__custom-info">
            <TopicChip :topic-id="c.topic" :show-icon="true" />
            <p class="set__custom-en">{{ c.text }}</p>
            <p class="set__custom-vi">{{ c.meaning }}</p>
          </div>
          <div class="set__custom-actions">
            <button class="set__custom-btn tap" :aria-label="'Sửa'" @click="openEditChunk(c)">
              <Icon name="pencil" :size="14" />
            </button>
            <button class="set__custom-btn rose tap" :aria-label="'Xoá'" @click="deleteCustom(c)">
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </article>
      </div>
    </AppCard>

    <!-- PWA hint -->
    <AppCard padding="md">
      <p class="set__label">Cài đặt PWA</p>
      <p class="set__hint">
        iOS: bấm <strong>Share</strong> trong Safari → <strong>Add to Home Screen</strong>.
        Android/Desktop Chrome: thanh địa chỉ sẽ hiện nút <strong>Install</strong>.
      </p>
    </AppCard>

    <ChunkFormSheet :open="formOpen" :initial="editingChunk" @close="formOpen = false" />

    <!-- About -->
    <AppCard padding="md">
      <p class="set__label">Về Chunk Listening Lab</p>
      <p class="set__hint">
        Mobile-first PWA giúp bạn học English bằng cụm từ tái sử dụng cho phỏng vấn FE, standup,
        và TOEIC. Local-first, không tài khoản, không backend.
      </p>
    </AppCard>

    <!-- Voice sheet -->
    <AppSheet :open="voiceSheetOpen" title="Chọn giọng đọc" @close="voiceSheetOpen = false">
      <div class="voices">
        <p v-if="englishVoices.length === 0" class="text-body text-text-3">
          Không tìm thấy giọng tiếng Anh nào trên thiết bị này.
        </p>
        <button
          v-for="v in englishVoices"
          :key="v.name"
          class="voices__row tap"
          :class="{ 'is-active': settings.selectedVoiceName === v.name }"
          @click="pickVoice(v.name)"
        >
          <span class="voices__main">
            <span class="voices__name">{{ v.name }}</span>
            <span class="voices__lang">{{ v.lang }}</span>
          </span>
          <button class="voices__preview tap" :aria-label="'Nghe thử'" @click="(e) => previewVoice(v.name, e)">
            <Icon name="play" :size="14" />
          </button>
        </button>
      </div>
    </AppSheet>

    <!-- Confirm clear -->
    <AppSheet :open="confirmClearOpen" title="Xoá dữ liệu?" @close="confirmClearOpen = false">
      <p class="text-body text-text-2">
        Hành động này sẽ xoá tất cả progress, log, cài đặt cá nhân khỏi thiết bị này. Không thể
        hoàn tác.
      </p>
      <template #actions>
        <AppButton variant="glass" size="md" block @click="confirmClearOpen = false">Huỷ</AppButton>
        <AppButton variant="danger" size="md" block @click="clearAllData">Xoá tất cả</AppButton>
      </template>
    </AppSheet>
  </section>
</template>

<style scoped>
.set {
  padding: 16px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.set__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: max(env(safe-area-inset-top), 12px);
  margin-bottom: 6px;
}

.set__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.set__row--btn {
  width: 100%;
  text-align: left;
  background: transparent;
  color: inherit;
}
.set__label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.set__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}

.set__divider {
  border: 0;
  border-top: 1px solid var(--color-border-1);
  margin: 14px 0;
}

/* Theme buttons */
.set__theme {
  display: flex;
  gap: 6px;
}
.set__theme-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
}
.set__theme-btn.is-active {
  color: var(--color-cyan);
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 35%, transparent);
}

/* Switch */
.set__switch {
  position: relative;
  display: inline-block;
}
.set__switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}
.set__switch-track {
  display: inline-block;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  position: relative;
  transition: background 0.18s ease;
}
.set__switch-track.is-on {
  background: var(--color-cyan);
  border-color: var(--color-cyan);
}
.set__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 0.18s var(--ease-out-soft, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.set__switch-track.is-on .set__switch-thumb {
  transform: translateX(18px);
}

/* Tuners */
.set__tuners {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}
.set__tuner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.set__tuner-label {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.set__tuner-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.set__tuner-btn {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.set__tuner-value {
  min-width: 48px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}

/* Data row */
.set__data-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
.set__file-input {
  display: none;
}
.set__import-status {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
}
.set__import-status.success {
  background: color-mix(in oklch, var(--color-emerald) 14%, transparent);
  color: var(--color-emerald);
  border: 1px solid color-mix(in oklch, var(--color-emerald) 35%, transparent);
}
.set__import-status.error {
  background: color-mix(in oklch, var(--color-rose) 14%, transparent);
  color: var(--color-rose);
  border: 1px solid color-mix(in oklch, var(--color-rose) 35%, transparent);
}

/* Custom chunks list */
.set__custom-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.set__custom {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.set__custom-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.set__custom-en {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.set__custom-vi {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.set__custom-actions {
  display: flex;
  gap: 6px;
}
.set__custom-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.set__custom-btn.rose {
  color: var(--color-rose);
  border-color: color-mix(in oklch, var(--color-rose) 30%, transparent);
}

/* Voices sheet */
.voices {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0 12px;
}
.voices__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
}
.voices__row.is-active {
  background: color-mix(in oklch, var(--color-cyan) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
}
.voices__main {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.voices__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}
.voices__lang {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-3);
}
.voices__preview {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
