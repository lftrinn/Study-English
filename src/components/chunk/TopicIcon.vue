<script setup lang="ts">
/**
 * Topic-specific geometric icons matching the design handoff (variant B
 * duotone). Each topic gets a unique abstract glyph so the set reads as
 * one family instead of a stock-icon mix.
 *
 *   standup    → stacked agenda lines (yesterday/today/blockers)
 *   tickets    → kanban card with folded corner + status dot
 *   api        → two arcs forming a request/response cycle
 *   bugs       → scanning frame with detected spot
 *   interview  → minimalist avatar
 *   client     → two overlapping dialogue circles
 *   angular    → refined `</>` slash
 *   healthcare → vitals monitor frame with pulse
 *   toeic      → ascending score bars
 *   javascript → "JS" mono square
 *   typescript → "TS" mono square
 *   profile    → person card with badge
 */

type TopicKey =
  | 'standup'
  | 'tickets'
  | 'api'
  | 'bugs'
  | 'interview'
  | 'client'
  | 'angular'
  | 'healthcare'
  | 'toeic'
  | 'javascript'
  | 'typescript'
  | 'profile';

defineProps<{
  name: TopicKey | string;
  size?: number | string;
  strokeWidth?: number;
}>();
</script>

<template>
  <svg
    :width="size ?? 22"
    :height="size ?? 22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth ?? 1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'standup'">
      <rect x="4" y="6" width="16" height="2.4" rx="1.2" fill="currentColor" fill-opacity="0.22" stroke="none" />
      <rect x="4" y="10.8" width="11" height="2.4" rx="1.2" fill="currentColor" fill-opacity="0.42" stroke="none" />
      <rect x="4" y="15.6" width="8" height="2.4" rx="1.2" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'tickets'">
      <path
        d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M16 4v3h3" />
      <circle cx="8" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'api'">
      <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.1" stroke="none" />
      <path d="M4 12a8 8 0 0 1 13.5-5.8" />
      <path d="M17 3.2v3.2h-3.2" />
      <path d="M20 12a8 8 0 0 1-13.5 5.8" />
      <path d="M7 20.8v-3.2h3.2" />
    </template>

    <template v-else-if="name === 'bugs'">
      <rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M4 12h16" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'interview'">
      <circle cx="12" cy="8" r="3.5" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M5 20a7 7 0 0 1 14 0" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <circle cx="18.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'client'">
      <circle cx="9" cy="12" r="5.5" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <circle cx="15" cy="12" r="5.5" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </template>

    <template v-else-if="name === 'angular'">
      <path d="M9 6 4 12l5 6" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M15 6 20 12l-5 6" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M9 6 4 12l5 6" />
      <path d="M15 6 20 12l-5 6" />
      <path d="M14 4l-4 16" />
    </template>

    <template v-else-if="name === 'healthcare'">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M6.5 12h2.3l1.5-3 3 6 1.4-3H17.5" />
    </template>

    <template v-else-if="name === 'toeic'">
      <rect x="4" y="14" width="3.6" height="6" rx="1" fill="currentColor" fill-opacity="0.3" stroke="none" />
      <rect x="10" y="10" width="3.6" height="10" rx="1" fill="currentColor" fill-opacity="0.55" stroke="none" />
      <rect x="16" y="6" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'javascript'">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <text
        x="12"
        y="16.5"
        font-family="JetBrains Mono, monospace"
        font-size="9"
        font-weight="800"
        text-anchor="middle"
        fill="currentColor"
        stroke="none"
        letter-spacing="-0.04em"
      >JS</text>
    </template>

    <template v-else-if="name === 'typescript'">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <text
        x="12"
        y="16.5"
        font-family="JetBrains Mono, monospace"
        font-size="9"
        font-weight="800"
        text-anchor="middle"
        fill="currentColor"
        stroke="none"
        letter-spacing="-0.04em"
      >TS</text>
    </template>

    <template v-else-if="name === 'profile'">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="11" r="2" fill="currentColor" stroke="none" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0" stroke-linecap="round" />
      <path d="M14 9h4M14 12.5h3" />
    </template>

    <!-- Fallback — small dot if topic unknown -->
    <template v-else>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
