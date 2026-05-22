import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

export type SheetKind =
  | 'none'
  | 'chunk-detail'
  | 'filter'
  | 'voice'
  | 'test-setup'
  | 'session-summary';

export type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const useUiStore = defineStore('ui', () => {
  const sheet = ref<SheetKind>('none');
  const sheetChunkId = ref<string | null>(null);
  const installPromptVisible = ref(false);
  const installPromptEvent = shallowRef<BeforeInstallPromptEventLike | null>(null);
  const compactPlayer = ref(false);
  /** Desktop-only: chunk currently highlighted in the rail (no sheet open). */
  const selectedChunkId = ref<string | null>(null);

  function openChunkDetail(chunkId: string) {
    sheet.value = 'chunk-detail';
    sheetChunkId.value = chunkId;
    selectedChunkId.value = chunkId;
  }
  function selectChunk(chunkId: string | null) {
    selectedChunkId.value = chunkId;
  }
  function openSheet(kind: Exclude<SheetKind, 'chunk-detail' | 'none'>) {
    sheet.value = kind;
    sheetChunkId.value = null;
  }
  function closeSheet() {
    sheet.value = 'none';
    sheetChunkId.value = null;
  }
  function setCompactPlayer(v: boolean) {
    compactPlayer.value = v;
  }
  function setInstallPromptVisible(v: boolean) {
    installPromptVisible.value = v;
  }
  function setInstallPromptEvent(e: BeforeInstallPromptEventLike | null) {
    installPromptEvent.value = e;
    installPromptVisible.value = Boolean(e);
  }

  return {
    sheet,
    sheetChunkId,
    selectedChunkId,
    installPromptVisible,
    installPromptEvent,
    compactPlayer,
    openChunkDetail,
    selectChunk,
    openSheet,
    closeSheet,
    setCompactPlayer,
    setInstallPromptVisible,
    setInstallPromptEvent,
  };
});
