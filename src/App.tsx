import { useState } from 'react';
import { LoopsScreen } from './screens/LoopsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SessionScreen, type SessionOptions } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import styles from './styles/app.module.css';

type Screen = 'today' | 'session' | 'loops' | 'progress' | 'settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [session, setSession] = useState<SessionOptions | null>(null);

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
        {tab('today', 'Today')}
        {tab('loops', 'Loops')}
        {tab('progress', 'Progress')}
        {tab('settings', 'Settings')}
      </nav>
      <main>
        {screen === 'today' && <TodayScreen onStart={start} />}
        {screen === 'session' && session && (
          <SessionScreen options={session} onExit={() => setScreen('today')} />
        )}
        {screen === 'loops' && <LoopsScreen />}
        {screen === 'progress' && <ProgressScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}
