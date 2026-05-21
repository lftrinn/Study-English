import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Chunk } from '@/types/chunk';
import type { ListeningMode } from '@/types/progress';
import { speechService } from '@/services/speechService';
import { useSettingsStore } from './settingsStore';
import { useProgressStore } from './progressStore';

export type RepeatMode = 'none' | 'one' | 'all';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePlayerStore = defineStore('player', () => {
  const queue = ref<Chunk[]>([]);
  const queueIndex = ref(0);
  const isPlaying = ref(false);
  const isPaused = ref(false);
  const repeatMode = ref<RepeatMode>('all');
  const shuffle = ref(false);
  const speed = ref(1);
  const gap = ref(600);
  const repeatEach = ref(1);
  const mixVoice = ref(false);
  const selectedVoiceName = ref<string | null>(null);
  const sessionPlayedCount = ref(0);
  const listeningMode = ref<ListeningMode>('normal');

  let currentToken = 0;

  const current = computed<Chunk | undefined>(() => queue.value[queueIndex.value]);
  const queueLength = computed(() => queue.value.length);
  const hasNext = computed(() => {
    if (repeatMode.value !== 'none') return queue.value.length > 0;
    return queueIndex.value < queue.value.length - 1;
  });
  const hasPrev = computed(() => queueIndex.value > 0 || repeatMode.value !== 'none');

  function syncFromSettings() {
    const settings = useSettingsStore();
    speed.value = settings.defaultSpeed;
    gap.value = settings.defaultGap;
    repeatEach.value = settings.defaultRepeatEach;
    repeatMode.value = settings.defaultRepeatMode;
    mixVoice.value = settings.mixVoice;
    selectedVoiceName.value = settings.selectedVoiceName;
  }

  function setQueue(chunks: Chunk[], opts?: { startIndex?: number; mode?: ListeningMode }) {
    syncFromSettings();
    const list = shuffle.value ? shuffleArray(chunks) : [...chunks];
    queue.value = list;
    queueIndex.value = Math.max(0, Math.min(opts?.startIndex ?? 0, list.length - 1));
    sessionPlayedCount.value = 0;
    listeningMode.value = opts?.mode ?? 'normal';
  }

  function clearQueue() {
    stop();
    queue.value = [];
    queueIndex.value = 0;
  }

  function moveTo(index: number) {
    if (index < 0 || index >= queue.value.length) return;
    queueIndex.value = index;
  }

  function setShuffle(value: boolean) {
    shuffle.value = value;
    if (value && queue.value.length > 0) {
      const cur = queue.value[queueIndex.value];
      const rest = queue.value.filter((_, i) => i !== queueIndex.value);
      const reshuffled = shuffleArray(rest);
      queue.value = [cur, ...reshuffled];
      queueIndex.value = 0;
    }
  }
  function toggleShuffle() {
    setShuffle(!shuffle.value);
  }

  function cycleRepeat() {
    const order: RepeatMode[] = ['none', 'all', 'one'];
    const idx = order.indexOf(repeatMode.value);
    repeatMode.value = order[(idx + 1) % order.length];
  }
  function setRepeatMode(m: RepeatMode) {
    repeatMode.value = m;
  }

  function setSpeed(v: number) {
    speed.value = Math.max(0.5, Math.min(2, v));
  }
  function setGap(ms: number) {
    gap.value = Math.max(0, Math.min(5000, ms));
  }
  function setRepeatEach(n: number) {
    repeatEach.value = Math.max(1, Math.min(10, n));
  }
  function setMixVoice(v: boolean) {
    mixVoice.value = v;
  }
  function setVoiceName(name: string | null) {
    selectedVoiceName.value = name;
  }

  async function play() {
    if (!current.value) return;
    if (isPlaying.value && isPaused.value) {
      speechService.resume();
      isPaused.value = false;
      return;
    }
    if (isPlaying.value) return;
    isPlaying.value = true;
    isPaused.value = false;
    const token = ++currentToken;
    await loopPlay(token);
  }

  function pause() {
    if (!isPlaying.value) return;
    speechService.pause();
    isPaused.value = true;
  }

  function stop() {
    currentToken += 1;
    speechService.cancel();
    isPlaying.value = false;
    isPaused.value = false;
  }

  function next() {
    if (queue.value.length === 0) return;
    if (repeatMode.value === 'one') {
      // stay on same index, restart playback
    } else if (queueIndex.value < queue.value.length - 1) {
      queueIndex.value += 1;
    } else if (repeatMode.value === 'all') {
      queueIndex.value = 0;
    } else {
      stop();
      return;
    }
    if (isPlaying.value) restartPlayback();
  }

  function prev() {
    if (queue.value.length === 0) return;
    if (queueIndex.value > 0) {
      queueIndex.value -= 1;
    } else if (repeatMode.value === 'all') {
      queueIndex.value = queue.value.length - 1;
    }
    if (isPlaying.value) restartPlayback();
  }

  function restartPlayback() {
    currentToken += 1;
    speechService.cancel();
    const token = ++currentToken;
    isPlaying.value = true;
    isPaused.value = false;
    void loopPlay(token);
  }

  async function loopPlay(token: number) {
    while (token === currentToken && current.value) {
      const chunk = current.value;
      const settings = useSettingsStore();
      const progress = useProgressStore();

      for (let i = 0; i < repeatEach.value; i += 1) {
        if (token !== currentToken) return;
        const voiceName = pickVoice();
        try {
          await speechService.speak({
            text: chunk.text,
            voiceName,
            rate: speed.value,
            trailingGapMs: gap.value,
          });
        } catch {
          if (token !== currentToken) return;
        }
        if (token !== currentToken) return;
        if (i === 0) {
          sessionPlayedCount.value += 1;
          void progress.recordListen(chunk, {
            mode: listeningMode.value,
            rate: speed.value,
            voiceName,
          });
          settings.lastTopic = chunk.topic;
        }
      }

      if (token !== currentToken) return;

      // Advance to next chunk based on repeat mode.
      if (repeatMode.value === 'one') {
        continue;
      }
      if (queueIndex.value < queue.value.length - 1) {
        queueIndex.value += 1;
      } else if (repeatMode.value === 'all') {
        queueIndex.value = 0;
      } else {
        isPlaying.value = false;
        return;
      }
    }
  }

  function pickVoice(): string | undefined {
    if (mixVoice.value) {
      const voices = speechService.getEnglishVoices();
      if (voices.length === 0) return selectedVoiceName.value ?? undefined;
      return voices[Math.floor(Math.random() * voices.length)].name;
    }
    return selectedVoiceName.value ?? undefined;
  }

  return {
    queue,
    queueIndex,
    isPlaying,
    isPaused,
    repeatMode,
    shuffle,
    speed,
    gap,
    repeatEach,
    mixVoice,
    selectedVoiceName,
    sessionPlayedCount,
    listeningMode,
    current,
    queueLength,
    hasNext,
    hasPrev,
    syncFromSettings,
    setQueue,
    clearQueue,
    moveTo,
    setShuffle,
    toggleShuffle,
    cycleRepeat,
    setRepeatMode,
    setSpeed,
    setGap,
    setRepeatEach,
    setMixVoice,
    setVoiceName,
    play,
    pause,
    stop,
    next,
    prev,
  };
});
