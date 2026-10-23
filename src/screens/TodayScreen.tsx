import { useEffect, useState } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import { useApp } from '../core/app-context';
import { useSettings } from '../core/settings-store';
import { SKILLS, skillById } from '../drills/registry';
import { dueRetests, nextRetest } from '../core/scheduling/retests';
import type { RetestRecord } from '../core/types';
import styles from '../styles/app.module.css';
import type { SessionOptions } from './SessionScreen';

export function TodayScreen({ onStart }: { onStart(options: SessionOptions): void }) {
  const app = useApp();
  const settings = useSettings(app.settings);
  const [minutes, setMinutes] = useState(10);
  const [skillIds, setSkillIds] = useState<string[]>([SKILLS[0]!.id]);
  const [due, setDue] = useState<number | null>(null);
  const [placed, setPlaced] = useState<boolean | null>(null);
  const [retests, setRetests] = useState<RetestRecord[]>([]);
  const [lastReflection, setLastReflection] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const cards = await app.repo.allCards();
      const s = createScheduler();
      const now = new Date();
      setDue(cards.filter((c) => s.isDue(c, now)).length);
      const sessions = await app.repo.sessions();
      setPlaced(sessions.some((x) => x.kind === 'placement'));
      setLastReflection([...sessions].reverse().find((x) => x.reflection.trim())?.reflection ?? '');
      setRetests(await app.repo.retests());
    })();
  }, [app]);

  const now = new Date();
  const dueNow = dueRetests(retests, now);
  const upcoming = nextRetest(retests, now);

  const toggleSkill = (id: string) =>
    setSkillIds((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id],
    );

  return (
    <div className={styles.card}>
      <h2>Today</h2>
      {placed === false && (
        <div className={styles.status} role="region" aria-label="Placement">
          <p>
            <strong>Start with the placement test</strong> (about six minutes). It sets your
            baseline, so later retests can show what you have gained.
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() =>
              onStart({ minutes: 6, skillIds: SKILLS.map((s) => s.id), purpose: 'placement' })
            }
          >
            Take the placement test
          </button>
        </div>
      )}
      {dueNow.map((r) => (
        <div
          key={r.id ?? `${r.skillId}-${r.delay}`}
          className={styles.status}
          role="region"
          aria-label="Retest due"
        >
          <p>
            <strong>Retest due:</strong> {skillById(r.skillId).title},{' '}
            {r.delay.replace('d', ' days')} after you reached criterion. In keys you have not
            practised, so it measures what transferred.
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() =>
              onStart({ minutes: 3, skillIds: [r.skillId], purpose: 'retest', retest: r })
            }
          >
            Start retest
          </button>
        </div>
      ))}
      {lastReflection && (
        <p className={styles.muted}>
          Last time you wrote: <q>{lastReflection}</q>
        </p>
      )}
      {dueNow.length === 0 && upcoming && (
        <p className={styles.muted}>
          Next retest: {skillById(upcoming.skillId).title} on {upcoming.dueAt.toLocaleDateString()}.
        </p>
      )}
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
