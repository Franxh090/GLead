import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import { keyName, type MusicalKey } from '../vendor/fretfree/theory';
import { useT } from '../core/i18n';
import { playScript, stopScript } from '../audio/player';
import { useApp } from '../core/app-context';
import { newId } from '../core/events/ids';
import { practisedKeys, unseenKeys } from '../core/keys';
import {
  bandDecision,
  planSession,
  recentBySkill,
  sessionShape,
  shuffle,
  warmUpFirst,
  type PlanEntry,
  type SessionShape,
} from '../core/scheduling/plan';
import { placementOutcome, placementPlan, seedKnownCards } from '../core/scheduling/placement';
import { RETEST_TRIALS, planRetests, restingSkills } from '../core/scheduling/retests';
import { decodeArms, scheduleFor } from '../core/experiments';
import { pick } from '../core/keys';
import { createSessionRunner, type SessionRunner } from '../core/session/runner';
import { useSettings } from '../core/settings-store';
import { requestPersistence } from '../core/storage';
import type { InputAdapter, InputEvent, RetestRecord, SessionPurpose } from '../core/types';
import { drillForItem, modeOfItem, rationaleOf, SKILLS, skillTitle } from '../drills/registry';
import { B4_ID, type B4Prompt } from '../drills/b4-find-melody/logic';
import { C4Panel } from '../drills/c4-response/C4Panel';
import { c4Trial } from '../drills/c4-response/logic';
import styles from '../styles/app.module.css';
import { getTuning } from '../core/tunings';

