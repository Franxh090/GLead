/**
 * Settings in memory, loaded once from Dexie and written back on change.
 * Exposes `getState`/`subscribe` in the shape FretFree's `syncAudioOutput`
 * expects, and a React hook.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, type Settings } from './events/db';
import { assignArms, encodeArms } from './experiments';
import { detectLanguage, setLanguage } from './i18n';
import type { Repo } from './events/repo';

export interface SettingsStore {
  get(): Settings;
  update(patch: Partial<Settings>): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** For `syncAudioOutput`. */
  getState(): { settings: { soundOn: boolean; volume: number } };
  /** Loads from the repo; resolves once settings are current. */
  load(): Promise<Settings>;
  readonly loaded: boolean;
}

export function createSettingsStore(repo: Repo): SettingsStore {
  let settings: Settings = DEFAULT_SETTINGS;
  let loaded = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => settings,
    get loaded() {
      return loaded;
    },
    async update(patch) {
      settings = { ...settings, ...patch };
      if (patch.language) setLanguage(patch.language);
      emit();
      await repo.saveSettings(patch);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => ({ settings: { soundOn: settings.soundOn, volume: settings.volume } }),
    async load() {
      settings = await repo.getSettings();
      // First run: draw the learner's experiment arms once (PRD §6).
      if (settings.experimentArm === 'default') {
        const arms = assignArms(Math.random);
        settings = await repo.saveSettings({
          experimentArm: encodeArms(arms),
          labelScheme: arms.labels,
        });
      }
      // First run: the browser's language, if GLead has it.
      if (!(await repo.hasSettings())) {
        settings = await repo.saveSettings({
          language: detectLanguage(globalThis.navigator?.language),
        });
      }
      setLanguage(settings.language);
      loaded = true;
      emit();
      return settings;
    },
  };
}

export function useSettings(store: SettingsStore): Settings {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
