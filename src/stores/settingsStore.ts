import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const LS_KEY = 'cll.settings.v1';

export type ThemeMode = 'dark' | 'light';
export type RepeatMode = 'none' | 'one' | 'all';

type PersistedSettings = {
  theme: ThemeMode;
  dailyGoal: number;
  level: 'A1' | 'A2' | 'B1';
  selectedTopics: string[];
  selectedVoiceName: string | null;
  mixVoice: boolean;
  defaultSpeed: number;
  defaultGap: number;
  defaultRepeatEach: number;
  defaultRepeatMode: RepeatMode;
  lastTopic: string | 'all';
  onboardingDone: boolean;
};

const DEFAULTS: PersistedSettings = {
  theme: 'dark',
  dailyGoal: 30,
  level: 'A2',
  selectedTopics: [],
  selectedVoiceName: null,
  mixVoice: false,
  defaultSpeed: 1,
  defaultGap: 600,
  defaultRepeatEach: 1,
  defaultRepeatMode: 'all',
  lastTopic: 'all',
  onboardingDone: false,
};

function loadFromLocalStorage(): PersistedSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveToLocalStorage(s: PersistedSettings) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeMode>(DEFAULTS.theme);
  const dailyGoal = ref<number>(DEFAULTS.dailyGoal);
  const level = ref<'A1' | 'A2' | 'B1'>(DEFAULTS.level);
  const selectedTopics = ref<string[]>([...DEFAULTS.selectedTopics]);
  const selectedVoiceName = ref<string | null>(DEFAULTS.selectedVoiceName);
  const mixVoice = ref<boolean>(DEFAULTS.mixVoice);
  const defaultSpeed = ref<number>(DEFAULTS.defaultSpeed);
  const defaultGap = ref<number>(DEFAULTS.defaultGap);
  const defaultRepeatEach = ref<number>(DEFAULTS.defaultRepeatEach);
  const defaultRepeatMode = ref<RepeatMode>(DEFAULTS.defaultRepeatMode);
  const lastTopic = ref<string | 'all'>(DEFAULTS.lastTopic);
  const onboardingDone = ref<boolean>(DEFAULTS.onboardingDone);

  const hydrated = ref(false);

  function snapshot(): PersistedSettings {
    return {
      theme: theme.value,
      dailyGoal: dailyGoal.value,
      level: level.value,
      selectedTopics: [...selectedTopics.value],
      selectedVoiceName: selectedVoiceName.value,
      mixVoice: mixVoice.value,
      defaultSpeed: defaultSpeed.value,
      defaultGap: defaultGap.value,
      defaultRepeatEach: defaultRepeatEach.value,
      defaultRepeatMode: defaultRepeatMode.value,
      lastTopic: lastTopic.value,
      onboardingDone: onboardingDone.value,
    };
  }

  function hydrate() {
    if (hydrated.value) return;
    const s = loadFromLocalStorage();
    theme.value = s.theme;
    dailyGoal.value = s.dailyGoal;
    level.value = s.level;
    selectedTopics.value = [...s.selectedTopics];
    selectedVoiceName.value = s.selectedVoiceName;
    mixVoice.value = s.mixVoice;
    defaultSpeed.value = s.defaultSpeed;
    defaultGap.value = s.defaultGap;
    defaultRepeatEach.value = s.defaultRepeatEach;
    defaultRepeatMode.value = s.defaultRepeatMode;
    lastTopic.value = s.lastTopic;
    onboardingDone.value = s.onboardingDone;
    hydrated.value = true;
  }

  function setTheme(t: ThemeMode) {
    theme.value = t;
  }
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }
  function completeOnboarding() {
    onboardingDone.value = true;
  }
  function resetAll() {
    Object.assign(snapshot(), DEFAULTS);
    theme.value = DEFAULTS.theme;
    dailyGoal.value = DEFAULTS.dailyGoal;
    level.value = DEFAULTS.level;
    selectedTopics.value = [...DEFAULTS.selectedTopics];
    selectedVoiceName.value = DEFAULTS.selectedVoiceName;
    mixVoice.value = DEFAULTS.mixVoice;
    defaultSpeed.value = DEFAULTS.defaultSpeed;
    defaultGap.value = DEFAULTS.defaultGap;
    defaultRepeatEach.value = DEFAULTS.defaultRepeatEach;
    defaultRepeatMode.value = DEFAULTS.defaultRepeatMode;
    lastTopic.value = DEFAULTS.lastTopic;
    onboardingDone.value = DEFAULTS.onboardingDone;
  }

  // Persist on any change after hydration.
  watch(
    [
      theme,
      dailyGoal,
      level,
      selectedTopics,
      selectedVoiceName,
      mixVoice,
      defaultSpeed,
      defaultGap,
      defaultRepeatEach,
      defaultRepeatMode,
      lastTopic,
      onboardingDone,
    ],
    () => {
      if (!hydrated.value) return;
      saveToLocalStorage(snapshot());
    },
    { deep: true },
  );

  return {
    theme,
    dailyGoal,
    level,
    selectedTopics,
    selectedVoiceName,
    mixVoice,
    defaultSpeed,
    defaultGap,
    defaultRepeatEach,
    defaultRepeatMode,
    lastTopic,
    onboardingDone,
    hydrated,
    hydrate,
    setTheme,
    toggleTheme,
    completeOnboarding,
    resetAll,
  };
});
