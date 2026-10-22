import { useEffect, useState } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import type { KeyMode } from '../vendor/fretfree/theory';
import { useApp } from '../core/app-context';
import { useSettings } from '../core/settings-store';
import styles from '../styles/app.module.css';
import type { SessionOptions } from './SessionScreen';

export function TodayScreen({ onStart }: { onStart(options: SessionOptions): void }) {
  const app = useApp();
  const settings = useSettings(app.settings);
  const [minutes, setMinutes] = useState(10);
  const [modes, setModes] = useState<KeyMode[]>(['major']);
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    void app.repo.allCards().then((cards) => {
      const s = createScheduler();
      const now = new Date();
      setDue(cards.filter((c) => s.isDue(c, now)).length);
    });
  }, [app]);

  const toggleMode = (m: KeyMode) =>
    setModes((cur) =>
      cur.includes(m) ? (cur.length > 1 ? cur.filter((x) => x !== m) : cur) : [...cur, m],
    );

  return (
    <div className={styles.card}>
      <h2>Today</h2>
      <p className={styles.muted}>
        Hear the key, play the note. Each session mixes keys and brings back what you missed.
        {due !== null && due > 0 ? ` ${due} card${due === 1 ? '' : 's'} due.` : ''}
      </p>
      <div className={styles.field}>
        <span>Length</span>
        <div className={styles.row} role="group" aria-label="Session length">
          {[5, 10, 20].map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.button} ${minutes === m ? styles.primary : ''}`}
              aria-pressed={minutes === m}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>Keys</span>
        <div className={styles.row} role="group" aria-label="Key modes">
          {(['major', 'minor'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.button} ${modes.includes(m) ? styles.primary : ''}`}
              aria-pressed={modes.includes(m)}
              onClick={() => toggleMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {!settings.micEnabled && (
        <p className={styles.muted}>
          The microphone is off, so you answer by tapping. Turn it on in Settings to answer on your
          guitar.
        </p>
      )}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          onClick={() => onStart({ minutes, modes })}
        >
          Start: scale degrees
        </button>
      </div>
    </div>
  );
}
