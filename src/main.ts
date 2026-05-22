import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router';

import './assets/styles/main.css';

window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && ['=', '+', '-', '_', '0'].includes(event.key)) {
    event.preventDefault();
  }
});

['gesturestart', 'gesturechange', 'gestureend'].forEach((name) => {
  document.addEventListener(name, (event) => event.preventDefault(), { passive: false });
});

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);

document.addEventListener(
  'touchmove',
  (event) => {
    if ((event as TouchEvent).touches.length > 1) event.preventDefault();
  },
  { passive: false },
);

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
