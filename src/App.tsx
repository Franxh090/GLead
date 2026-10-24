import { useState } from 'react';
import { useT } from './core/i18n';
import { ChangesScreen } from './screens/ChangesScreen';
import { KeysScreen } from './screens/KeysScreen';
import { LoopsScreen } from './screens/LoopsScreen';
import { MicLabScreen } from './screens/MicLabScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SessionScreen, type PlayAlongPreset, type SessionOptions } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import styles from './styles/app.module.css';

type Screen =
  'today' | 'session' | 'keys' | 'changes' | 'loops' | 'progress' | 'settings' | 'miclab';

export function App() {
  const t = useT();
  const [screen, setScreen] = useState<Screen>('today');
  const [session, setSession] = useState<SessionOptions | null>(null);
  const [preset, setPreset] = useState<PlayAlongPreset | null>(null);

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
        {tab('progress', t('nav.progress'))}
        {tab('settings', t('nav.settings'))}
      </nav>
      <main>
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
        {screen === 'progress' && <ProgressScreen />}
        {screen === 'settings' && <SettingsScreen onMicLab={() => setScreen('miclab')} />}
        {screen === 'miclab' && <MicLabScreen onExit={() => setScreen('settings')} />}
      </main>
    </div>
  );
}
