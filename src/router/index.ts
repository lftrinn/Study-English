import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Home', tab: 'home' },
  },
  {
    path: '/library',
    name: 'library',
    component: () => import('@/views/LibraryView.vue'),
    meta: { title: 'Library', tab: 'library' },
  },
  {
    path: '/player',
    name: 'player',
    component: () => import('@/views/PlayerView.vue'),
    meta: { title: 'Player', tab: 'player' },
  },
  {
    path: '/progress',
    name: 'progress',
    component: () => import('@/views/ProgressView.vue'),
    meta: { title: 'Progress', tab: 'progress' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Settings', tab: 'settings' },
  },
  {
    path: '/study/flashcard',
    name: 'flashcard',
    component: () => import('@/views/FlashcardView.vue'),
    meta: { title: 'Flashcards', tab: null, hideChrome: true },
  },
  {
    path: '/study/write',
    name: 'write',
    component: () => import('@/views/WriteView.vue'),
    meta: { title: 'Write', tab: null, hideChrome: true },
  },
  {
    path: '/study/dictation',
    name: 'dictation',
    component: () => import('@/views/DictationView.vue'),
    meta: { title: 'Dictation', tab: null, hideChrome: true },
  },
  {
    path: '/study/learn',
    name: 'learn',
    component: () => import('@/views/LearnView.vue'),
    meta: { title: 'Learn', tab: null, hideChrome: true },
  },
  {
    path: '/study/test',
    name: 'test',
    component: () => import('@/views/TestView.vue'),
    meta: { title: 'Test', tab: null, hideChrome: true },
  },
  {
    path: '/study/match',
    name: 'match',
    component: () => import('@/views/MatchView.vue'),
    meta: { title: 'Match', tab: null, hideChrome: true },
  },
  {
    path: '/study/speaking',
    name: 'speaking',
    component: () => import('@/views/SpeakingView.vue'),
    meta: { title: 'Speaking', tab: null, hideChrome: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { title: 'Welcome', tab: null, hideChrome: true },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
