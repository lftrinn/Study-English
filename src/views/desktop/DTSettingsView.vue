<script setup lang="ts">
import { ref } from 'vue';

import Icon from '@/components/common/Icon.vue';
import MiniSwitch from '@/components/common/MiniSwitch.vue';

import { useSettingsStore } from '@/stores/settingsStore';

const settings = useSettingsStore();

type GroupId = 'profile' | 'audio' | 'practice' | 'appearance' | 'notifications' | 'data' | 'about';

const groups: Array<{ id: GroupId; label: string; icon: string }> = [
  { id: 'profile', label: 'Profile', icon: 'edit' },
  { id: 'audio', label: 'Audio', icon: 'speaker' },
  { id: 'practice', label: 'Practice', icon: 'brain' },
  { id: 'appearance', label: 'Appearance', icon: 'moon' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'data', label: 'Data', icon: 'download' },
  { id: 'about', label: 'About', icon: 'sparkle' },
];

const tab = ref<GroupId>('audio');

const dailyReminder = ref(true);
const streakAlert = ref(true);
const weeklyRecap = ref(false);
</script>

<template>
  <div class="scrollarea dt-st">
    <h1 class="dt-st__title">Settings</h1>
    <div class="dt-st__sub">Tune your listening lab.</div>

    <div class="dt-st__grid">
      <!-- Side nav -->
      <div class="dt-st__nav">
        <button
          v-for="g in groups"
          :key="g.id"
          class="btn tap dt-st__nav-btn"
          :class="{ 'is-active': tab === g.id }"
          @click="tab = g.id"
        >
          <Icon
            :name="g.icon as any"
            :size="15"
            :style="{ color: tab === g.id ? 'var(--color-cyan)' : 'var(--color-text-3)' }"
          />
          <span :style="{ fontWeight: tab === g.id ? 700 : 600 }">{{ g.label }}</span>
        </button>
      </div>

      <!-- Panel -->
      <div class="glass dt-st__panel">
        <!-- Profile -->
        <template v-if="tab === 'profile'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Profile</div>
            <div class="dt-st__h-hint">The person behind the listening lab.</div>
          </div>
          <div class="dt-st__profile">
            <div class="dt-st__avatar">{{ (settings.displayName || 'M').charAt(0).toUpperCase() }}</div>
            <div class="dt-st__profile-meta">
              <div class="dt-st__profile-name">{{ settings.displayName || 'Bạn' }} · {{ settings.role || 'Frontend Dev' }}</div>
              <div class="dt-st__profile-sub">Level {{ settings.level }} · Goal {{ settings.dailyGoal }}/day</div>
            </div>
            <button class="btn tap dt-st__edit-btn">Edit avatar</button>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Display name</div>
              <input v-model="settings.displayName" class="dt-st__input" placeholder="Minh" />
            </div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">English level</div>
              <div class="dt-st__seg">
                <button
                  v-for="l in ['A1','A2','B1']"
                  :key="l"
                  class="btn tap dt-st__seg-btn"
                  :class="{ 'is-on': settings.level === l }"
                  @click="settings.level = l as any"
                >{{ l }}</button>
              </div>
            </div>
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Target</div>
              <div class="dt-st__row-hint">TOEIC 600 by end of August</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
        </template>

        <!-- Audio -->
        <template v-if="tab === 'audio'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Audio</div>
            <div class="dt-st__h-hint">How chunks play and rotate.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default voice</div>
              <div class="dt-st__row-hint">{{ settings.selectedVoiceName ?? 'Aria · US · Female · Clear' }}</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Mix voices</div>
              <div class="dt-st__row-hint">Rotate voices each chunk</div>
            </div>
            <MiniSwitch v-model="settings.mixVoice" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default speed</div>
              <div class="dt-st__row-hint">{{ settings.defaultSpeed.toFixed(2) }}× · normal</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Gap between chunks</div>
              <div class="dt-st__row-hint">{{ (settings.defaultGap / 1000).toFixed(1) }}s · just enough to repeat</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
        </template>

        <!-- Practice -->
        <template v-if="tab === 'practice'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Practice</div>
            <div class="dt-st__h-hint">How your study loop is shaped.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Default repeat</div>
              <div class="dt-st__row-hint">Each chunk × {{ settings.defaultRepeatEach }}</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Daily goal</div>
              <div class="dt-st__row-hint">{{ settings.dailyGoal }} chunks · on track</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Spaced repetition</div>
              <div class="dt-st__row-hint">Smart review · SM-2 algorithm</div>
            </div>
            <MiniSwitch v-model="settings.spacedRepetition" />
          </div>
        </template>

        <!-- Appearance -->
        <template v-if="tab === 'appearance'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Appearance</div>
            <div class="dt-st__h-hint">Light at the desk, dark on the train.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Theme</div>
              <div class="dt-st__row-hint">{{ settings.theme === 'dark' ? 'Midnight lab' : 'Bright lab' }}</div>
            </div>
            <div class="dt-st__theme">
              <button
                class="btn tap dt-st__theme-btn"
                :class="{ 'is-on': settings.theme === 'dark' }"
                @click="settings.setTheme('dark')"
                aria-label="Dark"
              ><Icon name="moon" :size="14" /></button>
              <button
                class="btn tap dt-st__theme-btn"
                :class="{ 'is-on': settings.theme === 'light' }"
                @click="settings.setTheme('light')"
                aria-label="Light"
              ><Icon name="sun" :size="14" /></button>
            </div>
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Vietnamese hint position</div>
              <div class="dt-st__row-hint">Below English</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
        </template>

        <!-- Notifications -->
        <template v-if="tab === 'notifications'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Notifications</div>
            <div class="dt-st__h-hint">Gentle nudges, nothing else.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Daily reminder</div>
              <div class="dt-st__row-hint">9:00 — soft tone</div>
            </div>
            <MiniSwitch v-model="dailyReminder" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Streak alert</div>
              <div class="dt-st__row-hint">Before midnight only</div>
            </div>
            <MiniSwitch v-model="streakAlert" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Weekly recap</div>
              <div class="dt-st__row-hint">Sunday morning</div>
            </div>
            <MiniSwitch v-model="weeklyRecap" />
          </div>
        </template>

        <!-- Data -->
        <template v-if="tab === 'data'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">Data</div>
            <div class="dt-st__h-hint">Bring chunks in, take your log out.</div>
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Import chunks</div>
              <div class="dt-st__row-hint">CSV · TSV · JSON</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Export listening log</div>
              <div class="dt-st__row-hint">View every session</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Install as PWA</div>
              <div class="dt-st__row-hint">Add to home screen</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl is-danger">Clear local data</div>
              <div class="dt-st__row-hint">This cannot be undone</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
        </template>

        <!-- About -->
        <template v-if="tab === 'about'">
          <div class="dt-st__h">
            <div class="dt-st__h-title">About</div>
          </div>
          <div class="dt-st__about">
            Chunk Listening Lab — listening app cho frontend dev Việt học English.
            Build trên phương pháp chunking: đừng học từ rời, build cả cụm.
          </div>
          <div class="dt-st__row">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Version</div>
              <div class="dt-st__row-hint">1.0.0 · build 24</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
          <div class="dt-st__row is-last">
            <div class="dt-st__row-text">
              <div class="dt-st__row-lbl">Send feedback</div>
              <div class="dt-st__row-hint">hi@chunklab.app</div>
            </div>
            <Icon name="chevron-right" :size="14" :style="{ color: 'var(--color-text-4)' }" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scrollarea::-webkit-scrollbar { display: none; }
