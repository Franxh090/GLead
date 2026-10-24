import { useEffect, useState } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import { useApp } from '../core/app-context';
import { useSettings } from '../core/settings-store';
import { useT } from '../core/i18n';
import { SKILLS, skillById } from '../drills/registry';
import { dueRetests, nextRetest, restingSkills } from '../core/scheduling/retests';
import { decodeArms, scheduleFor } from '../core/experiments';
import type { RetestRecord } from '../core/types';
import styles from '../styles/app.module.css';
import type { SessionOptions } from './SessionScreen';

export function TodayScreen({ onStart }: { onStart(options: SessionOptions): void }) {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const [minutes, setMinutes] = useState(10);
  const [skillIds, setSkillIds] = useState<string[]>([SKILLS[0]!.id]);
  const [due, setDue] = useState<number | null>(null);
  const [placed, setPlaced] = useState<boolean | null>(null);
  const [retests, setRetests] = useState<RetestRecord[]>([]);
  const [lastReflection, setLastReflection] = useState<string>('');
  const [thisWeek, setThisWeek] = useState(0);

  useEffect(() => {
    void (async () => {
      const cards = await app.repo.allCards();
      const s = createScheduler();
      const now = new Date();
      setDue(cards.filter((c) => s.isDue(c, now)).length);
      const sessions = await app.repo.sessions();
      setPlaced(sessions.some((x) => x.kind === 'placement'));
      setLastReflection([...sessions].reverse().find((x) => x.reflection.trim())?.reflection ?? '');
      const monday = new Date();
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      setThisWeek(
        sessions.filter(
          (x) => (x.kind ?? 'practice') === 'practice' && x.trials > 0 && x.startedAt >= monday,
        ).length,
      );
      setRetests(await app.repo.retests());
    })();
  }, [app]);

  const now = new Date();
  const dueNow = dueRetests(retests, now);
  const upcoming = nextRetest(retests, now);
  const resting = restingSkills(retests);
  const schedule = scheduleFor(decodeArms(settings.experimentArm), now);

  const toggleSkill = (id: string) =>
    setSkillIds((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id],
    );

  return (
    <div className={styles.card}>
      <h2>{t('today.title')}</h2>
      {placed === false && (
        <div className={styles.status} role="region" aria-label="Placement">
          <p>
            <strong>{t('today.placementTitle')}</strong>
            {t('today.placementBody')}
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() =>
              onStart({ minutes: 6, skillIds: SKILLS.map((s) => s.id), purpose: 'placement' })
            }
          >
            {t('today.placementButton')}
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
            <strong>{t('today.retestDue')}</strong>{' '}
            {t('today.retestBody', {
              skill: skillById(r.skillId).title,
              days: r.delay.replace('d', ''),
            })}
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() =>
              onStart({ minutes: 3, skillIds: [r.skillId], purpose: 'retest', retest: r })
            }
          >
            {t('today.startRetest')}
          </button>
        </div>
      ))}
      {settings.weeklyGoal > 0 && (
        <p className={styles.muted} role="status">
          {t('today.week', { n: thisWeek, goal: settings.weeklyGoal })}
        </p>
      )}
      {lastReflection && (
        <p className={styles.muted}>
          {t('today.lastWrote')} <q>{lastReflection}</q>
        </p>
      )}
      {dueNow.length === 0 && upcoming && (
        <p className={styles.muted}>
          {t('today.nextRetest', {
            skill: skillById(upcoming.skillId).title,
            date: upcoming.dueAt.toLocaleDateString(),
          })}
        </p>
      )}
      <p className={styles.muted}>
        {t('today.blurb')} {due !== null && due > 0 ? t('today.due', { n: due }) : ''}
      </p>
      <div className={styles.field}>
        <span>{t('today.length')}</span>
        <div className={styles.row} role="group" aria-label="Session length">
          {[5, 10, 20].map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.button} ${minutes === m ? styles.primary : ''}`}
              aria-pressed={minutes === m}
              onClick={() => setMinutes(m)}
            >
              {t('today.min', { n: m })}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('today.skills')}</span>
        <div className={styles.row} role="group" aria-label="Skills">
          {SKILLS.map((sk) => (
            <button
              key={sk.id}
              type="button"
              className={`${styles.button} ${skillIds.includes(sk.id) && !resting.has(sk.id) ? styles.primary : ''}`}
              aria-pressed={skillIds.includes(sk.id) && !resting.has(sk.id)}
              disabled={resting.has(sk.id)}
              title={resting.has(sk.id) ? t('today.restingHint') : undefined}
              onClick={() => toggleSkill(sk.id)}
            >
              {sk.title}
              {resting.has(sk.id) ? t('today.resting') : ''}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.muted}>
        {t(schedule === 'blocked' ? 'today.scheduleBlocked' : 'today.scheduleInterleaved')}
      </p>
      {!settings.micEnabled && <p className={styles.muted}>{t('today.micOff')}</p>}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          disabled={skillIds.every((id) => resting.has(id))}
          onClick={() => onStart({ minutes, skillIds: skillIds.filter((id) => !resting.has(id)) })}
        >
          {t('today.start')}
        </button>
      </div>
    </div>
  );
}
