import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { keyName, midiAt, type MusicalKey } from '../vendor/fretfree/theory';
import { playScript, stopScript } from '../audio/player';
import { useApp } from '../core/app-context';
import { newId } from '../core/events/ids';
import { useT } from '../core/i18n';
import { pick, practisedKeys } from '../core/keys';
import { useSettings } from '../core/settings-store';
import { getTuning } from '../core/tunings';
import type { Check, InputAdapter, InputEvent, TrialEvent } from '../core/types';
import { B9_POOLS } from '../drills/b9-progression/logic';
import { AnswerNeck, ChoiceGrid } from '../drills/shared/parts';
import { SONGS, songById, type Song } from '../songs/catalogue';
import {
  checkChords,
  checkMelody,
  chordsAudio,
  learnedPhrases,
  melodyAudio,
  numeralOfPitch,
  phraseMidis,
  phraseNumerals,
  songTrial,
  wholeSongAudio,
  type SongPart,
} from '../songs/logic';
import styles from '../styles/app.module.css';

type Phase = 'idle' | 'playing' | 'listening' | 'feedback';
const REGION = { from: 0, to: 12 };

function randomKey(song: Song, not: MusicalKey | null, rng: () => number): MusicalKey {
  const pool = practisedKeys(song.mode).filter((k) => !not || k.tonic !== not.tonic);
  return pool[pick(pool.length, rng)] as MusicalKey;
}

/**
 * Songs by ear (curriculum level 6): pick a tune, learn it phrase by phrase
 * in a key the app chose. Hear the melody and play it back; hear the chords
 * and name them. Every attempt is logged; learned phrases are read back from
 * the log.
 */
