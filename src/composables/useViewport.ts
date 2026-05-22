import { onBeforeUnmount, onMounted, readonly, ref } from 'vue';

const DESKTOP_MIN = 1180;

const width = ref<number>(typeof window === 'undefined' ? 1440 : window.innerWidth);
const isDesktop = ref<boolean>(typeof window === 'undefined' ? true : window.innerWidth >= DESKTOP_MIN);

let installed = 0;

function update() {
  const w = window.innerWidth;
  width.value = w;
  isDesktop.value = w >= DESKTOP_MIN;
}

export function useViewport() {
  onMounted(() => {
    installed += 1;
    if (installed === 1) {
      update();
      window.addEventListener('resize', update, { passive: true });
    }
  });
  onBeforeUnmount(() => {
    installed -= 1;
    if (installed === 0) window.removeEventListener('resize', update);
  });
  return { width: readonly(width), isDesktop: readonly(isDesktop) };
}
