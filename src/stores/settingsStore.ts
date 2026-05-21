import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const LS_KEY = 'cll.settings.v1';

export type ThemeMode = 'dark' | 'light';
export type RepeatMode = 'none' | 'one' | 'all';

type PersistedSettings = {
  theme: ThemeMode;
  displayName: string;
  role: string;
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
  /** Best Match-mode finish times in ms keyed by pair count. */
  bestMatchTimes: Record<number, number>;
  installPromptDismissedAt: number | null;
  spacedRepetition: boolean;
  vietnameseHintPosition: 'below' | 'above' | 'inline';
};

const DEFAULTS: PersistedSettings = {
  theme: 'dark',
  displayName: 'Bạn',
  role: 'Frontend Dev',
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
  bestMatchTimes: {},
  installPromptDismissedAt: null,
  spacedRepetition: true,
  vietnameseHintPosition: 'below',
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
  const displayName = ref<string>(DEFAULTS.displayName);
  const role = ref<string>(DEFAULTS.role);
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
  const bestMatchTimes = ref<Record<number, number>>({ ...DEFAULTS.bestMatchTimes });
  const installPromptDismissedAt = ref<number | null>(DEFAULTS.installPromptDismissedAt);
  const spacedRepetition = ref<boolean>(DEFAULTS.spacedRepetition);
  const vietnameseHintPosition = ref<'below' | 'above' | 'inline'>(DEFAULTS.vietnameseHintPosition);

  const hydrated = ref(false);

  function snapshot(): PersistedSettings {
    return {
      theme: theme.value,
      displayName: displayName.value,
      role: role.value,
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
      bestMatchTimes: { ...bestMatchTimes.value },
      installPromptDismissedAt: installPromptDismissedAt.value,
      spacedRepetition: spacedRepetition.value,
      vietnameseHintPosition: vietnameseHintPosition.value,
    };
  }

  function hydrate() {
    if (hydrated.value) return;
    const s = loadFromLocalStorage();
    theme.value = s.theme;
    displayName.value = s.displayName;
    role.value = s.role;
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
    bestMatchTimes.value = { ...s.bestMatchTimes };
    installPromptDismissedAt.value = s.installPromptDismissedAt;
    spacedRepetition.value = s.spacedRepetition;
    vietnameseHintPosition.value = s.vietnameseHintPosition;
    hydrated.value = true;
  }

  function recordMatchTime(pairCount: number, timeMs: number) {
    const cur = bestMatchTimes.value[pairCount];
    if (!cur || timeMs < cur) {
      bestMatchTimes.value = { ...bestMatchTimes.value, [pairCount]: timeMs };
    }
  }
  function getBestMatchTime(pairCount: number): number | undefined {
    return bestMatchTimes.value[pairCount];
  }
  function dismissInstallPrompt() {
    installPromptDismissedAt.value = Date.now();
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
    displayName.value = DEFAULTS.displayName;
    role.value = DEFAULTS.role;
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
    bestMatchTimes.value = { ...DEFAULTS.bestMatchTimes };
    installPromptDismissedAt.value = DEFAULTS.installPromptDismissedAt;
    spacedRepetition.value = DEFAULTS.spacedRepetition;
    vietnameseHintPosition.value = DEFAULTS.vietnameseHintPosition;
  }

  // Persist on any change after hydration.
  watch(
    [
      theme,
      displayName,
      role,
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
      bestMatchTimes,
      installPromptDismissedAt,
      spacedRepetition,
      vietnameseHintPosition,
    ],
    () => {
      if (!hydrated.value) return;
      saveToLocalStorage(snapshot());
    },
    { deep: true },
  );

  return {
    theme,
    displayName,
    role,
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
    bestMatchTimes,
    installPromptDismissedAt,
    spacedRepetition,
    vietnameseHintPosition,
    hydrated,
    hydrate,
    setTheme,
    toggleTheme,
    completeOnboarding,
    recordMatchTime,
    getBestMatchTime,
    dismissInstallPrompt,
    resetAll,
  };
});
