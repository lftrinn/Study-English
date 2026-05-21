<script setup lang="ts">
type IconName =
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'prev'
  | 'shuffle'
  | 'repeat'
  | 'repeat-one'
  | 'search'
  | 'filter'
  | 'close'
  | 'star'
  | 'star-filled'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'volume'
  | 'mic'
  | 'check'
  | 'x'
  | 'plus'
  | 'minus'
  | 'sparkles'
  | 'flame'
  | 'clock'
  | 'list'
  | 'flashcard'
  | 'pencil'
  | 'ear'
  | 'message'
  | 'puzzle'
  | 'trophy'
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'trash'
  | 'lightning'
  | 'arrow-right'
  | 'arrow-left'
  | 'queue'
  | 'voice'
  | 'gauge';

const props = defineProps<{
  name: IconName;
  size?: number | string;
  stroke?: number;
}>();

const sizeVal = () => (typeof props.size === 'number' ? `${props.size}` : (props.size ?? '20'));
const strokeWidth = () => props.stroke ?? 2;
</script>

<template>
  <svg
    :width="sizeVal()"
    :height="sizeVal()"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="name === 'play' || name === 'star-filled' ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth()"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'play'">
      <polygon points="6,4 20,12 6,20" fill="currentColor" />
    </template>
    <template v-else-if="name === 'pause'">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'stop'">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'next'">
      <polygon points="5,4 16,12 5,20" fill="currentColor" stroke="none" />
      <rect x="17" y="4" width="2.5" height="16" rx="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'prev'">
      <polygon points="19,4 8,12 19,20" fill="currentColor" stroke="none" />
      <rect x="4.5" y="4" width="2.5" height="16" rx="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'shuffle'">
      <path d="M16 3h5v5" />
      <path d="M4 20l17-17" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </template>
    <template v-else-if="name === 'repeat'">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </template>
    <template v-else-if="name === 'repeat-one'">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      <text x="9.5" y="15.5" font-size="7" font-weight="700" fill="currentColor" stroke="none">1</text>
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M3 4h18l-7 9v6l-4 2v-8z" />
    </template>
    <template v-else-if="name === 'close' || name === 'x'">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </template>
    <template v-else-if="name === 'star'">
      <polygon points="12,3 14.6,9 21,9.6 16,14 17.5,21 12,17.6 6.5,21 8,14 3,9.6 9.4,9" />
    </template>
    <template v-else-if="name === 'star-filled'">
      <polygon
        points="12,3 14.6,9 21,9.6 16,14 17.5,21 12,17.6 6.5,21 8,14 3,9.6 9.4,9"
        fill="currentColor"
      />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <polyline points="15,5 8,12 15,19" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <polyline points="9,5 16,12 9,19" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <polyline points="5,15 12,8 19,15" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <polyline points="5,9 12,16 19,9" />
    </template>
    <template v-else-if="name === 'volume'">
      <polygon points="4,9 8,9 13,5 13,19 8,15 4,15" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </template>
    <template v-else-if="name === 'mic'">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </template>
    <template v-else-if="name === 'check'">
      <polyline points="4,12 10,18 20,6" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M4 12h16" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
      <path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </template>
    <template v-else-if="name === 'flame'">
      <path d="M12 3s5 4 5 9a5 5 0 1 1-10 0c0-2 2-4 2-4s0 3 2 3 2-3 2-3 1 1 1-2-2-3-2-3z" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 16,14" />
    </template>
    <template v-else-if="name === 'list'">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </template>
    <template v-else-if="name === 'flashcard'">
      <rect x="3" y="6" width="14" height="14" rx="2" />
      <rect x="7" y="3" width="14" height="14" rx="2" />
    </template>
    <template v-else-if="name === 'pencil'">
      <path d="M4 20l4-1 11-11-3-3L5 16z" />
      <path d="M14 6l3 3" />
    </template>
    <template v-else-if="name === 'ear'">
      <path d="M6 11a6 6 0 0 1 12 0c0 5-4 5-4 8a3 3 0 0 1-6 0" />
      <path d="M9 11a3 3 0 0 1 6 0" />
    </template>
    <template v-else-if="name === 'message'">
      <path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-1.4 3.5A8 8 0 0 1 21 12z" />
    </template>
    <template v-else-if="name === 'puzzle'">
      <path
        d="M14 4a2 2 0 1 0-4 0v2H6v4a2 2 0 1 1 0 4v4h4v-2a2 2 0 1 1 4 0v2h4v-4a2 2 0 1 0 0-4V6h-4z"
      />
    </template>
    <template v-else-if="name === 'trophy'">
      <path d="M8 4h8v3a4 4 0 1 1-8 0z" />
      <path d="M6 5H3a3 3 0 0 0 3 5" />
      <path d="M18 5h3a3 3 0 0 1-3 5" />
      <path d="M10 14h4v3h-4z" />
      <path d="M7 21h10" />
      <path d="M12 17v4" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M5 5l1.5 1.5" />
      <path d="M17.5 17.5L19 19" />
      <path d="M5 19l1.5-1.5" />
      <path d="M17.5 6.5L19 5" />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M21 12.5A8 8 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 3v12" />
      <polyline points="6,10 12,16 18,10" />
      <path d="M4 20h16" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 21V9" />
      <polyline points="6,14 12,8 18,14" />
      <path d="M4 4h16" />
    </template>
    <template v-else-if="name === 'trash'">
      <polyline points="4,7 20,7" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4h6v3" />
    </template>
    <template v-else-if="name === 'lightning'">
      <polygon points="13,3 4,14 11,14 10,21 20,10 13,10" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14,6 20,12 14,18" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <line x1="20" y1="12" x2="4" y2="12" />
      <polyline points="10,6 4,12 10,18" />
    </template>
    <template v-else-if="name === 'queue'">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="12" y2="18" />
      <polygon points="16,14 22,18 16,22" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'voice'">
      <path d="M3 12c2 4 6 6 9 6s7-2 9-6" />
      <path d="M3 12c2-4 6-6 9-6s7 2 9 6" />
    </template>
    <template v-else-if="name === 'gauge'">
      <path d="M3 14a9 9 0 0 1 18 0" />
      <path d="M12 14l4-4" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>
