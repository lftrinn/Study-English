/**
 * Picture-in-Picture for the listening lab.
 *
 * Standard pattern: draw the chunk onto an offscreen <canvas>, expose it
 * through canvas.captureStream(), and request PiP on a hidden <video>.
 *
 * iOS Safari (including PWA standalone) doesn't always honour the standard
 * `requestPictureInPicture()` for canvas-sourced streams, so we also call
 * the legacy WebKit API `video.webkitSetPresentationMode('picture-in-picture')`
 * when it's available. Either path triggers the same OS-level floating
 * window.
 */

export type PipChunkData = {
  text: string;
  phonetic?: string;
  meaning?: string;
  topicColor?: string;
};

type IOSVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (
    mode: 'inline' | 'picture-in-picture' | 'fullscreen',
  ) => boolean;
  webkitSetPresentationMode?: (
    mode: 'inline' | 'picture-in-picture' | 'fullscreen',
  ) => void;
  webkitPresentationMode?: 'inline' | 'picture-in-picture' | 'fullscreen';
};

const WIDTH = 480;
const HEIGHT = 270;

let canvas: HTMLCanvasElement | null = null;
let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let rafId: number | null = null;
let lastDrawAt = 0;
let currentData: PipChunkData | null = null;
let listenersBound = false;
let onLeaveCallback: (() => void) | null = null;
let supportedCache: boolean | null = null;

function asIOS(v: HTMLVideoElement): IOSVideo {
  return v as IOSVideo;
}

function iosSupportsPip(v: HTMLVideoElement): boolean {
  const ios = asIOS(v);
  return (
    typeof ios.webkitSupportsPresentationMode === 'function' &&
    ios.webkitSupportsPresentationMode('picture-in-picture')
  );
}

function ensureElements() {
  if (canvas && video) return;
  canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.autoplay = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('muted', '');
  // Keep the element in the DOM but invisible — required for PiP request to
  // succeed in some browsers (Chrome will reject if the video isn't connected).
  v.style.position = 'fixed';
  v.style.right = '0';
  v.style.bottom = '0';
  v.style.width = '1px';
  v.style.height = '1px';
  v.style.opacity = '0';
  v.style.pointerEvents = 'none';
  document.body.appendChild(v);
  video = v;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
}

function drawFrame() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#0B0F22');
  bg.addColorStop(1, '#161A35');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (!currentData) {
    ctx.fillStyle = '#8E94A8';
    ctx.font = '500 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Không có chunk đang phát', WIDTH / 2, HEIGHT / 2);
    return;
  }

  const accent = currentData.topicColor ?? '#22D3EE';

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 4, HEIGHT);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px -apple-system, system-ui, sans-serif';
  const textY = 60;
  const textHeight = drawText(ctx, currentData.text, WIDTH / 2, textY, WIDTH - 40, 32, 3);

  let cursor = textY + textHeight + 18;
  if (currentData.phonetic) {
    ctx.fillStyle = accent;
    ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillText(currentData.phonetic, WIDTH / 2, cursor);
    cursor += 28;
  }

  if (currentData.meaning) {
    ctx.fillStyle = '#A0A8C0';
    ctx.font = '400 15px -apple-system, system-ui, sans-serif';
    drawText(ctx, currentData.meaning, WIDTH / 2, cursor, WIDTH - 40, 20, 2);
  }
}

function heartbeat(now: number) {
  if (now - lastDrawAt > 900) {
    drawFrame();
    lastDrawAt = now;
  }
  rafId = requestAnimationFrame(heartbeat);
}

function startHeartbeat() {
  if (rafId !== null) return;
  lastDrawAt = 0;
  rafId = requestAnimationFrame(heartbeat);
}

function stopHeartbeat() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function isSupported(): boolean {
  if (supportedCache !== null) return supportedCache;
  if (typeof document === 'undefined') return (supportedCache = false);
  const standard = 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
  if (standard) return (supportedCache = true);
  if (typeof HTMLVideoElement !== 'undefined') {
    const probe = document.createElement('video');
    if (iosSupportsPip(probe)) return (supportedCache = true);
  }
  return (supportedCache = false);
}

function isActive(): boolean {
  if (!video) return false;
  if (typeof document !== 'undefined' && document.pictureInPictureElement === video) return true;
  if (asIOS(video).webkitPresentationMode === 'picture-in-picture') return true;
  return false;
}

function handleLeave() {
  stopHeartbeat();
  const cb = onLeaveCallback;
  if (cb) {
    try {
      cb();
    } catch {
      /* ignore */
    }
  }
}

function bindLeaveListeners(v: HTMLVideoElement) {
  if (listenersBound) return;
  v.addEventListener('leavepictureinpicture', handleLeave);
  v.addEventListener('webkitpresentationmodechanged', () => {
    if (asIOS(v).webkitPresentationMode !== 'picture-in-picture') {
      handleLeave();
    }
  });
  listenersBound = true;
}

async function enter(data: PipChunkData, opts?: { onLeave?: () => void }): Promise<void> {
  if (!isSupported()) {
    throw new Error('Picture-in-Picture không được hỗ trợ trên trình duyệt này.');
  }
  ensureElements();
  if (!video || !canvas) throw new Error('PiP video/canvas khởi tạo thất bại.');

  currentData = data;
  drawFrame();

  if (!stream) {
    stream = canvas.captureStream(1);
    video.srcObject = stream;
  }

  onLeaveCallback = opts?.onLeave ?? null;
  bindLeaveListeners(video);

  // Fire play() but DON'T await — awaiting may break the user-gesture chain
  // and cause iOS to reject the subsequent PiP request. Errors (e.g.
  // autoplay blocked) are logged but don't stop the PiP attempt.
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err) => {
      console.warn('[pip] video.play() failed:', err);
    });
  }
  startHeartbeat();

  // iOS Safari (incl. PWA standalone) prefers the legacy WebKit API for
  // canvas-sourced streams. Try it first when available.
  if (iosSupportsPip(video)) {
    try {
      asIOS(video).webkitSetPresentationMode!('picture-in-picture');
      return;
    } catch (err) {
      console.warn('[pip] webkitSetPresentationMode failed, falling back:', err);
    }
  }

  if (typeof document === 'undefined' || !document.pictureInPictureEnabled) {
    throw new Error('Picture-in-Picture không khả dụng.');
  }
  await video.requestPictureInPicture();
}

async function exit(): Promise<void> {
  if (video) {
    if (
      iosSupportsPip(video) &&
      asIOS(video).webkitPresentationMode === 'picture-in-picture'
    ) {
      try {
        asIOS(video).webkitSetPresentationMode!('inline');
      } catch {
        /* ignore */
      }
    }
    if (typeof document !== 'undefined' && document.pictureInPictureElement === video) {
      try {
        await document.exitPictureInPicture();
      } catch {
        /* ignore */
      }
    }
  }
  stopHeartbeat();
  if (video) video.pause();
}

function update(data: PipChunkData) {
  currentData = data;
  drawFrame();
}

function clear() {
  currentData = null;
  drawFrame();
}

export const pipService = {
  isSupported,
  isActive,
  enter,
  exit,
  update,
  clear,
};
