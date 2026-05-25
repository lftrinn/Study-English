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
    path: '/practice',
    name: 'practice',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Practice', tab: 'practice' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Settings', tab: 'settings' },
  },
  {
    path: '/study/passive',
    name: 'passive',
    component: () => import('@/views/PassiveView.vue'),
    meta: { title: 'Passive Lab', tab: null, hideChrome: true },
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
  {
    path: '/toeic',
    name: 'toeic-hub',
    component: () => import('@/views/toeic/ToeicHubView.vue'),
    meta: { title: 'TOEIC', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/part',
    name: 'toeic-part',
    component: () => import('@/views/toeic/ToeicPartPracticeView.vue'),
    meta: { title: 'TOEIC · Part', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/skill',
    name: 'toeic-skill',
    component: () => import('@/views/toeic/ToeicSkillPracticeView.vue'),
    meta: { title: 'TOEIC · Skill', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/mini',
    name: 'toeic-mini',
    component: () => import('@/views/toeic/ToeicMiniTestView.vue'),
    meta: { title: 'TOEIC · Mini Test', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/exam',
    name: 'toeic-exam',
    component: () => import('@/views/toeic/ToeicExamView.vue'),
    meta: { title: 'TOEIC · Exam', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/mistakes',
    name: 'toeic-mistakes',
    component: () => import('@/views/toeic/ToeicMistakesView.vue'),
    meta: { title: 'TOEIC · Mistakes', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/bank',
    name: 'toeic-bank',
    component: () => import('@/views/toeic/ToeicChunkBankView.vue'),
    meta: { title: 'TOEIC · Chunk Bank', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/progress',
    name: 'toeic-progress',
    component: () => import('@/views/toeic/ToeicProgressView.vue'),
    meta: { title: 'TOEIC · Progress', tab: null, hideChrome: true },
  },
  {
    path: '/toeic/content',
    name: 'toeic-content',
    component: () => import('@/views/toeic/ToeicContentView.vue'),
    meta: { title: 'TOEIC · Nội dung', tab: null, hideChrome: true },
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
