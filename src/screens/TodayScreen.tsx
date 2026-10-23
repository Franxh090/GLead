import { useEffect, useState } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import { useApp } from '../core/app-context';
import { useSettings } from '../core/settings-store';
import { SKILLS } from '../drills/registry';
import styles from '../styles/app.module.css';
import type { SessionOptions } from './SessionScreen';

export function TodayScreen({ onStart }: { onStart(options: SessionOptions): void }) {
  const app = useApp();
  const settings = useSettings(app.settings);
  const [minutes, setMinutes] = useState(10);
  const [skillIds, setSkillIds] = useState<string[]>([SKILLS[0]!.id]);
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    void app.repo.allCards().then((cards) => {
      const s = createScheduler();
      const now = new Date();
      setDue(cards.filter((c) => s.isDue(c, now)).length);
    });
  }, [app]);

  const toggleSkill = (id: string) =>
    setSkillIds((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id],
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
        <span>Skills</span>
        <div className={styles.row} role="group" aria-label="Skills">
          {SKILLS.map((sk) => (
            <button
              key={sk.id}
              type="button"
              className={`${styles.button} ${skillIds.includes(sk.id) ? styles.primary : ''}`}
              aria-pressed={skillIds.includes(sk.id)}
              onClick={() => toggleSkill(sk.id)}
            >
              {sk.title}
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
          onClick={() => onStart({ minutes, skillIds })}
        >
          Start session
        </button>
      </div>
    </div>
  );
}
