/**
 * iOS PWA cannot run Web Speech API in the background by itself — Safari
 * suspends the page once it becomes hidden. The workaround used here:
 *
 *   1. Play a silent audio loop through an HTMLAudioElement. That registers
 *      an active "audio session" with the system, which on Android Chrome
 *      reliably keeps the page alive in the background and on iOS PWA *may*
 *      buy us extra runtime (not guaranteed; iOS can still suspend TTS).
 *   2. Wire up the Media Session API so the OS lock screen / notification
 *      shade shows real controls (play / pause / next / prev) and live
 *      metadata for the currently spoken chunk.
 *
 * The silent WAV is generated in-memory so we don't ship a binary asset.
 */

export type MediaSessionActions = {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export type ChunkMetadata = {
  title: string;
  artist?: string;
  album?: string;
};

let silentAudio: HTMLAudioElement | null = null;
let silentAudioUrl: string | null = null;
let actionsBound = false;

function buildSilentWavUrl(): string {
  // 1s of silence at 8kHz mono 16-bit = small enough to hold in memory and
  // long enough that `loop` doesn't churn through start events too fast.
  const sampleRate = 8000;
  const durationSec = 1;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);
  // PCM samples are already zero -> silent.

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function ensureSilentAudio(): HTMLAudioElement {
  if (silentAudio) return silentAudio;
  silentAudioUrl = buildSilentWavUrl();
  const el = new Audio(silentAudioUrl);
  el.loop = true;
  el.preload = 'auto';
  // Important on iOS: not muted — a muted track doesn't grant a real audio
  // session. Volume 0 still counts as "playing audio".
  el.volume = 0;
  silentAudio = el;
  return el;
}

function bindMediaSessionActions(actions: MediaSessionActions) {
  if (actionsBound) return;
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const safe = (fn: () => void) => () => {
    try {
      fn();
    } catch {
      /* swallow */
    }
  };
  try {
    ms.setActionHandler('play', safe(actions.onPlay));
    ms.setActionHandler('pause', safe(actions.onPause));
    ms.setActionHandler('previoustrack', safe(actions.onPrev));
    ms.setActionHandler('nexttrack', safe(actions.onNext));
  } catch {
    /* not all browsers support every action */
  }
  actionsBound = true;
}

async function start(actions: MediaSessionActions): Promise<void> {
  const el = ensureSilentAudio();
  bindMediaSessionActions(actions);
  if (el.paused) {
    try {
      await el.play();
    } catch {
      // Autoplay was blocked — caller must invoke start() from a user gesture.
    }
  }
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
  }
}

function setPlaybackState(state: 'playing' | 'paused' | 'none') {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
  if (!silentAudio) return;
  if (state === 'paused') {
    silentAudio.pause();
  } else if (state === 'playing') {
    void silentAudio.play().catch(() => {
      /* ignore */
    });
  } else if (state === 'none') {
    silentAudio.pause();
    silentAudio.currentTime = 0;
  }
}

function updateMetadata(meta: ChunkMetadata | null) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (!meta) {
    navigator.mediaSession.metadata = null;
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist ?? 'Chunk Listening Lab',
    album: meta.album ?? '',
  });
}

function stop() {
  if (silentAudio) {
    silentAudio.pause();
    silentAudio.currentTime = 0;
  }
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  }
}

function teardown() {
  stop();
  if (silentAudio) {
    silentAudio.src = '';
    silentAudio = null;
  }
  if (silentAudioUrl) {
    URL.revokeObjectURL(silentAudioUrl);
    silentAudioUrl = null;
  }
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && actionsBound) {
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
    } catch {
      /* ignore */
    }
    actionsBound = false;
  }
}

export const backgroundAudioService = {
  start,
  stop,
  teardown,
  setPlaybackState,
  updateMetadata,
};
