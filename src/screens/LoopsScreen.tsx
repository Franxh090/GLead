import { useEffect, useMemo, useRef, useState } from 'react';
import { Fretboard, type FretMarker } from '../vendor/fretfree/fretboard/Fretboard';
import {
  chordTones,
  keyName,
  parseKey,
  positionsOfPitchClass,
  progressionChords,
  type KeyMode,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { createBackingLoop } from '../audio/backing-loop';
import { LOOP_FEELS, LOOP_PROGRESSIONS, LOOP_TEMPOS, loopProgression } from '../audio/loops';
import { useApp } from '../core/app-context';
import { useT } from '../core/i18n';
import { useSettings } from '../core/settings-store';
import type { BackingLoop, BackingLoopSpec } from '../core/types';
import styles from '../styles/app.module.css';
import { getTuning } from '../core/tunings';

const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

const TONE_STYLE: Record<number, FretMarker['style']> = {
  0: 'root',
  1: 'third',
  2: 'fifth',
  3: 'seventh',
};

/**
 * Backing loops (PRD A3, C3): any of the catalogue progressions in any key,
 * at a tempo and feel, with the sounding chord's tones on the neck. Scoring
 * what you play over it is Sprint 3 (C1, C2).
 */
export function LoopsScreen() {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const tuning = getTuning(settings.tuning);
  const [progressionId, setProgressionId] = useState(LOOP_PROGRESSIONS[0]!.id);
  const [tonic, setTonic] = useState<Record<KeyMode, string>>({ major: 'G', minor: 'Am' });
  const [bpm, setBpm] = useState<number>(80);
  const [feel, setFeel] = useState<BackingLoopSpec['feel']>('once');
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const loopRef = useRef<BackingLoop | null>(null);

  const progression = loopProgression(progressionId);
  const key: MusicalKey = useMemo(
    () => parseKey(tonic[progression.mode]),
    [tonic, progression.mode],
  );
  const chords = useMemo(() => progressionChords(key, progression.numerals), [key, progression]);

  const stop = () => {
    loopRef.current?.stop();
    loopRef.current = null;
    setPlaying(false);
    setCurrent(null);
  };

  const start = async () => {
    stop();
    const loop = createBackingLoop({ key, progressionId, bpm, feel }, settings.accidentalPref);
    loopRef.current = loop;
    setNotice(null);
    let started: boolean;
    try {
      ({ started } = await loop.start({ onChord: (i) => setCurrent(i) }));
    } catch (err) {
      setNotice(t('loops.failed', { error: err instanceof Error ? err.message : String(err) }));
      return;
    }
    if (loopRef.current !== loop) return;
    setPlaying(started);
    if (!started) setNotice(t('loops.noStart'));
  };

  useEffect(() => () => loopRef.current?.stop(), []);
  // A change of chart stops the old loop; the learner starts the new one.
  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      stop();
      set(v);
    };

  const sounding = current !== null ? chords[current] : null;
  const markers: FretMarker[] = sounding
    ? chordTones(sounding).flatMap((pc, i) =>
        positionsOfPitchClass(pc, { fretRange: { from: 0, to: 12 }, tuning }).map((p) => ({
          ...p,
          style: TONE_STYLE[i] ?? 'tone',
          label: displayPc(pc),
          forceLabel: true,
        })),
      )
    : [];

  const keys = progression.mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;

  return (
    <div className={styles.card}>
      <h2>{t('loops.title')}</h2>
      <p className={styles.muted}>{t('loops.blurb')}</p>
      <div className={styles.field}>
        <span>{t('loops.progression')}</span>
        <select
          aria-label={t('loops.progression')}
          value={progressionId}
          onChange={(e) => change(setProgressionId)(e.target.value)}
          className={styles.button}
        >
          {LOOP_PROGRESSIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.muted}>{t(`loop.${progression.id}.desc`)}</p>
      <div className={styles.field}>
        <span>{t('loops.key')}</span>
        <select
          aria-label={t('loops.key')}
          value={tonic[progression.mode]}
          onChange={(e) => change(setTonic)({ ...tonic, [progression.mode]: e.target.value })}
          className={styles.button}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {keyName(parseKey(k))}
            </option>
          ))}
        </select>
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
              onClick={() => change(setBpm)(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('loops.feel')}</span>
        <div className={styles.row} role="group" aria-label={t('loops.feel')}>
          {LOOP_FEELS.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.button} ${feel === f ? styles.primary : ''}`}
              aria-pressed={feel === f}
              onClick={() => change(setFeel)(f)}
            >
              {t(`feel.${f}`)}
            </button>
          ))}
        </div>
      </div>
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
      <div className={styles.row}>
        {!playing ? (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => void start()}
          >
            {t('loops.play')}
          </button>
        ) : (
          <button type="button" className={styles.button} onClick={stop}>
            {t('loops.stop')}
          </button>
        )}
        <span className={styles.muted}>
          {keyName(key)} · {bpm} bpm
        </span>
        {notice && (
          <span className={styles.status} role="status">
            {notice}
          </span>
        )}
      </div>
      <div className={styles.neck}>
        <Fretboard
          tuning={tuning}
          fretRange={{ from: 0, to: 12 }}
          handedness={settings.handedness}
          markers={markers}
          guideLevel={3}
          revealNotes
          accidentalPref={settings.accidentalPref}
          label={t('loops.neck')}
        />
      </div>
    </div>
  );
}
