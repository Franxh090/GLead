import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Fretboard, type FretMarker } from '../vendor/fretfree/fretboard/Fretboard';
import {
  chordTones,
  keyLabel,
  keyName,
  midiAt,
  parseKey,
  positionsOfPitchClass,
  progressionChords,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { createBackingLoop } from '../audio/backing-loop';
import { LOOP_PROGRESSIONS, LOOP_TEMPOS, loopProgression } from '../audio/loops';
import { useApp } from '../core/app-context';
import { useT } from '../core/i18n';
import { newId } from '../core/events/ids';
import { isUnseenKey, unseenKeys, pick } from '../core/keys';
import {
  RUNGS,
  createChangeScorer,
  hitRate,
  rungTones,
  type ChangeRecord,
  type Rung,
} from '../core/scoring/changes';
import { targetsByDefault } from '../core/metrics';
import { useSettings } from '../core/settings-store';
import type { BackingLoop, InputAdapter, TrialEvent } from '../core/types';
import { TONE_NAMES, type ChordTone } from '../drills/b3-chord-tone/logic';
import styles from '../styles/app.module.css';
import { getTuning } from '../core/tunings';

const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
const TONE_STYLE: Record<string, FretMarker['style']> = {
  '1': 'root',
  '3': 'third',
  '5': 'fifth',
  '7': 'seventh',
};
const PASSES = [1, 2, 4] as const;

export const CHANGES_DRILL_ID = 'c1-changes';

type TakeState = 'idle' | 'playing' | 'done';

/**
 * Play into the gaps (PRD C1, C2): a loop plays; at every change the first
 * note the mic hears (or a neck tap, without the mic) is judged against the
 * ladder rung. The targets show on the neck until you ask them not to. After
 * the take, a hit map per change, and every change goes into the trial log.
 */
export interface ChangesPreset {
  minutes: number;
  skillIds: readonly string[];
}

/** The rung a session's skills point at: chord tones once B3 is in play, roots before. */
export function rungForSkills(skillIds: readonly string[]): Rung {
  if (skillIds.some((s) => s.startsWith('B3.sevenths'))) return 'fifths-sevenths';
  if (skillIds.some((s) => s.startsWith('B3'))) return 'thirds';
  return 'roots';
}

export function ChangesScreen({ preset = null }: { preset?: ChangesPreset | null }) {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const tuning = getTuning(settings.tuning);
  const [progressionId, setProgressionId] = useState(LOOP_PROGRESSIONS[0]!.id);
  const [tonic, setTonic] = useState<Record<'major' | 'minor', string>>({
    major: 'G',
    minor: 'Am',
  });
  const [surprise, setSurprise] = useState(false);
  const [bpm, setBpm] = useState<number>(80);
  const [rung, setRung] = useState<Rung>(preset ? rungForSkills(preset.skillIds) : 'roots');
  const [passes, setPasses] = useState<number>(preset ? (preset.minutes >= 4 ? 4 : 2) : 2);
  const [showTargets, setShowTargets] = useState(true);
  const [targetsTouched, setTargetsTouched] = useState(false);
  const [history, setHistory] = useState<TrialEvent[] | null>(null);
  const [take, setTake] = useState<TakeState>('idle');
  const [current, setCurrent] = useState<number | null>(null);
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [takeKey, setTakeKey] = useState<MusicalKey | null>(null);
  const loopRef = useRef<BackingLoop | null>(null);
  const scorerRef = useRef<ReturnType<typeof createChangeScorer> | null>(null);
  const passRef = useRef(0);

  const progression = loopProgression(progressionId);
  const chosenKey = useMemo(() => parseKey(tonic[progression.mode]), [tonic, progression.mode]);
  const key = takeKey ?? chosenKey;
  const chords = useMemo(() => progressionChords(key, progression.numerals), [key, progression]);

  const mic: InputAdapter | null = settings.micEnabled ? app.mic() : null;
  const micState = useSyncExternalStore(
    (cb) => (mic ? mic.onStateChange(cb) : () => undefined),
    () => mic?.state ?? 'idle',
    () => 'idle',
  );

  const finish = () => {
    loopRef.current?.stop();
    loopRef.current = null;
    const result = scorerRef.current?.result() ?? [];
    setRecords(result);
    setCurrent(null);
    setTake(result.length > 0 ? 'done' : 'idle');
    if (result.length > 0) void logTake(result);
  };

  const logTake = async (result: ChangeRecord[]) => {
    const sessionId = newId('take');
    const now = new Date();
    const events: TrialEvent[] = result.map((r) => ({
      trialId: newId('t'),
      sessionId,
      at: now,
      drillId: CHANGES_DRILL_ID,
      itemId: `changes:${rung}@${progressionId}`,
      skillId: 'C1.ladder',
      key: keyLabel(key),
      mode: mic && micState === 'running' ? 'play' : 'tap',
      correct: r.outcome === 'hit',
      expected: r.wanted.map((t) => TONE_NAMES[t]).join(' or '),
      given: r.tone
        ? TONE_NAMES[r.tone as ChordTone]
        : r.outcome === 'silent'
          ? 'nothing'
          : 'not a chord tone',
      responseMs: r.offsetMs ?? 0,
      confidence: 1,
      rating: r.outcome === 'hit' ? 3 : 1,
      imagineFirst: false,
      feedbackVariant: targetsOn ? 'full' : 'faded',
      experimentArm: settings.experimentArm,
      retest: 'none',
      unseenKey: isUnseenKey(key),
      purpose: 'practice',
    }));
    for (const e of events) await app.repo.logTrial(e);
    await app.repo.saveSession({
      sessionId,
      startedAt: now,
      endedAt: new Date(),
      minutes: 0,
      trials: events.length,
      correct: events.filter((e) => e.correct).length,
      reflection: '',
      kind: 'practice',
    });
  };

  const start = async () => {
    loopRef.current?.stop();
    const k = surprise
      ? (() => {
          const pool = unseenKeys(progression.mode);
          return pool[pick(pool.length, Math.random)] as MusicalKey;
        })()
      : chosenKey;
    setTakeKey(k);
    const loopChords = progressionChords(k, progression.numerals);
    const scorer = createChangeScorer({ chords: loopChords, rung, bpm });
    scorer.start();
    scorerRef.current = scorer;
    passRef.current = -1;
    setRecords([]);
    setNotice(null);
    const loop = createBackingLoop(
      { key: k, progressionId, bpm, feel: 'once' },
      settings.accidentalPref,
    );
    loopRef.current = loop;
    let started: boolean;
    try {
      ({ started } = await loop.start({
        onChord: (i) => {
          if (loopRef.current !== loop) return;
          if (i === 0) passRef.current += 1;
          if (passRef.current >= passes) {
            finish();
            return;
          }
          scorer.onChord(i, performance.now());
          setCurrent(i);
        },
      }));
    } catch (err) {
      setNotice(t('loops.failed', { error: err instanceof Error ? err.message : String(err) }));
      return;
    }
    if (loopRef.current !== loop) return;
    if (!started) {
      setNotice(t('changes.noStart'));
      return;
    }
    setTake('playing');
  };

  // Targets hide by themselves once two takes on this rung landed 80% (PRD C1).
  useEffect(() => {
    void app.repo.trials().then(setHistory);
  }, [app, take]);
  const suggestedTargets = history ? targetsByDefault(history, rung) : true;
  const targetsOn = targetsTouched ? showTargets : suggestedTargets;

  // Mic notes go to the scorer while a take runs.
  useEffect(() => {
    if (!mic || take !== 'playing') return;
    return mic.onEvent((e) => {
      if (e.midi !== undefined) scorerRef.current?.onNote(e.midi, e.at);
    });
  }, [mic, take]);
  useEffect(() => () => loopRef.current?.stop(), []);

  const sounding = current !== null ? chords[current] : null;
  const markers: FretMarker[] = [];
  if (take === 'playing' && sounding && targetsOn) {
    const wanted = rungTones(rung, sounding);
    const tones = chordTones(sounding);
    for (const t of wanted) {
      const pc = tones[['1', '3', '5', '7'].indexOf(t)];
      if (!pc) continue;
      for (const p of positionsOfPitchClass(pc, { fretRange: { from: 0, to: 12 }, tuning })) {
        markers.push({
          ...p,
          style: TONE_STYLE[t] ?? 'tone',
          label: displayPc(pc),
          forceLabel: true,
        });
      }
    }
  }

  const keys = progression.mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  const rate = hitRate(records);

  return (
    <div className={styles.card}>
      <h2>{t('changes.title')}</h2>
      {preset && (
        <p className={styles.status} role="status">
          {t('changes.preset', { passes, rung: t(`rung.${rung}.title`).toLowerCase() })}
        </p>
      )}
      <p className={styles.muted}>{t('rationale.c1-changes')}</p>
      {take !== 'playing' && (
        <>
          <div className={styles.field}>
            <span>{t('loops.progression')}</span>
            <select
              aria-label={t('loops.progression')}
              value={progressionId}
              onChange={(e) => setProgressionId(e.target.value)}
              className={styles.button}
            >
              {LOOP_PROGRESSIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <span>{t('loops.key')}</span>
            <div className={styles.row}>
              <select
                aria-label={t('loops.key')}
                value={tonic[progression.mode]}
                disabled={surprise}
                onChange={(e) => setTonic({ ...tonic, [progression.mode]: e.target.value })}
                className={styles.button}
              >
                {keys.map((k) => (
                  <option key={k} value={k}>
                    {keyName(parseKey(k))}
                  </option>
                ))}
              </select>
              <button
                type="button"
                role="switch"
                aria-checked={surprise}
                aria-label={t('changes.surpriseAria')}
                className={`${styles.button} ${surprise ? styles.primary : ''}`}
                onClick={() => setSurprise(!surprise)}
              >
                {t('changes.surprise')}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <span>{t('loops.tempo')}</span>
            <div className={styles.row} role="group" aria-label={t('loops.tempo')}>
              {LOOP_TEMPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.button} ${bpm === t ? styles.primary : ''}`}
                  aria-pressed={bpm === t}
                  onClick={() => setBpm(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span>{t('changes.rung')}</span>
            <div className={styles.row} role="group" aria-label={t('changes.rung')}>
              {RUNGS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.button} ${rung === r.id ? styles.primary : ''}`}
                  aria-pressed={rung === r.id}
                  onClick={() => setRung(r.id)}
                >
                  {t(`rung.${r.id}.title`)}
                </button>
              ))}
            </div>
          </div>
          <p className={styles.muted}>{t(`rung.${rung}.hint`)}</p>
          <div className={styles.field}>
            <span>{t('changes.passes')}</span>
            <div className={styles.row} role="group" aria-label={t('changes.passes')}>
              {PASSES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.button} ${passes === n ? styles.primary : ''}`}
                  aria-pressed={passes === n}
                  onClick={() => setPasses(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span>{t('changes.showTargets')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={targetsOn}
              aria-label={t('changes.showTargets')}
              className={`${styles.button} ${targetsOn ? styles.primary : ''}`}
              onClick={() => {
                setTargetsTouched(true);
                setShowTargets(!targetsOn);
              }}
            >
              {targetsOn ? t('settings.on') : t('settings.off')}
              {!targetsTouched && !suggestedTargets ? t('changes.hiddenNote') : ''}
            </button>
          </div>
        </>
      )}
      <div className={styles.row}>
        {take !== 'playing' ? (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => void start()}
          >
            {t('changes.start')}
          </button>
        ) : (
          <button type="button" className={styles.button} onClick={finish}>
            {t('loops.stop')}
          </button>
        )}
        {mic && micState !== 'running' && (
          <button
            type="button"
            className={styles.button}
            onClick={() => void mic.start().catch(() => undefined)}
          >
            {micState === 'error' ? t('session.retryMic') : t('session.startListening')}
          </button>
        )}
        {mic && micState === 'running' && (
          <span className={styles.status} role="status">
            {t('session.micOn')}
          </span>
        )}
        {!mic && <span className={styles.muted}>{t('changes.micOff')}</span>}
        {notice && (
          <span className={styles.status} role="status">
            {notice}
          </span>
        )}
      </div>
      {take === 'playing' && (
        <div className={styles.row} role="list" aria-label={t('loops.chords')}>
          {chords.map((c, i) => (
            <span
              key={`${c.symbol}-${i}`}
              role="listitem"
              className={styles.status}
              aria-current={current === i ? 'true' : undefined}
              style={current === i ? { outline: '2px solid var(--accent)' } : undefined}
            >
              <strong>{displayPc(c.symbol)}</strong> <span className={styles.muted}>{c.roman}</span>
            </span>
          ))}
        </div>
      )}
      <div className={styles.neck}>
        <Fretboard
          tuning={tuning}
          fretRange={{ from: 0, to: 12 }}
          handedness={settings.handedness}
          markers={markers}
          guideLevel={3}
          revealNotes
          accidentalPref={settings.accidentalPref}
          onTapCell={
            take === 'playing'
              ? (p) => scorerRef.current?.onNote(midiAt(p, tuning), performance.now())
              : undefined
          }
          label={t('changes.neck')}
        />
      </div>
      {take === 'done' && (
        <div className={styles.card} aria-label={t('changes.takeResult')}>
          <h3>
            {t('changes.takeTitle', {
              pct: rate === null ? '—' : `${Math.round(rate * 100)}%`,
            })}
          </h3>
          <p className={styles.muted}>
            {keyName(key)}
            {isUnseenKey(key) ? t('changes.unseen') : ''} · {t(`rung.${rung}.title`)}
          </p>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('changes.colChange')}</th>
                  <th>{t('changes.colChord')}</th>
                  <th>{t('changes.colWanted')}</th>
                  <th>{t('changes.colPlayed')}</th>
                  <th>{t('changes.colTiming')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.bar}>
                    <td>{r.bar}</td>
                    <td>{displayPc(r.chord)}</td>
                    <td>{r.wanted.map((w) => t(`tone.${TONE_NAMES[w]}`)).join(' / ')}</td>
                    <td className={r.outcome === 'hit' ? styles.ok : styles.bad}>
                      {r.outcome === 'silent'
                        ? t('changes.nothing')
                        : r.tone
                          ? t(`tone.${TONE_NAMES[r.tone as ChordTone]}`)
                          : t('changes.notTone')}
                    </td>
                    <td className={styles.muted}>
                      {r.offsetMs === null
                        ? '—'
                        : `${r.offsetMs > 0 ? '+' : ''}${Math.round(r.offsetMs)} ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