.dt-st { padding: 28px; }
.dt-st__title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.025em; }
.dt-st__sub { font-size: 13px; color: var(--color-text-3); margin-top: 2px; margin-bottom: 22px; }
.dt-st__grid { display: grid; grid-template-columns: 220px 1fr; gap: 22px; }

.dt-st__nav { display: flex; flex-direction: column; gap: 2px; }
.dt-st__nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-2); text-align: left;
  font-size: 13px;
}
.dt-st__nav-btn.is-active {
  background: var(--color-surface-3);
  border-color: var(--color-border-2);
  color: var(--color-text-1);
}

.dt-st__panel { padding: 24px; }
.dt-st__h { margin-bottom: 16px; }
.dt-st__h-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
.dt-st__h-hint { font-size: 12px; color: var(--color-text-3); margin-top: 2px; }

.dt-st__row {
  padding: 12px 0; border-bottom: 1px solid var(--color-border-1);
  display: flex; align-items: center; gap: 12px;
}
.dt-st__row.is-last { border-bottom: 0; }
.dt-st__row-text { flex: 1; }
.dt-st__row-lbl { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.dt-st__row-lbl.is-danger { color: var(--color-rose); }
.dt-st__row-hint { font-size: 11px; color: var(--color-text-3); margin-top: 2px; }

.dt-st__profile { display: flex; align-items: center; gap: 16px; padding: 6px 0 14px; }
.dt-st__avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--grad-primary);
  display: grid; place-items: center;
  font-size: 24px; font-weight: 700; color: #0b0f22;
}
.dt-st__profile-meta { flex: 1; }
.dt-st__profile-name { font-size: 16px; font-weight: 700; }
.dt-st__profile-sub { font-size: 12px; color: var(--color-text-3); }
.dt-st__edit-btn {
  padding: 8px 14px; border-radius: 10px;
  background: var(--color-surface-2); border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-2);
}

.dt-st__input {
  margin-top: 4px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px; color: var(--color-text-1);
  font-family: inherit;
  width: 240px;
}

.dt-st__seg { display: flex; gap: 6px; margin-top: 6px; }
.dt-st__seg-btn {
  padding: 6px 14px; border-radius: 8px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  font-size: 12px; font-weight: 700; color: var(--color-text-3);
}
.dt-st__seg-btn.is-on {
  background: var(--color-surface-3);
  border-color: var(--color-violet);
  color: var(--color-violet);
}

.dt-st__theme { display: flex; gap: 4px; background: var(--color-surface-1); padding: 3px; border-radius: 10px; border: 1px solid var(--color-border-1); }
.dt-st__theme-btn {
  width: 32px; height: 28px; border-radius: 7px;
  display: grid; place-items: center;
  color: var(--color-text-3);
}
.dt-st__theme-btn.is-on { background: var(--color-surface-3); color: var(--color-cyan); }

.dt-st__about {
  padding: 8px 0 14px; font-size: 13px; color: var(--color-text-2); line-height: 1.6;
}
</style>
