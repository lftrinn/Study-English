export type SpeakOptions = {
  text: string;
  voiceName?: string;
  /** 0.5–2.0 playback rate. */
  rate?: number;
  /** 0–2 pitch. */
  pitch?: number;
  /** 0–1 volume. */
  volume?: number;
  /** ms to wait after speech ends before resolving. */
  trailingGapMs?: number;
  signal?: AbortSignal;
};

export type VoiceInfo = {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
};

export type SpeechSupport = {
  synthesis: boolean;
  recognition: boolean;
};
