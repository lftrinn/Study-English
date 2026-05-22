import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useChunkStore } from '@/stores/chunkStore';
import { usePlayerStore } from '@/stores/playerStore';
import { pipService } from '@/services/pipService';

/**
 * Wires the current player chunk to the offscreen PiP canvas. Returns
 * reactive `supported` / `active` flags plus a `toggle()` callable from a
 * user gesture (iOS requires the gesture for requestPictureInPicture).
 */
export function usePictureInPicture() {
  const player = usePlayerStore();
  const chunks = useChunkStore();

  const supported = computed(() => pipService.isSupported());
  const active = ref(pipService.isActive());

  function buildData() {
    const c = player.current;
    if (!c) return null;
    const topic = chunks.topicById(c.topic);
    return {
      text: c.text,
      phonetic: c.phonetic,
      meaning: c.meaning,
      topicColor: topic?.color,
    };
  }

  // Keep the canvas in sync with the live player.
  const stopWatch = watch(
    () => player.current?.id,
    () => {
      if (!active.value) return;
      const data = buildData();
      if (data) pipService.update(data);
      else pipService.clear();
    },
  );

  async function toggle() {
    if (!supported.value) {
      console.warn('[pip] Trình duyệt không hỗ trợ Picture-in-Picture.');
      return;
    }
    if (active.value) {
      try {
        await pipService.exit();
      } catch (err) {
        console.warn('[pip] exit thất bại:', err);
      }
      active.value = false;
      return;
    }
    const data = buildData();
    if (!data) {
      console.warn('[pip] Chưa có chunk đang phát để hiển thị.');
      return;
    }
    try {
      await pipService.enter(data, {
        onLeave: () => {
          active.value = false;
        },
      });
      active.value = true;
    } catch (err) {
      console.warn('[pip] enter thất bại:', err);
      active.value = false;
    }
  }

  onBeforeUnmount(() => {
    stopWatch();
  });

  return { supported, active, toggle };
}