export function SongsScreen() {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const tuning = getTuning(settings.tuning);
  const [trials, setTrials] = useState<TrialEvent[]>([]);
  const [songId, setSongId] = useState<string | null>(null);
  const [key, setKey] = useState<MusicalKey | null>(null);
  const [phrase, setPhrase] = useState(0);
  const [part, setPart] = useState<SongPart>('melody');
  const [phase, setPhase] = useState<Phase>('idle');
  const [notes, setNotes] = useState<number[]>([]);
  const [named, setNamed] = useState<string[]>([]);
  const [result, setResult] = useState<(Check & { right: number }) | null>(null);
  const [finished, setFinished] = useState(false);
  const listenFrom = useRef(0);
  const fromMic = useRef(false);
  // Mic events arrive faster than React re-renders, so the answer so far lives in refs.
  const notesRef = useRef<number[]>([]);
  const namedRef = useRef<string[]>([]);
  const sessionId = useMemo(() => newId('song'), []);
  const mic: InputAdapter | null = settings.micEnabled ? app.mic() : null;
  const micState = useSyncExternalStore(
    (cb) => (mic ? mic.onStateChange(cb) : () => undefined),
    () => mic?.state ?? 'idle',
    () => 'idle',
  );

  useEffect(() => {
    void app.repo.trials().then(setTrials);
  }, [app]);
  useEffect(() => () => stopScript(), []);

  const song = songId ? songById(songId) : null;
  const current = song ? song.phrases[phrase] : undefined;
  const expectedMidis = useMemo(
    () => (current && key ? phraseMidis(current, key) : []),
    [current, key],
  );
  const expectedNumerals = current ? phraseNumerals(current) : [];
  const total = part === 'melody' ? expectedMidis.length : expectedNumerals.length;

  const hear = async (replayOnly = false) => {
    if (!song || !current || !key) return;
    setPhase('playing');
    notesRef.current = [];
    namedRef.current = [];
    setNotes([]);
    setNamed([]);
    fromMic.current = false;
    const steps =
      part === 'melody'
        ? melodyAudio(song, current, key, settings.accidentalPref)
        : chordsAudio(song, current, key, settings.accidentalPref);
    await playScript(replayOnly && part === 'melody' ? steps.slice(2) : steps);
    listenFrom.current = performance.now();
    setPhase('listening');
  };

  const grade = (midis: number[], numerals: string[]) => {
    if (!song || !key) return;
    const check =
      part === 'melody'
        ? checkMelody(expectedMidis, midis, settings.accidentalPref)
        : checkChords(expectedNumerals, numerals);
    setResult(check);
    setPhase('feedback');
    const trial = songTrial({
      sessionId,
      songId: song.id,
      phrase,
      part,
      key,
      check,
      mode: fromMic.current ? 'play' : 'tap',
      at: new Date(),
      responseMs: Math.max(0, Math.round(performance.now() - listenFrom.current)),
      experimentArm: settings.experimentArm,
    });
    void app.repo.logTrial(trial);
    setTrials((ts) => [...ts, trial]);
    if (!check.correct && current && part === 'melody') {
      void playScript(melodyAudio(song, current, key, settings.accidentalPref).slice(2));
    }
  };

  const addNote = (midi: number, viaMic: boolean) => {
    if (phase !== 'listening') return;
    if (viaMic) fromMic.current = true;
    if (part === 'melody') {
      if (notesRef.current.length >= expectedMidis.length) return;
      const next = [...notesRef.current, midi];
      notesRef.current = next;
      setNotes(next);
      if (next.length >= expectedMidis.length) grade(next, []);
    } else if (key) {
      addNumeral(numeralOfPitch(key, midi), viaMic);
    }
  };
  const addNumeral = (numeral: string, viaMic: boolean) => {
    if (phase !== 'listening') return;
    if (viaMic) fromMic.current = true;
    if (namedRef.current.length >= expectedNumerals.length) return;
    const next = [...namedRef.current, numeral];
    namedRef.current = next;
    setNamed(next);
    if (next.length >= expectedNumerals.length) grade([], next);
  };
  const addNoteRef = useRef(addNote);
  useEffect(() => {
    addNoteRef.current = addNote;
  });

  useEffect(() => {
    if (!mic || phase !== 'listening') return;
    return mic.onEvent((e: InputEvent) => {
      if (e.midi === undefined || e.at < listenFrom.current) return;
      addNoteRef.current(e.midi, true);
    });
  }, [mic, phase]);

  const choose = (s: Song) => {
    setSongId(s.id);
    setKey(randomKey(s, null, Math.random));
    setPhrase(0);
    setPart('melody');
    setPhase('idle');
    setResult(null);
    setFinished(false);
  };
  const advance = () => {
    if (!song) return;
    setResult(null);
    setPhase('idle');
    if (part === 'melody') {
      setPart('chords');
    } else if (phrase + 1 < song.phrases.length) {
      setPhrase(phrase + 1);
      setPart('melody');
    } else {
      setFinished(true);
    }
  };

  if (!song || !key || !current) {
    return (
      <div className={styles.card}>
        <h2>{t('songs.title')}</h2>
        <p className={styles.muted}>{t('songs.blurb')}</p>
        <p className={styles.muted}>{t('rationale.b10-songs')}</p>
        {SONGS.map((s) => {
          const title = t(`song.${s.id}.title`);
          return (
            <section key={s.id} className={styles.status} aria-label={title}>
              <div className={styles.row}>
                <div style={{ flex: '1 1 14rem' }}>
                  <strong>{title}</strong>
                  <div className={styles.muted}>
                    {t(`songs.source.${s.source}`)} · {t(`keys.${s.mode}`)} ·{' '}
                    {t('songs.learned', {
                      done: learnedPhrases(s, trials).size,
                      n: s.phrases.length,
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() => choose(s)}
                >
                  {t('songs.learn')}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const title = t(`song.${song.id}.title`);
  const learned = learnedPhrases(song, trials);
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <h2 style={{ marginRight: 'auto' }}>
          {title} <span className={styles.muted}>{t('songs.inKey', { key: keyName(key) })}</span>
        </h2>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            stopScript();
            setKey(randomKey(song, key, Math.random));
            setPhase('idle');
            setResult(null);
          }}
        >
          {t('songs.changeKey')}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            stopScript();
            setSongId(null);
          }}
        >
          {t('songs.back')}
        </button>
      </div>
      <div className={styles.row} role="list" aria-label={t('songs.phrasesAria')}>
        {song.phrases.map((_, i) => (
          <span
            key={i}
            role="listitem"
            className={`${styles.status} ${learned.has(i) ? styles.ok : ''}`}
            aria-current={i === phrase ? 'step' : undefined}
            style={i === phrase ? { outline: '2px solid var(--accent)' } : undefined}
          >
            {i + 1}
            {learned.has(i) ? ' ✓' : ''}
          </span>
        ))}
      </div>
      {finished ? (
        <>
          <p className={styles.status} role="status">
            {t('songs.done', { title, key: keyName(key) })}
          </p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => void playScript(wholeSongAudio(song, key, settings.accidentalPref))}
            >
              {t('songs.whole')}
            </button>
            <button type="button" className={styles.button} onClick={() => setSongId(null)}>
              {t('songs.back')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>
            {t('songs.phrase', { n: phrase + 1, total: song.phrases.length })} ·{' '}
            {t(part === 'melody' ? 'songs.partMelody' : 'songs.partChords')}
          </h3>
          <p
            data-target-midis={part === 'melody' ? expectedMidis.join(',') : undefined}
            data-target-numerals={part === 'chords' ? expectedNumerals.join(',') : undefined}
          >
            {part === 'melody'
              ? t('songs.playBack', { n: expectedMidis.length })
              : t('songs.nameChords', { n: expectedNumerals.length })}
          </p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${phase === 'idle' ? styles.primary : ''}`}
              onClick={() => void hear()}
            >
              {phase === 'idle'
                ? t(part === 'melody' ? 'songs.hearMelody' : 'songs.hearChords')
                : t('drill.hearAgain')}
            </button>
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
            {!mic && <span className={styles.muted}>{t('songs.micOff')}</span>}
            {phase === 'listening' && (
              <span className={styles.status} role="status">
                {t('drill.listening')}{' '}
                {t('drill.heard', { n: part === 'melody' ? notes.length : named.length, total })}
              </span>
            )}
          </div>
          {result && (
            <div className={styles.status} role="status">
              {result.correct ? (
                <span className={styles.ok}>
                  {t('session.right', { expected: result.expected })}
                </span>
              ) : (
                <span className={styles.bad}>
                  {t('session.wrong', { expected: result.expected, given: result.given })}
                </span>
              )}
              <div className={styles.row}>
                {result.correct ? (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    onClick={advance}
                  >
                    {part === 'melody'
                      ? t('songs.toChords')
                      : phrase + 1 < song.phrases.length
                        ? t('songs.next')
                        : t('songs.whole')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    onClick={() => void hear(true)}
                  >
                    {t('songs.again')}
                  </button>
                )}
              </div>
            </div>
          )}
          {part === 'chords' && (
            <ChoiceGrid
              label={t('b2.group')}
              columns={B9_POOLS[song.mode].length}
              choices={B9_POOLS[song.mode].map((n) => ({ id: n, label: n }))}
              disabled={phase !== 'listening'}
              onChoose={(id) => addNumeral(id, false)}
            />
          )}
          <AnswerNeck
            tuning={tuning}
            region={REGION}
            handedness={settings.handedness}
            markers={[]}
            guideLevel={settings.guideLevel}
            answered={phase === 'feedback'}
            canAnswer={phase === 'listening'}
            accidentalPref={settings.accidentalPref}
            onTap={(e: InputEvent) => {
              if (e.position) addNote(midiAt(e.position, tuning), false);
            }}
            label={t('songs.neck')}
          />
        </>
      )}
    </div>
  );
}
