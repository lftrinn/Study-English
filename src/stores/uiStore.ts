import { defineStore } from 'pinia';
import { ref } from 'vue';

export type SheetKind =
  | 'none'
  | 'chunk-detail'
  | 'filter'
  | 'voice'
  | 'test-setup'
  | 'session-summary';

export const useUiStore = defineStore('ui', () => {
  const sheet = ref<SheetKind>('none');
  const sheetChunkId = ref<string | null>(null);
  const installPromptVisible = ref(false);
  const compactPlayer = ref(false);

  function openChunkDetail(chunkId: string) {
    sheet.value = 'chunk-detail';
    sheetChunkId.value = chunkId;
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

  return {
    sheet,
    sheetChunkId,
    installPromptVisible,
    compactPlayer,
    openChunkDetail,
    openSheet,
    closeSheet,
    setCompactPlayer,
    setInstallPromptVisible,
  };
});