export interface SessionOptions {
  minutes: number;
  skillIds: readonly string[];
  /** Default practice. A placement or a retest measures only. */
  purpose?: SessionPurpose;
  /** The retest being run, when `purpose` is `retest`. */
  retest?: RetestRecord;
  /** No guitar at hand: answers by tap, no mic, no play-along, no call and response. */
  noGuitar?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function useRunnerState(runner: SessionRunner | null) {
  const version = useRef(0);
  return useSyncExternalStore(
    (cb) => (runner ? runner.subscribe(() => void (version.current++, cb())) : () => undefined),
    () => (runner ? `${version.current}:${runner.state.phase}:${runner.state.index}` : 'none'),
    () => 'none',
  );
}

export interface PlayAlongPreset {
  minutes: number;
  skillIds: readonly string[];
}

export function SessionScreen({
  options,
  onExit,
  onPlayAlong,
}: {
  options: SessionOptions;
  onExit(): void;
  /** Hand over to the Changes screen for the session's play-along. */
  onPlayAlong?(preset: PlayAlongPreset): void;
}) {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const [runner, setRunner] = useState<SessionRunner | null>(null);
  const [shape, setShape] = useState<SessionShape | null>(null);
  const [goalSeen, setGoalSeen] = useState(false);
  const [reflection, setReflection] = useState('');
  const savedRef = useRef(false);
  const reflectionRef = useRef('');
  const scheduleRef = useRef<'interleaved' | 'blocked'>('interleaved');
  const mic: InputAdapter | null =
    settings.micEnabled && !options.noGuitar && runner ? app.mic() : null;
  const micState = useSyncExternalStore(
    (cb) => (mic ? mic.onStateChange(cb) : () => undefined),
    () => mic?.state ?? 'idle',
    () => 'idle',
  );
  const sessionId = useMemo(() => newId('s'), []);
  const startedAt = useMemo(() => new Date(), []);
  useRunnerState(runner);

  // Build the plan and the runner once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cards = await app.repo.allCards();
      const purpose = options.purpose ?? 'practice';
      const recent = recentBySkill(await app.repo.trials(), options.skillIds);
      const held = options.skillIds.filter((id) => bandDecision(recent[id]) === 'hold');
      const resting =
        purpose === 'practice' ? restingSkills(await app.repo.retests()) : new Set<string>();
      const skills = SKILLS.filter((s) => options.skillIds.includes(s.id) && !resting.has(s.id));
      const schedule =
        purpose === 'practice'
          ? scheduleFor(decodeArms(app.settings.get().experimentArm), new Date())
          : 'interleaved';
      scheduleRef.current = schedule;
      const blocked = schedule === 'blocked';
      // Blocked practice keeps one key per mode for the whole session.
      const blockKey = new Map<string, MusicalKey>();
      const items = skills.flatMap((s) => s.items());
      const scheduler = createScheduler();
      let plan: PlanEntry[];
      if (purpose === 'placement') {
        plan = placementPlan(SKILLS, Math.random);
      } else if (purpose === 'retest') {
        const pool: PlanEntry[] = [];
        while (pool.length < RETEST_TRIALS) {
          for (const item of shuffle([...items], Math.random)) pool.push({ item, kind: 'review' });
        }
        plan = pool.slice(0, RETEST_TRIALS);
      } else {
        plan = warmUpFirst(
          planSession({
            now: new Date(),
            minutes: options.minutes,
            items,
            cards,
            scheduler,
            rng: Math.random,
            blocked,
            recent,
          }),
        );
      }
      const r = createSessionRunner({
        sessionId,
        plan,
        drillFor: drillForItem,
        keyPoolFor: (item) => {
          const mode = modeOfItem(item);
          if (purpose === 'retest') return unseenKeys(mode);
          if (!blocked) return practisedKeys(mode);
          const pool = practisedKeys(mode);
          const k = blockKey.get(mode) ?? (pool[pick(pool.length, Math.random)] as MusicalKey);
          blockKey.set(mode, k);
          return [k];
        },
        cards,
        scheduler,
        repo: app.repo,
        settings: app.settings.get(),
        play: (steps) => playScript(steps),
        wait: sleep,
        now: () => new Date(),
        clock: () => performance.now(),
        rng: Math.random,
        tuning: getTuning(app.settings.get().tuning),
        purpose,
        retest: options.retest?.delay ?? 'none',
        schedule,
      });
      if (cancelled) return;
      r.subscribe((st) => {
        if (st.phase !== 'done' || savedRef.current) return;
        savedRef.current = true;
        void (async () => {
          const now = new Date();
          await app.repo.saveSession({
            sessionId,
            startedAt,
            endedAt: now,
            minutes: options.minutes,
            trials: st.trials,
            correct: st.correct,
            reflection: reflectionRef.current,
            kind: purpose,
          });
          // Real data exists now: ask the browser to keep it (Settings shows the answer).
          void requestPersistence();
          if (purpose === 'placement') {
            const outcome = placementOutcome(
              st.byItem,
              SKILLS.flatMap((sk) => sk.items()),
            );
            await app.repo.saveCards(seedKnownCards(outcome, SKILLS, scheduler, now));
          } else if (purpose === 'retest' && options.retest) {
            await app.repo.saveRetest({ ...options.retest, doneAt: now, sessionId });
          } else {
            const fresh = planRetests(
              await app.repo.trials(),
              await app.repo.retests(),
              skills.map((sk) => sk.id),
              now,
            );
            for (const rt of fresh) await app.repo.saveRetest(rt);
          }
        })();
      });
      const sh =
        purpose === 'practice'
          ? sessionShape(
              plan,
              options.minutes,
              skillTitle,
              {
                reviews: (n) => t(n === 1 ? 'shape.review1' : 'shape.reviews', { n }),
                concepts: (titles) => t('shape.new', { list: titles.join(t('shape.and')) }),
                playAlong: (m) => t('shape.play', { n: m }),
                held: (titles) => t('shape.held', { list: titles.join(t('shape.and')) }),
                short: t('shape.short'),
                separator: ', ',
              },
              !options.noGuitar,
              held,
            )
          : null;
      setShape(sh);
      setRunner(r);
      // A practice session states its goal first and starts on the learner's tap.
      if (!sh) void r.start();
    })();
    return () => {
      cancelled = true;
      stopScript();
    };
  }, [app, options, sessionId, startedAt, t]);

  // Route mic events into the runner while the session runs.
  useEffect(() => {
    if (!runner || !mic) return;
    const off = mic.onEvent((e) => runner.input(e));
    return () => {
      off();
      mic.stop();
    };
  }, [runner, mic]);

  // After a melody is copied, the response panel takes over until Next (PRD C4).
  const state = runner?.state;
  const purpose = options.purpose ?? 'practice';
  const c4Active =
    purpose === 'practice' &&
    !options.noGuitar &&
    settings.callResponse &&
    state?.phase === 'feedback' &&
    state.drill?.id === B4_ID;
  // Move on by itself after a correct answer; a miss waits for the learner.
  useEffect(() => {
    if (!runner || state?.phase !== 'feedback' || !state.feedback?.check.correct || c4Active)
      return;
    const t = setTimeout(() => void runner.advance(), 1400);
    return () => clearTimeout(t);
  }, [runner, state?.phase, state?.feedback, state?.index, c4Active]);

  if (!runner || !state) return <p className={styles.muted}>{t('session.preparing')}</p>;

  if (shape && !goalSeen) {
    return (
      <div className={styles.card} role="region" aria-label={t('session.goalAria')}>
        <h2>{t('session.goalTitle')}</h2>
        <p>{shape.goal}</p>
        <p className={styles.muted}>{t('session.goalWhy')}</p>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => {
              setGoalSeen(true);
              void runner.start();
            }}
          >
            {t('session.begin')}
          </button>
        </div>
      </div>
    );
  }

  const onTap = (e: InputEvent) => runner.input(e);
  const startMic = () => void mic?.start().catch(() => undefined);

  if (state.phase === 'done') {
    const acc = state.trials ? Math.round((100 * state.correct) / state.trials) : null;
    const saveReflection = async () => {
      await app.repo.saveSession({
        sessionId,
        startedAt,
        endedAt: new Date(),
        minutes: options.minutes,
        trials: state.trials,
        correct: state.correct,
        reflection,
        kind: options.purpose ?? 'practice',
      });
    };
    return (
      <div className={styles.card}>
        <h2>
          {(options.purpose ?? 'practice') === 'placement'
            ? t('session.placementDone')
            : options.purpose === 'retest'
              ? t('session.retestDone', { delay: options.retest?.delay ?? '' })
              : t('session.done')}
        </h2>
        <p>
          <span className={styles.big}>{acc === null ? '—' : `${acc}%`}</span>{' '}
          <span className={styles.muted}>{t('session.summary', { n: state.trials })}</span>
        </p>
        {Object.keys(state.byKey).length > 0 && (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('session.key')}</th>
                  <th>{t('session.trials')}</th>
                  <th>{t('session.rightCol')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(state.byKey).map(([k, t]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{t.trials}</td>
                    <td>{t.correct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <label>
          <span className={styles.muted}>{t('session.reflect')}</span>
          <textarea
            className={styles.textarea}
            value={reflection}
            onChange={(e) => {
              reflectionRef.current = e.target.value;
              setReflection(e.target.value);
            }}
          />
        </label>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => void saveReflection().then(onExit)}
          >
            {t('session.save')}
          </button>
          {shape?.playAlong && onPlayAlong && (
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                void saveReflection().then(() =>
                  onPlayAlong({ minutes: shape.playAlong!.minutes, skillIds: options.skillIds }),
                )
              }
            >
              {t('session.savePlay', { n: shape.playAlong.minutes })}
            </button>
          )}
        </div>
      </div>
    );
  }

  const drill = state.drill!;
  const View = drill.render;
  const fb = state.feedback;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.muted}>
          {t('session.trial', { n: state.index + 1, total: state.total })}
          {state.key ? ` · ${keyName(state.key)}` : ''}
        </span>
        <span style={{ marginLeft: 'auto' }} />
        {mic && micState !== 'running' && (
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={startMic}>
            {micState === 'error' ? t('session.retryMic') : t('session.startListening')}
          </button>
        )}
        {mic && micState === 'running' && (
          <span className={styles.status} role="status">
            {t('session.micOn')}
          </span>
        )}
        <button type="button" className={styles.button} onClick={() => runner.finish()}>
          {t('session.end')}
        </button>
      </div>
      <p className={styles.muted}>{rationaleOf(drill.id)}</p>
      <View
        prompt={state.prompt}
        feedback={fb}
        guideLevel={settings.guideLevel}
        handedness={settings.handedness}
        tuning={getTuning(settings.tuning)}
        onTap={onTap}
        listening={state.phase === 'listening'}
        pending={
          state.pending
            ? { heard: state.pending.heard, confidence: state.pending.confidence }
            : null
        }
        collected={state.collected}
        onConfirm={(accept) => runner.confirm(accept)}
        onReplay={() => void runner.replay()}
      />
      {fb && (
        <div className={styles.status} role="status">
          {fb.check.correct ? (
            <span className={styles.ok}>{t('session.right', { expected: fb.check.expected })}</span>
          ) : (
            <span className={styles.bad}>
              {t('session.wrong', { expected: fb.check.expected, given: fb.check.given })}
            </span>
          )}
          {!fb.check.correct && !c4Active && (
            <button
              type="button"
              className={styles.button}
              style={{ marginLeft: '1rem' }}
              onClick={() => void runner.advance()}
            >
              {t('session.next')}
            </button>
          )}
        </div>
      )}
      {fb && c4Active && state.key && (
        <C4Panel
          key={state.index}
          musicalKey={state.key}
          call={(state.prompt as B4Prompt).midis}
          tuning={getTuning(settings.tuning)}
          handedness={settings.handedness}
          guideLevel={settings.guideLevel}
          accidentalPref={settings.accidentalPref}
          labelScheme={settings.labelScheme}
          mic={mic && micState === 'running' ? mic : null}
          onTake={(midis, mode, responseMs) =>
            void app.repo.logTrial(
              c4Trial({
                sessionId,
                key: state.key!,
                midis,
                mode,
                at: new Date(),
                responseMs,
                experimentArm: settings.experimentArm,
                schedule: scheduleRef.current,
              }),
            )
          }
          onNext={() => void runner.advance()}
          onSkip={() => void runner.advance()}
        />
      )}
    </div>
  );
}
