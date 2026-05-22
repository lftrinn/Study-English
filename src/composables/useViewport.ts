import { readonly, ref } from 'vue';

const DESKTOP_MIN = 1180;

const width = ref<number>(typeof window === 'undefined' ? 1440 : window.innerWidth);
const isDesktop = ref<boolean>(width.value >= DESKTOP_MIN);

if (typeof window !== 'undefined') {
  const update = () => {
    width.value = window.innerWidth;
    isDesktop.value = window.innerWidth >= DESKTOP_MIN;
  };
  window.addEventListener('resize', update, { passive: true });
  // Initial paint may have stale innerWidth on some browsers; force a refresh.
  queueMicrotask(update);
}

export function useViewport() {
  return { width: readonly(width), isDesktop: readonly(isDesktop) };
}
