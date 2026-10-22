import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppContext, type AppServices } from './core/app-context';
import { getDb } from './core/events/db';
import { createRepo } from './core/events/repo';
import { createMicInput } from './core/input/mic';
import { createSettingsStore } from './core/settings-store';
import type { InputAdapter } from './core/types';
import { installAudioUnlock, syncAudioOutput } from './vendor/fretfree/audio/audio';
import { installPitchDetector } from './vendor/fretfree/mic/detector';
import { getPitchSource } from './vendor/fretfree/mic/source';
import './styles/global.css';

const repo = createRepo(getDb());
const settings = createSettingsStore(repo);
let mic: InputAdapter | null = null;
const services: AppServices = {
  repo,
  settings,
  mic: () => (mic ??= createMicInput(getPitchSource())),
};

installAudioUnlock();
syncAudioOutput({
  getState: settings.getState,
  subscribe: (listener) => settings.subscribe(() => listener(settings.getState())),
});
installPitchDetector();

// E2E only: a Playwright spec sets `window.__gleadFakeMic = true` before the
// app loads and gets the fake pitch source back on the same property.
const fakeMicWindow = window as { __gleadFakeMic?: unknown };
if (fakeMicWindow.__gleadFakeMic === true) {
  void import('./vendor/fretfree/mic/source').then(
    ({ createFakePitchSource, setPitchSourceFactory }) => {
      const fake = createFakePitchSource();
      setPitchSourceFactory(() => fake);
      fakeMicWindow.__gleadFakeMic = fake;
    },
  );
}

void settings.load().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <AppContext value={services}>
        <App />
      </AppContext>
    </StrictMode>,
  );
});
