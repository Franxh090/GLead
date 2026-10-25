/** Renders a screen inside the app's services, on a fresh in-memory database. */
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppContext, type AppServices } from '../core/app-context';
import { GLeadDB } from '../core/events/db';
import { createRepo, type Repo } from '../core/events/repo';
import { createSettingsStore, type SettingsStore } from '../core/settings-store';
import type { InputAdapter } from '../core/types';

export function stubMic(): InputAdapter {
  return {
    id: 'mic',
    state: 'idle',
    error: null,
    start: async () => undefined,
    stop: () => undefined,
    onEvent: () => () => undefined,
    onStateChange: () => () => undefined,
  };
}

export async function makeServices(): Promise<
  AppServices & { settings: SettingsStore; repo: Repo }
> {
  const repo = createRepo(new GLeadDB(`ui-${Math.random()}`));
  const settings = createSettingsStore(repo);
  await settings.load();
  const mic = stubMic();
  return { repo, settings, mic: () => mic };
}

export async function renderWithApp(
  ui: ReactNode,
  services?: AppServices,
): Promise<{ services: AppServices } & RenderResult> {
  const s = services ?? (await makeServices());
  const result = render(<AppContext value={s}>{ui}</AppContext>);
  return { services: s, ...result };
}
