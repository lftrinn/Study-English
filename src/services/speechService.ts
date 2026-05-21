import type { SpeakOptions, SpeechSupport } from '@/types/speech';

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (!isSupported()) return Promise.resolve([]);
  if (cachedVoices && cachedVoices.length > 0) return Promise.resolve(cachedVoices);
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const initial = synth.getVoices();
    if (initial.length > 0) {
      cachedVoices = initial;
      resolve(initial);
      return;
    }
    const handler = () => {
      const list = synth.getVoices();
      if (list.length > 0) {
        cachedVoices = list;
        synth.removeEventListener('voiceschanged', handler);
        resolve(list);
      }
    };
    synth.addEventListener('voiceschanged', handler);
    // Fallback timeout in case the event never fires.
    setTimeout(() => {
      const list = synth.getVoices();
      if (list.length > 0 && !cachedVoices) {
        cachedVoices = list;
        synth.removeEventListener('voiceschanged', handler);
        resolve(list);
      } else if (!cachedVoices) {
        synth.removeEventListener('voiceschanged', handler);
        resolve([]);
      }
    }, 1500);
  });

  return voicesReadyPromise;
}

function getVoicesSync(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  if (cachedVoices && cachedVoices.length > 0) return cachedVoices;
  const list = window.speechSynthesis.getVoices();
  if (list.length > 0) cachedVoices = list;
  return cachedVoices ?? [];
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  return getVoicesSync().filter((v) => v.lang?.toLowerCase().startsWith('en'));
}

function findVoice(name?: string): SpeechSynthesisVoice | undefined {
  const list = getVoicesSync();
  if (name) {
    const v = list.find((x) => x.name === name);
    if (v) return v;
  }
  const en = getEnglishVoices();
  if (en.length === 0) return undefined;
  const defaultVoice = en.find((v) => v.default);
  return defaultVoice ?? en[0];
}

function speak(options: SpeakOptions): Promise<void> {
  if (!isSupported()) {
    return Promise.reject(new Error('SpeechSynthesis is not supported in this browser.'));
  }
  const synth = window.speechSynthesis;

  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(options.text);
    const voice = findVoice(options.voiceName);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-US';
    }
    u.rate = options.rate ?? 1;
    u.pitch = options.pitch ?? 1;
    u.volume = options.volume ?? 1;

    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (options.trailingGapMs && options.trailingGapMs > 0) {
        const gapTimer = window.setTimeout(() => {
          window.clearTimeout(gapTimer);
          resolve();
        }, options.trailingGapMs);
        if (options.signal) {
          options.signal.addEventListener(
            'abort',
            () => {
              window.clearTimeout(gapTimer);
              resolve();
            },
            { once: true },
          );
        }
      } else {
        resolve();
      }
    };

    u.onend = finish;
    u.onerror = (event) => {
      if (settled) return;
      settled = true;
      // 'canceled' / 'interrupted' are expected when user moves to next chunk.
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve();
      } else {
        reject(new Error(event.error || 'speech error'));
      }
    };

    if (options.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          synth.cancel();
        },
        { once: true },
      );
    }

    synth.speak(u);
  });
}

function pause() {
  if (!isSupported()) return;
  window.speechSynthesis.pause();
}

function resume() {
  if (!isSupported()) return;
  window.speechSynthesis.resume();
}

function cancel() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
}

function support(): SpeechSupport {
  const synthesis = isSupported();
  const recognition =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window ||
      'webkitSpeechRecognition' in (window as unknown as Record<string, unknown>));
  return { synthesis, recognition };
}

export const speechService = {
  ensureVoicesLoaded,
  getVoices: getVoicesSync,
  getEnglishVoices,
  findVoice,
  speak,
  pause,
  resume,
  cancel,
  support,
};
