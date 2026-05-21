<script setup lang="ts">
/**
 * Custom icon set — duotone construction matching the design handoff.
 * Every line-style icon has a tinted background fill (16% currentColor)
 * plus a 1.75px stroke. Action icons (check / x / plus / minus) use a
 * 2.2px stroke. Playback + indicator icons (Play / Pause / Stop / Prev /
 * Next / StarFill / Bolt / More) are solid silhouettes.
 *
 * Names are kebab-case for backwards compatibility with existing call
 * sites. All icons share a 24×24 viewBox.
 */

type IconName =
  | 'home'
  | 'library'
  | 'play'
  | 'play-outline'
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
  | 'x'
  | 'check'
  | 'plus'
  | 'minus'
  | 'star'
  | 'star-filled'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'volume'
  | 'speaker'
  | 'voice'
  | 'mic'
  | 'headphones'
  | 'ear'
  | 'flashcard'
  | 'cards'
  | 'brain'
  | 'pencil'
  | 'edit'
  | 'sparkles'
  | 'sparkle'
  | 'flame'
  | 'clock'
  | 'trophy'
  | 'target'
  | 'list'
  | 'queue'
  | 'grid'
  | 'message'
  | 'puzzle'
  | 'tag'
  | 'eye'
  | 'eye-off'
  | 'wave'
  | 'globe'
  | 'calendar'
  | 'refresh'
  | 'sun'
  | 'moon'
  | 'download'
  | 'upload'
  | 'trash'
  | 'lightning'
  | 'bolt'
  | 'more'
  | 'gauge'
  | 'settings'
  | 'circle';

const props = defineProps<{
  name: IconName;
  size?: number | string;
  stroke?: number;
}>();

const sizeVal = () => (typeof props.size === 'number' ? `${props.size}` : (props.size ?? '22'));
const defaultStroke = () => props.stroke ?? 1.75;

const SOLID_ICONS: ReadonlyArray<IconName> = [
  'play',
  'pause',
  'stop',
  'next',
  'prev',
  'star-filled',
  'bolt',
  'lightning',
  'more',
];

const isSolid = () => SOLID_ICONS.includes(props.name);

const ACTION_ICONS: ReadonlyArray<IconName> = ['check', 'x', 'close', 'plus', 'minus'];
const actionStroke = () => (ACTION_ICONS.includes(props.name) ? 2.2 : defaultStroke());

const chevronStroke = () =>
  ['chevron-left', 'chevron-right', 'chevron-up', 'chevron-down'].includes(props.name)
    ? 2
    : actionStroke();
</script>

