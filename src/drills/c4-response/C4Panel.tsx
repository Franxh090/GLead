import { useEffect, useRef, useState } from 'react';
import type { GuideLevel, Handedness } from '../../vendor/fretfree/engine/model';
import {
  keyName,
  midiAt,
  type AccidentalPref,
  type MusicalKey,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { playScript } from '../../audio/player';
import { noteName } from '../../audio/voicing';
import { useT } from '../../core/i18n';
import type { AnswerMode, InputAdapter, InputEvent, LabelScheme } from '../../core/types';
import styles from '../../styles/app.module.css';
import { B4_TIMING } from '../b4-find-melody/logic';
import { AnswerNeck } from '../shared/parts';
import {
  C4_MAX_NOTES,
  C4_REGION,
  C4_SILENCE_MS,
  analyseResponse,
  bridgeDegrees,
  c4DegreeLabels,
  c4Markers,
  c4Verdict,
} from './logic';

type Phase = 'offer' | 'call' | 'listening' | 'done';

/**
 * The response half of C4: shown under a B4 melody's feedback. The call
 * (the melody just copied) plays once more, then the learner answers with a
 * phrase of their own, through the mic or by tapping the neck, up to eight
 * notes or until a pause. The take is logged, never graded.
 */
export function C4Panel({
  musicalKey,
  call,
  tuning,
  handedness,
  guideLevel,
  accidentalPref,
  labelScheme,
  mic,
  onTake,
  onNext,
  onSkip,
}: {
  musicalKey: MusicalKey;
  /** The melody that was the call, as MIDI. */
  call: readonly number[];
  tuning: Tuning;
  handedness: Handedness;
  guideLevel: GuideLevel;
  accidentalPref: AccidentalPref;
  labelScheme: LabelScheme;
  mic: InputAdapter | null;
  /** Fires once when the answer is complete. */
  onTake(midis: number[], mode: AnswerMode, responseMs: number): void;
  onNext(): void;
  onSkip(): void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('offer');
  const [midis, setMidis] = useState<number[]>([]);
  const listenFrom = useRef(0);
  const muted = useRef(false);
  const playedAny = useRef(false);
  const notesRef = useRef<number[]>([]);
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (silence.current) clearTimeout(silence.current);
    const notes = notesRef.current;
    setPhase('done');
    if (notes.length === 0) {
      onSkip();
      return;
    }
    onTake(
      notes,
      playedAny.current ? 'play' : 'tap',
      Math.max(0, Math.round(performance.now() - listenFrom.current)),
    );
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  const playCall = () =>
    playScript([
      {
        type: 'notes',
        notes: call.map((m) => noteName(m, accidentalPref)),
        gapS: B4_TIMING.noteGapS,
        durationS: B4_TIMING.noteS,
      },
    ]);

  const begin = async () => {
    setPhase('call');
    await playCall();
    listenFrom.current = performance.now();
    setPhase('listening');
  };

  const hearCall = async () => {
    muted.current = true;
    await playCall();
    muted.current = false;
    listenFrom.current = performance.now();
  };

  const addNote = (midi: number, fromMic: boolean) => {
    if (finished.current || muted.current) return;
    if (fromMic) playedAny.current = true;
    const next = [...notesRef.current, midi];
    notesRef.current = next;
    setMidis(next);
    if (silence.current) clearTimeout(silence.current);
    if (next.length >= C4_MAX_NOTES) {
      finishRef.current();
      return;
    }
    silence.current = setTimeout(() => finishRef.current(), C4_SILENCE_MS);
  };

  useEffect(() => {
    if (!mic || phase !== 'listening') return;
    const off = mic.onEvent((e: InputEvent) => {
      if (e.midi === undefined || e.at < listenFrom.current) return;
      addNote(e.midi, true);
    });
    return off;
  }, [mic, phase]);
  useEffect(
    () => () => {
      if (silence.current) clearTimeout(silence.current);
    },
    [],
  );

  const keyText = keyName(musicalKey);
  const analysis = analyseResponse(musicalKey, midis);
  const verdict = c4Verdict(analysis);
  const degrees = c4DegreeLabels(musicalKey, analysis.degrees, labelScheme);
  const bridge = c4DegreeLabels(musicalKey, bridgeDegrees(musicalKey.mode), labelScheme);

  return (
    <section className={styles.card} aria-label={t('c4.title')}>
      <h3>{t('c4.title')}</h3>
      {phase === 'offer' && (
        <>
          <p>{t('c4.offer', { key: keyText, n: C4_MAX_NOTES })}</p>
          <p className={styles.muted}>{t('c4.rationale')}</p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => void begin()}
            >
              {t('c4.answer')}
            </button>
            <button type="button" className={styles.button} onClick={onSkip}>
              {t('c4.skip')}
            </button>
          </div>
        </>
      )}
      {phase === 'call' && (
        <p className={styles.status} role="status">
          {t('c4.call')}
        </p>
      )}
      {phase === 'listening' && (
        <div className={styles.row}>
          <span className={styles.status} role="status">
            {t('c4.listening', { n: midis.length, max: C4_MAX_NOTES })}
          </span>
          <button type="button" className={styles.button} onClick={() => void hearCall()}>
            {t('c4.hearCall')}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => finish()}
          >
            {t('c4.done')}
          </button>
        </div>
      )}
      {phase === 'done' && midis.length > 0 && (
        <>
          <p className={styles.status} role="status">
            {verdict === 'strays'
              ? t('c4.strays', { out: analysis.outOfKey, n: midis.length, key: keyText, degrees })
              : verdict === 'pentatonic'
                ? t('c4.pentatonic', { n: midis.length, degrees, bridge })
                : t('c4.inKey', { n: midis.length, degrees })}{' '}
            {analysis.landedHome ? t('c4.home') : t('c4.notHome')}
          </p>
          <div className={styles.row}>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onNext}>
              {t('c4.next')}
            </button>
          </div>
        </>
      )}
      {phase !== 'offer' && (
        <AnswerNeck
          tuning={tuning}
          region={C4_REGION}
          handedness={handedness}
          markers={
            phase === 'done'
              ? c4Markers(musicalKey, midis, tuning, accidentalPref, labelScheme)
              : []
          }
          guideLevel={guideLevel}
          answered={phase === 'done'}
          canAnswer={phase === 'listening'}
          accidentalPref={accidentalPref}
          onTap={(e: InputEvent) => {
            if (e.position) addNote(midiAt(e.position, tuning), false);
          }}
          label={t('c4.neck')}
        />
      )}
    </section>
  );
}
