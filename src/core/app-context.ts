/** The app's singletons, built once in `main.tsx` and passed down by context. */
import { createContext, useContext } from 'react';
import type { InputAdapter } from './types';
import type { Repo } from './events/repo';
import type { SettingsStore } from './settings-store';

export interface AppServices {
  repo: Repo;
  settings: SettingsStore;
  /** The microphone, built lazily on first use (permission waits for a tap). */
  mic(): InputAdapter;
}

export const AppContext = createContext<AppServices | null>(null);

export function useApp(): AppServices {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext is missing');
  return ctx;
}