<template>
  <svg
    :width="sizeVal()"
    :height="sizeVal()"
    viewBox="0 0 24 24"
    :fill="isSolid() ? 'currentColor' : 'none'"
    :stroke="isSolid() ? 'none' : 'currentColor'"
    :stroke-width="chevronStroke()"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Navigation -->
    <template v-if="name === 'home'">
      <path
        d="M3.4 11.4 12 4.2l8.6 7.2V20a1.5 1.5 0 0 1-1.5 1.5h-3.6v-6.2a1.4 1.4 0 0 0-1.4-1.4h-3.2a1.4 1.4 0 0 0-1.4 1.4v6.2H4.9A1.5 1.5 0 0 1 3.4 20v-8.6z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path
        d="M3.4 11.4 12 4.2l8.6 7.2V20a1.5 1.5 0 0 1-1.5 1.5h-3.6v-6.2a1.4 1.4 0 0 0-1.4-1.4h-3.2a1.4 1.4 0 0 0-1.4 1.4v6.2H4.9A1.5 1.5 0 0 1 3.4 20v-8.6z"
      />
    </template>
    <template v-else-if="name === 'library'">
      <rect x="4" y="4" width="5" height="16" rx="1.5" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <rect x="11" y="4" width="5" height="16" rx="1.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <rect x="4" y="4" width="5" height="16" rx="1.5" />
      <rect x="11" y="4" width="5" height="16" rx="1.5" />
      <path d="m18 5.8 1.7-.35 2.4 13.2-1.7.35-.5-2.5" />
      <path d="M5.4 7.5h2.2M5.4 16.5h2.2M12.4 7.5h2.2M12.4 16.5h2.2" />
    </template>

    <!-- Playback solid -->
    <template v-else-if="name === 'play'">
      <path d="M8 5.7a1.3 1.3 0 0 1 1.97-1.11l9.7 6.3a1.3 1.3 0 0 1 0 2.22l-9.7 6.3A1.3 1.3 0 0 1 8 18.3V5.7z" />
    </template>
    <template v-else-if="name === 'play-outline'">
      <path
        d="M8 5.7a1.3 1.3 0 0 1 1.97-1.11l9.7 6.3a1.3 1.3 0 0 1 0 2.22l-9.7 6.3A1.3 1.3 0 0 1 8 18.3V5.7z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M8 5.7a1.3 1.3 0 0 1 1.97-1.11l9.7 6.3a1.3 1.3 0 0 1 0 2.22l-9.7 6.3A1.3 1.3 0 0 1 8 18.3V5.7z" stroke="currentColor" fill="none" />
    </template>
    <template v-else-if="name === 'pause'">
      <rect x="6.5" y="5" width="4" height="14" rx="1.4" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.4" />
    </template>
    <template v-else-if="name === 'stop'">
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </template>
    <template v-else-if="name === 'prev'">
      <rect x="5" y="5" width="2.4" height="14" rx="1" />
      <path d="M19.5 6.3v11.4a.9.9 0 0 1-1.4.74l-8.43-5.7a.9.9 0 0 1 0-1.48l8.43-5.7a.9.9 0 0 1 1.4.74z" />
    </template>
    <template v-else-if="name === 'next'">
      <path d="M4.5 6.3v11.4a.9.9 0 0 0 1.4.74l8.43-5.7a.9.9 0 0 0 0-1.48L5.9 5.56a.9.9 0 0 0-1.4.74z" />
      <rect x="16.6" y="5" width="2.4" height="14" rx="1" />
    </template>

    <!-- Mix / repeat (strokes) -->
    <template v-else-if="name === 'shuffle'">
      <path d="M17 4h4v4" />
      <path d="M21 4 13.5 11.5" />
      <path d="M3 6h2.5a3 3 0 0 1 2.4 1.2L9 8.6" />
      <path d="M17 20h4v-4" />
      <path d="M21 20 13.5 12.5" />
      <path d="M3 18h2.5a3 3 0 0 0 2.4-1.2L15 9" />
    </template>
    <template v-else-if="name === 'repeat'">
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6H17l-2-2" />
      <path d="M15 4l2 2-2 2" />
      <path d="M20 14.5A3.5 3.5 0 0 1 16.5 18H7l2 2" />
      <path d="M9 20l-2-2 2-2" />
    </template>
    <template v-else-if="name === 'repeat-one'">
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6H17l-2-2" />
      <path d="M15 4l2 2-2 2" />
      <path d="M20 14.5A3.5 3.5 0 0 1 16.5 18H7l2 2" />
      <path d="M9 20l-2-2 2-2" />
      <text
        x="9.5"
        y="15.5"
        font-size="7"
        font-weight="700"
        fill="currentColor"
        stroke="none"
      >1</text>
    </template>

    <!-- Search / Filter -->
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M3.5 5h17l-6.5 7.5V20l-4-2v-5.5L3.5 5z" fill="currentColor" fill-opacity="0.15" stroke="none" />
      <path d="M3.5 5h17l-6.5 7.5V20l-4-2v-5.5L3.5 5z" />
    </template>

    <!-- Action -->
    <template v-else-if="name === 'check'">
      <path d="m4.5 12.5 4.5 4.5 10.5-10.5" />
    </template>
    <template v-else-if="name === 'close' || name === 'x'">
      <path d="M18 6 6 18M6 6l12 12" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M5 12h14" />
    </template>

    <!-- Star -->
    <template v-else-if="name === 'star'">
      <path
        d="M12 3.4 14.5 8.6l5.7.8-4.1 4 1 5.6L12 16.4 6.9 19l1-5.6-4.1-4 5.7-.8L12 3.4z"
        fill="currentColor"
        fill-opacity="0.18"
        stroke="none"
      />
      <path d="M12 3.4 14.5 8.6l5.7.8-4.1 4 1 5.6L12 16.4 6.9 19l1-5.6-4.1-4 5.7-.8L12 3.4z" />
    </template>
    <template v-else-if="name === 'star-filled'">
      <path d="M12 3.4 14.5 8.6l5.7.8-4.1 4 1 5.6L12 16.4 6.9 19l1-5.6-4.1-4 5.7-.8L12 3.4z" />
    </template>

    <!-- Chevrons -->
    <template v-else-if="name === 'chevron-left'">
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="M5.5 14.5 12 8l6.5 6.5" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="M5.5 9.5 12 16l6.5-6.5" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M4.5 12h15M13 5.5 19.5 12 13 18.5" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M19.5 12H4.5M11 5.5 4.5 12 11 18.5" />
    </template>
    <template v-else-if="name === 'arrow-up'">
      <path d="M12 19.5V4.5M5.5 11 12 4.5 18.5 11" />
    </template>
    <template v-else-if="name === 'arrow-down'">
      <path d="M12 4.5v15M5.5 13 12 19.5 18.5 13" />
    </template>

    <!-- Volume / Audio -->
    <template v-else-if="name === 'volume' || name === 'speaker' || name === 'voice'">
      <path d="M3 9.5h3.2L11 5.6v12.8L6.2 14.5H3v-5z" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M3 9.5h3.2L11 5.6v12.8L6.2 14.5H3v-5z" />
      <path d="M15.5 8.6a4.5 4.5 0 0 1 0 6.8" />
      <path d="M18.5 5.6a8 8 0 0 1 0 12.8" />
    </template>
    <template v-else-if="name === 'mic'">
      <rect x="9.2" y="2" width="5.6" height="12" rx="2.8" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="9.2" y="2" width="5.6" height="12" rx="2.8" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </template>
    <template v-else-if="name === 'headphones' || name === 'ear'">
      <path d="M4 13a8 8 0 0 1 16 0" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v5.5A1.5 1.5 0 0 0 5.5 20h2v-7H4z" fill="currentColor" fill-opacity="0.2" />
      <path d="M20 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-2v-7H20z" fill="currentColor" fill-opacity="0.2" />
    </template>

    <!-- Practice modes -->
    <template v-else-if="name === 'flashcard' || name === 'cards'">
      <rect x="4" y="7.5" width="13" height="13.5" rx="2" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="4" y="7.5" width="13" height="13.5" rx="2" />
      <path d="M8 3.5h10a2 2 0 0 1 2 2v11" />
    </template>
    <template v-else-if="name === 'brain'">
      <path
        d="M12 4a3 3 0 0 0-3 3v10a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z"
        fill="currentColor"
        fill-opacity="0.14"
        stroke="none"
      />
      <path d="M12 5.5a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0-2.3 3.5 2.5 2.5 0 0 0 0 4 2.5 2.5 0 0 0 2.3 3.5 2.5 2.5 0 0 0 4.6 0 2.5 2.5 0 0 0 2.4-3.5 2.5 2.5 0 0 0 0-4A2.5 2.5 0 0 0 14.5 8 2.5 2.5 0 0 0 12 5.5z" />
      <path d="M12 5.5v13" />
    </template>
    <template v-else-if="name === 'pencil' || name === 'edit'">
      <path d="M14 5 19 10 9.5 19.5 4 21l1.5-5.5L14 5z" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <path d="M14 5 19 10" />
      <path d="M14 5 4 15l-1 5 5-1L19 9c1.4-1.4 1.4-2.7 0-4-1.3-1.4-2.7-1.4-5 0z" />
    </template>

    <!-- Motivation -->
    <template v-else-if="name === 'flame'">
      <path
        d="M12 3c-1 2.2 1 4 0 6-1 1.7-3.5 1.8-4.5 4-1.2 2.7 0 6 4.5 7 4.5-1 5.7-4.3 4.5-7C15.5 11 13 10.7 12 9c-1-1.7 0-3.5 0-6z"
        fill="currentColor"
        fill-opacity="0.18"
        stroke="none"
      />
      <path d="M12 3c-1 2.2 1 4 0 6-1 1.7-3.5 1.8-4.5 4-1.2 2.7 0 6 4.5 7 4.5-1 5.7-4.3 4.5-7C15.5 11 13 10.7 12 9c-1-1.7 0-3.5 0-6z" />
      <path d="M12 14c-.7 1-1.7 1.3-2 2.5-.3 1.2.8 2.5 2 2.5" />
    </template>
    <template v-else-if="name === 'trophy'">
      <path d="M7 4.5h10v5.5a5 5 0 0 1-10 0V4.5z" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M7 4.5h10v5.5a5 5 0 0 1-10 0V4.5z" />
      <path d="M7 6.5H4a1 1 0 0 0-1 1v1.5a3 3 0 0 0 3 3h1" />
      <path d="M17 6.5h3a1 1 0 0 1 1 1v1.5a3 3 0 0 1-3 3h-1" />
      <path d="M12 15v3.5M8.5 21.5h7M9.5 18.5h5l-.5 3h-4l-.5-3z" />
    </template>
    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.1" stroke="none" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'sparkles' || name === 'sparkle'">
      <path
        d="M12 3 13.5 9 19.5 10.5 13.5 12 12 18 10.5 12 4.5 10.5 10.5 9 12 3z"
        fill="currentColor"
        fill-opacity="0.18"
        stroke="none"
      />
      <path d="M12 3 13.5 9 19.5 10.5 13.5 12 12 18 10.5 12 4.5 10.5 10.5 9 12 3z" />
      <path d="M19 4 19.5 5.5 21 6 19.5 6.5 19 8 18.5 6.5 17 6 18.5 5.5 19 4z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'bolt' || name === 'lightning'">
      <path d="M13.5 2 5 13.6a.7.7 0 0 0 .56 1.1H10l-1.5 7.3a.7.7 0 0 0 1.27.55L18.5 10.4a.7.7 0 0 0-.56-1.1H13.5L15 3a.7.7 0 0 0-1.5-1z" />
    </template>

    <!-- Wave / Eye -->
    <template v-else-if="name === 'wave'">
      <path d="M3 12h1.5" />
      <path d="M6.5 7v10" />
      <path d="M9.5 4v16" />
      <path d="M12.5 6v12" />
      <path d="M15.5 9v6" />
      <path d="M18.5 4v16" />
      <path d="M21.5 12H20" />
    </template>
    <template v-else-if="name === 'eye'">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'eye-off'">
      <path d="M3.5 8.5C2.7 9.7 2 11 2 12c0 0 3.5 7 9.5 7 1.5 0 2.9-.4 4.1-1" />
      <path d="M9.6 5.3c.8-.2 1.6-.3 2.4-.3 6 0 9.5 7 9.5 7-.5 1-1.2 2.1-2 3.1" />
      <path d="M9.8 9.8a3 3 0 0 0 4.4 4.4" />
      <path d="M2.5 2.5 21.5 21.5" />
    </template>

    <!-- Layout / list -->
    <template v-else-if="name === 'list' || name === 'queue'">
      <path d="M3 6h.01M3 12h.01M3 18h.01" stroke-width="2.6" />
      <path d="M8 6h13M8 12h13M8 18h13" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3" y="4" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" />
    </template>

    <!-- Misc -->
    <template v-else-if="name === 'message'">
      <path
        d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4.5A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1.5-1.5z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4.5A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1.5-1.5z" />
    </template>
    <template v-else-if="name === 'puzzle'">
      <path
        d="M9 3.5A1.5 1.5 0 0 1 10.5 5v1.5h3V5A1.5 1.5 0 0 1 16.5 5v1.5H18a1.5 1.5 0 0 1 1.5 1.5v3H18A1.5 1.5 0 0 0 18 14h1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3v-1.5A1.5 1.5 0 0 0 12 17a1.5 1.5 0 0 0-3 0v1.5H6A1.5 1.5 0 0 1 4.5 17v-3H6A1.5 1.5 0 0 0 6 11H4.5V8A1.5 1.5 0 0 1 6 6.5h1.5V5A1.5 1.5 0 0 1 9 3.5z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M9 3.5A1.5 1.5 0 0 1 10.5 5v1.5h3V5A1.5 1.5 0 0 1 16.5 5v1.5H18a1.5 1.5 0 0 1 1.5 1.5v3H18A1.5 1.5 0 0 0 18 14h1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3v-1.5A1.5 1.5 0 0 0 12 17a1.5 1.5 0 0 0-3 0v1.5H6A1.5 1.5 0 0 1 4.5 17v-3H6A1.5 1.5 0 0 0 6 11H4.5V8A1.5 1.5 0 0 1 6 6.5h1.5V5A1.5 1.5 0 0 1 9 3.5z" />
    </template>
    <template v-else-if="name === 'tag'">
      <path
        d="M20.5 11.5 13 19a1.7 1.7 0 0 1-2.4 0L3.5 11.9V4.5h7.4l9.6 7z"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M20.5 11.5 13 19a1.7 1.7 0 0 1-2.4 0L3.5 11.9V4.5h7.4l9.6 7z" />
      <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </template>

    <!-- State -->
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2.2" stroke-width="2" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3.5" y="5" width="17" height="16" rx="2" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5C8 7 8 17 12 20.5" />
      <path d="M12 3.5c4 3.5 4 13.5 0 17" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6L21 8.5" />
      <path d="M21 3.5V8.5h-5" />
      <path d="M20.5 12A8.5 8.5 0 0 1 6 18L3 15.5" />
      <path d="M3 20.5v-5h5" />
    </template>

    <!-- Theme -->
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2v2M12 20v2M4.5 4.5l1.5 1.5M18 18l1.5 1.5M2 12h2M20 12h2M4.5 19.5 6 18M18 6l1.5-1.5"
        stroke-width="2"
      />
    </template>
    <template v-else-if="name === 'moon'">
      <path
        d="M20.5 13.5A9 9 0 0 1 10.5 3.5 7.5 7.5 0 1 0 20.5 13.5z"
        fill="currentColor"
        fill-opacity="0.18"
        stroke="none"
      />
      <path d="M20.5 13.5A9 9 0 0 1 10.5 3.5 7.5 7.5 0 1 0 20.5 13.5z" />
    </template>

    <!-- Data -->
    <template v-else-if="name === 'download'">
      <path d="M4 15.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <path d="M4 15.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
      <path d="M12 3.5v11M7 10l5 5 5-5" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M4 15.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <path d="M4 15.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
      <path d="M12 20.5v-11M7 14l5-5 5 5" />
    </template>
    <template v-else-if="name === 'trash'">
      <path
        d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
        fill="currentColor"
        fill-opacity="0.16"
        stroke="none"
      />
      <path d="M4 7h16" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4h6v3" />
    </template>

    <!-- More -->
    <template v-else-if="name === 'more'">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </template>

    <!-- Settings (mixer slider) -->
    <template v-else-if="name === 'settings'">
      <rect x="4.5" y="7" width="3" height="4" rx="1" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <rect x="10.5" y="9" width="3" height="4" rx="1" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <rect x="16.5" y="10" width="3" height="4" rx="1" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <path d="M6 4v3M6 11v9M12 4v3M12 13v7M18 4v6M18 14v6" />
      <rect x="4.5" y="7" width="3" height="4" rx="1" />
      <rect x="10.5" y="9" width="3" height="4" rx="1" />
      <rect x="16.5" y="10" width="3" height="4" rx="1" />
    </template>

    <!-- Gauge -->
    <template v-else-if="name === 'gauge'">
      <path d="M3 14a9 9 0 0 1 18 0" fill="currentColor" fill-opacity="0.14" stroke="none" />
      <path d="M3 14a9 9 0 0 1 18 0" />
      <path d="M12 14l4-4" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </template>

    <!-- Generic circle (fallback) -->
    <template v-else-if="name === 'circle'">
      <circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <circle cx="12" cy="12" r="8" />
    </template>
  </svg>
</template>
