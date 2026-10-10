import { defineStore } from 'pinia';

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  lowEffects: boolean;
  showFps: boolean;
  autoPick: 'manual' | 'dps' | 'survival' | 'summon' | 'balanced' | 'custom';
  customPriority: string[];
  defaultSpeed: number;
  showGrid: boolean;
  confirmExit: boolean;
  language: 'zh';
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    masterVolume: 0.8,
    musicVolume: 0.45,
    sfxVolume: 0.7,
    muted: false,
    screenShake: true,
    damageNumbers: true,
    lowEffects: false,
    showFps: false,
    autoPick: 'manual',
    customPriority: ['dps', 'survival', 'summon', 'economy'],
    defaultSpeed: 1,
    showGrid: false,
    confirmExit: true,
    language: 'zh',
  }),
  actions: {
    hydrate(patch: Partial<SettingsState> | null) {
      if (patch) Object.assign(this, patch);
    },
    toggleMute() {
      this.muted = !this.muted;
    },
  },
});
