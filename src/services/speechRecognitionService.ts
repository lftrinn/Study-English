/**
 * Thin wrapper around the Web Speech Recognition API.
 * Browser support is uneven (Chrome / Edge / Safari iOS-only) — always
 * call `isSupported()` first and provide fallback UI when false.
 */

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
  resultIndex: number;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type WindowWithRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithRecognition;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type RecognitionResult = {
  transcript: string;
  confidence: number;
};

export type RecognitionHandle = {
  abort: () => void;
};

export const speechRecognitionService = {
  isSupported(): boolean {
    return getCtor() !== null;
  },

  recognize(opts: {
    lang?: string;
    onStart?: () => void;
    onResult: (r: RecognitionResult) => void;
    onError?: (msg: string) => void;
    onEnd?: () => void;
  }): RecognitionHandle | null {
    const Ctor = getCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = opts.lang ?? 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      opts.onStart?.();
    };

    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const top = last?.[0];
      if (!top) return;
      opts.onResult({ transcript: top.transcript, confidence: top.confidence });
    };

    rec.onerror = (e) => {
      opts.onError?.(e.error || 'recognition error');
    };

    rec.onend = () => {
      opts.onEnd?.();
    };

    try {
      rec.start();
    } catch {
      opts.onError?.('start error');
    }

    return {
      abort: () => {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      },
    };
  },
};
