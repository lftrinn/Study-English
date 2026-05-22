/**
 * Picture-in-Picture for the listening lab.
 *
 * iOS Safari (and most browsers) only allow PiP for <video>, not arbitrary
 * HTML. To get the chunk text + phonetic + meaning into a floating window we
 * draw them on an offscreen <canvas>, capture the canvas as a MediaStream,
 * pipe it through a hidden <video>, and request PiP on that video.
 *
 * The canvas is redrawn on update() (when the chunk changes) and once per
 * second by a RAF-driven heartbeat — without that heartbeat, Safari's
 * captured stream tends to freeze after a few seconds.
 */

export type PipChunkData = {
  text: string;
  phonetic?: string;
  meaning?: string;
  topicColor?: string;
};

const WIDTH = 480;
const HEIGHT = 270;

let canvas: HTMLCanvasElement | null = null;
let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let rafId: number | null = null;
let lastDrawAt = 0;
let currentData: PipChunkData | null = null;
let leaveHandler: (() => void) | null = null;
let onLeaveCallback: (() => void) | null = null;

function ensureElements() {
  if (canvas && video) return;
  canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
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

  // Background gradient.
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

  // Accent bar.
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 4, HEIGHT);

  ctx.textAlign = 'center';

  // Main chunk text.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px -apple-system, system-ui, sans-serif';
  const textY = 60;
  const textHeight = drawText(ctx, currentData.text, WIDTH / 2, textY, WIDTH - 40, 32, 3);

  // Phonetic transcription.
  let cursor = textY + textHeight + 18;
  if (currentData.phonetic) {
    ctx.fillStyle = accent;
    ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillText(currentData.phonetic, WIDTH / 2, cursor);
    cursor += 28;
  }

  // Meaning.
  if (currentData.meaning) {
    ctx.fillStyle = '#A0A8C0';
    ctx.font = '400 15px -apple-system, system-ui, sans-serif';
    drawText(ctx, currentData.meaning, WIDTH / 2, cursor, WIDTH - 40, 20, 2);
  }
}

function heartbeat(now: number) {
  // Redraw at most ~1 fps to keep the captured stream from freezing on
  // Safari without burning CPU.
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
  if (typeof document === 'undefined') return false;
  if (!('pictureInPictureEnabled' in document)) return false;
  return Boolean(document.pictureInPictureEnabled);
}

function isActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.pictureInPictureElement === video && video !== null;
}

function handleLeave() {
  stopHeartbeat();
  if (onLeaveCallback) {
    try {
      onLeaveCallback();
    } catch {
      /* ignore */
    }
  }
}

async function enter(data: PipChunkData, opts?: { onLeave?: () => void }): Promise<void> {
  if (!isSupported()) throw new Error('Picture-in-Picture không được hỗ trợ trên trình duyệt này.');
  ensureElements();
  currentData = data;
  drawFrame();

  if (!stream) {
    // captureStream(0) means "frame-driven" (push on draw) — but Safari is
    // happier with a low fps. Pair with a 1fps heartbeat above.
    stream = canvas!.captureStream(1);
    video!.srcObject = stream;
  }

  onLeaveCallback = opts?.onLeave ?? null;

  if (!leaveHandler) {
    leaveHandler = handleLeave;
    video!.addEventListener('leavepictureinpicture', leaveHandler);
  }

  try {
    await video!.play();
  } catch {
    /* may throw on iOS if not called from a gesture — propagate */
  }
  startHeartbeat();
  await video!.requestPictureInPicture();
}

async function exit(): Promise<void> {
  if (typeof document !== 'undefined' && document.pictureInPictureElement) {
    try {
      await document.exitPictureInPicture();
    } catch {
      /* ignore */
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
