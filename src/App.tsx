import { Suspense, lazy, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from './core/i18n';
import { SessionScreen, type PlayAlongPreset, type SessionOptions } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';

// Today, Session and Settings load with the app; the rest arrives on first visit,
// which keeps the first paint on a phone small (the build warned past 500 kB).
const KeysScreen = lazy(() =>
  import('./screens/KeysScreen').then((m) => ({ default: m.KeysScreen })),
);
const ChangesScreen = lazy(() =>
  import('./screens/ChangesScreen').then((m) => ({ default: m.ChangesScreen })),
);
const LoopsScreen = lazy(() =>
  import('./screens/LoopsScreen').then((m) => ({ default: m.LoopsScreen })),
);
const SongsScreen = lazy(() =>
  import('./screens/SongsScreen').then((m) => ({ default: m.SongsScreen })),
);
const ProgressScreen = lazy(() =>
  import('./screens/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
);
const MicLabScreen = lazy(() =>
  import('./screens/MicLabScreen').then((m) => ({ default: m.MicLabScreen })),
);
import styles from './styles/app.module.css';

type Screen =
  'today' | 'session' | 'keys' | 'changes' | 'loops' | 'songs' | 'progress' | 'settings' | 'miclab';

export function App() {
  const t = useT();
  const [screen, setScreen] = useState<Screen>('today');
  const [session, setSession] = useState<SessionOptions | null>(null);
  const [preset, setPreset] = useState<PlayAlongPreset | null>(null);
  // The service worker (vite-plugin-pwa, `registerType: 'prompt'`): offline after the
  // first visit, and a new build waits for the learner's say-so, never mid-session.
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const start = (options: SessionOptions) => {
    setSession(options);
    setScreen('session');
  };

  const tab = (id: Screen, label: string) => (
    <button
      type="button"
      className={styles.navButton}
      aria-current={screen === id ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main">
        <span className={styles.brand}>GLead</span>
        {tab('today', t('nav.today'))}
        {tab('keys', t('nav.keys'))}
        {tab('changes', t('nav.changes'))}
        {tab('loops', t('nav.loops'))}
        {tab('songs', t('nav.songs'))}
        {tab('progress', t('nav.progress'))}
        {tab('settings', t('nav.settings'))}
      </nav>
      <main>
        <Suspense fallback={<p className={styles.muted}>{t('progress.loading')}</p>}>
          {screen === 'today' && <TodayScreen onStart={start} />}
          {screen === 'session' && session && (
            <SessionScreen
              options={session}
              onExit={() => setScreen('today')}
              onPlayAlong={(p) => {
                setPreset(p);
                setScreen('changes');
              }}
            />
          )}
          {screen === 'keys' && <KeysScreen />}
          {screen === 'changes' && <ChangesScreen preset={preset} />}
          {screen === 'loops' && <LoopsScreen />}
          {screen === 'songs' && <SongsScreen />}
          {screen === 'progress' && <ProgressScreen />}
          {screen === 'settings' && <SettingsScreen onMicLab={() => setScreen('miclab')} />}
          {screen === 'miclab' && <MicLabScreen onExit={() => setScreen('settings')} />}
        </Suspense>
      </main>
      {(offlineReady || needRefresh) && (
        <div className={styles.status} role="status" aria-live="polite">
          {needRefresh ? t('pwa.update') : t('pwa.ready')}{' '}
          {needRefresh && (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => void updateServiceWorker(true)}
            >
              {t('pwa.reload')}
            </button>
          )}
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setOfflineReady(false);
              setNeedRefresh(false);
            }}
          >
            {t('pwa.dismiss')}
          </button>
        </div>
      )}
    </div>
  );
}
