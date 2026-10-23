import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createScheduler } from '../vendor/fretfree/engine/scheduler';
import { STANDARD_TUNING, keyName } from '../vendor/fretfree/theory';
import { playScript, stopScript } from '../audio/player';
import { useApp } from '../core/app-context';
import { newId } from '../core/events/ids';
import { practisedKeys, unseenKeys } from '../core/keys';
import {
  planSession,
  sessionShape,
  shuffle,
  warmUpFirst,
  type PlanEntry,
  type SessionShape,
} from '../core/scheduling/plan';
import { placementOutcome, placementPlan, seedKnownCards } from '../core/scheduling/placement';
import { RETEST_TRIALS, planRetests } from '../core/scheduling/retests';
import { createSessionRunner, type SessionRunner } from '../core/session/runner';
import { useSettings } from '../core/settings-store';
import type { InputAdapter, InputEvent, RetestRecord, SessionPurpose } from '../core/types';
import { drillForItem, modeOfItem, SKILLS, skillById } from '../drills/registry';
import styles from '../styles/app.module.css';

export interface SessionOptions {
  minutes: number;
  skillIds: readonly string[];
  /** Default practice. A placement or a retest measures only. */
  purpose?: SessionPurpose;
  /** The retest being run, when `purpose` is `retest`. */
  retest?: RetestRecord;
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
  const app = useApp();
  const settings = useSettings(app.settings);
  const [runner, setRunner] = useState<SessionRunner | null>(null);
  const [shape, setShape] = useState<SessionShape | null>(null);
  const [goalSeen, setGoalSeen] = useState(false);
  const [reflection, setReflection] = useState('');
  const savedRef = useRef(false);
  const reflectionRef = useRef('');
  const mic: InputAdapter | null = settings.micEnabled && runner ? app.mic() : null;
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
      const skills = SKILLS.filter((s) => options.skillIds.includes(s.id));
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
          }),
        );
      }
      const r = createSessionRunner({
        sessionId,
        plan,
        drillFor: drillForItem,
        keyPoolFor: (item) =>
          purpose === 'retest' ? unseenKeys(modeOfItem(item)) : practisedKeys(modeOfItem(item)),
        cards,
        scheduler,
        repo: app.repo,
        settings: app.settings.get(),
        play: (steps) => playScript(steps),
        wait: sleep,
        now: () => new Date(),
        clock: () => performance.now(),
        rng: Math.random,
        tuning: STANDARD_TUNING,
        purpose,
        retest: options.retest?.delay ?? 'none',
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
      const titleOf = (id: string) => {
        try {
          return skillById(id).title;
        } catch {
          return id;
        }
      };
      const sh = purpose === 'practice' ? sessionShape(plan, options.minutes, titleOf) : null;
      setShape(sh);
      setRunner(r);
      // A practice session states its goal first and starts on the learner's tap.
      if (!sh) void r.start();
    })();
    return () => {
      cancelled = true;
      stopScript();
    };
  }, [app, options, sessionId, startedAt]);

  // Route mic events into the runner while the session runs.
  useEffect(() => {
    if (!runner || !mic) return;
    const off = mic.onEvent((e) => runner.input(e));
    return () => {
      off();
      mic.stop();
    };
  }, [runner, mic]);

  // Move on by itself after a correct answer; a miss waits for the learner.
  const state = runner?.state;
  useEffect(() => {
    if (!runner || state?.phase !== 'feedback' || !state.feedback?.check.correct) return;
    const t = setTimeout(() => void runner.advance(), 1400);
    return () => clearTimeout(t);
  }, [runner, state?.phase, state?.feedback, state?.index]);

  if (!runner || !state) return <p className={styles.muted}>Preparing your session…</p>;

  if (shape && !goalSeen) {
    return (
      <div className={styles.card} role="region" aria-label="Session goal">
        <h2>This session</h2>
        <p>{shape.goal}</p>
        <p className={styles.muted}>
          Reviews first, because retrieval before new material warms the ear; then one new thing;
          then music. Keys change every trial on purpose: it feels harder and holds better.
        </p>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => {
              setGoalSeen(true);
              void runner.start();
            }}
          >
            Begin
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
            ? 'Placement done'
            : options.purpose === 'retest'
              ? `Retest done (${options.retest?.delay ?? ''})`
              : 'Session done'}
        </h2>
        <p>
          <span className={styles.big}>{acc === null ? '—' : `${acc}%`}</span>{' '}
          <span className={styles.muted}>
            over {state.trials} trials. Today's score is the least telling number: what counts is
            the retest in a week, in a key you have not practised.
          </span>
        </p>
        {Object.keys(state.byKey).length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Key</th>
                <th>Trials</th>
                <th>Right</th>
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
        )}
        <label>
          <span className={styles.muted}>
            Thirty seconds: what was hard, and what will you try next time?
          </span>
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
            Save and finish
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
              Save, then {shape.playAlong.minutes} minutes over a loop
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
          Trial {state.index + 1} of {state.total}
          {state.key ? ` · ${keyName(state.key)}` : ''}
        </span>
        <span style={{ marginLeft: 'auto' }} />
        {settings.micEnabled && micState !== 'running' && (
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={startMic}>
            {micState === 'error' ? 'Retry microphone' : 'Start listening'}
          </button>
        )}
        {settings.micEnabled && micState === 'running' && (
          <span className={styles.status} role="status">
            Mic on
          </span>
        )}
        <button type="button" className={styles.button} onClick={() => runner.finish()}>
          End session
        </button>
      </div>
      <p className={styles.muted}>{drill.rationale}</p>
      <View
        prompt={state.prompt}
        feedback={fb}
        guideLevel={settings.guideLevel}
        handedness={settings.handedness}
        tuning={STANDARD_TUNING}
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
            <span className={styles.ok}>Right: {fb.check.expected}.</span>
          ) : (
            <span className={styles.bad}>
              That was {fb.check.expected}. You gave {fb.check.given}.
            </span>
          )}
          {!fb.check.correct && (
            <button
              type="button"
              className={styles.button}
              style={{ marginLeft: '1rem' }}
              onClick={() => void runner.advance()}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
