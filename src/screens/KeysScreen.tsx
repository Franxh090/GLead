import { useEffect, useMemo, useState } from 'react';
import { Fretboard } from '../vendor/fretfree/fretboard/Fretboard';
import {
  diatonicChords,
  functionOf,
  getTuning,
  keyName,
  midiAt,
  midiToFretNote,
  parseKey,
  type DiatonicChord,
  type KeyMode,
} from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { playScript } from '../audio/player';
import { voiceChord } from '../audio/voicing';
import { useApp } from '../core/app-context';
import {
  chordMarkers,
  chordZones,
  degreeAt,
  describeChord,
  KEY_REGION,
  scaleMarkers,
  shapeMarkers,
  shapeNotes,
  shapeRange,
} from '../core/keymap';
import { degreeLabel } from '../core/keys';
import { useSettings } from '../core/settings-store';
import { describeFinding, findKey } from '../core/keyfinder';
import { useT } from '../core/i18n';
import type { InputEvent } from '../core/types';
import { WHY_CARDS, capoHelper, keyNeighbours } from '../core/whycards';
import { chordFromNumeral } from '../vendor/fretfree/theory';
import styles from '../styles/app.module.css';

const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

/**
 * The key map (PRD A1, A2): any key's scale and chords on the neck, with
 * sound on every tap, and each chord in three zones up the neck through its
 * CAGED shapes. Reference, not drill: nothing here is graded.
 */
export function KeysScreen() {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const tuning = getTuning(settings.tuning);
  const [mode, setMode] = useState<KeyMode>('major');
  const [tonic, setTonic] = useState<Record<KeyMode, string>>({ major: 'G', minor: 'Am' });
  const [sevenths, setSevenths] = useState(false);
  const [chordIndex, setChordIndex] = useState<number | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [shapesKey, setShapesKey] = useState('G');
  const [openCard, setOpenCard] = useState<string | null>(null);

  const key = useMemo(() => parseKey(tonic[mode]), [tonic, mode]);
  const chords = useMemo(() => diatonicChords(key, { sevenths }), [key, sevenths]);
  const chord: DiatonicChord | null = chordIndex !== null ? (chords[chordIndex] ?? null) : null;
  const zones = useMemo(() => (chord ? chordZones(chord, 3, tuning) : []), [chord, tuning]);
  const markers = chord
    ? chordMarkers(chord, undefined, tuning)
    : scaleMarkers(key, settings.labelScheme, undefined, tuning);
  const [phrase, setPhrase] = useState<number[] | null>(null);
  const [finding, setFinding] = useState<ReturnType<typeof findKey> | null>(null);
  const micOn = settings.micEnabled && phrase !== null;
  useEffect(() => {
    if (!micOn) return;
    const mic = app.mic();
    void mic.start().catch(() => undefined);
    return mic.onEvent((e: InputEvent) => {
      if (e.midi !== undefined) setPhrase((ph) => (ph ? [...ph, e.midi as number] : ph));
    });
  }, [micOn, app]);

  const strum = (c: DiatonicChord, i: number) => {
    setChordIndex(i);
    setHeard(null);
    void playScript([
      { type: 'strum', notes: voiceChord(c, settings.accidentalPref), durationS: 2 },
    ]);
  };
  const tapCell = (p: { string: number; fret: number }) => {
    const midi = midiAt(p, tuning);
    const name = midiToFretNote(midi, settings.accidentalPref).name;
    const d = degreeAt(key, midi);
    setHeard(
      `${displayPc(name)}: ${d ? `degree ${degreeLabel(d, settings.labelScheme, key.mode)}` : 'not in the key'}`,
    );
    void playScript([{ type: 'notes', notes: [name], durationS: 1.2 }]);
  };

  return (
    <div className={styles.card}>
      <h2>{t('keys.title')}</h2>
      <p className={styles.muted}>
        The key on the neck: its scale by degree, its chords by number and job. Tap anything to hear
        it. Tap a chord to see its tones and three places to play it.
      </p>
      <div className={styles.field}>
        <span>Key</span>
        <div className={styles.row}>
          <div className={styles.row} role="group" aria-label="Mode">
            {(['major', 'minor'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.button} ${mode === m ? styles.primary : ''}`}
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setChordIndex(null);
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <select
            aria-label="Tonic"
            value={tonic[mode]}
            onChange={(e) => {
              setTonic({ ...tonic, [mode]: e.target.value });
              setChordIndex(null);
            }}
            className={styles.button}
          >
            {(mode === 'major' ? MAJOR_KEYS : MINOR_KEYS).map((k) => (
              <option key={k} value={k}>
                {keyName(parseKey(k))}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <span>Chords</span>
        <div className={styles.row} role="group" aria-label="Chord size">
          <button
            type="button"
            className={`${styles.button} ${!sevenths ? styles.primary : ''}`}
            aria-pressed={!sevenths}
            onClick={() => setSevenths(false)}
          >
            triads
          </button>
          <button
            type="button"
            className={`${styles.button} ${sevenths ? styles.primary : ''}`}
            aria-pressed={sevenths}
            onClick={() => setSevenths(true)}
          >
            sevenths
          </button>
        </div>
      </div>
      <table className={styles.table} aria-label="Diatonic chords">
        <thead>
          <tr>
            <th>Numeral</th>
            <th>Chord</th>
            <th>Job</th>
          </tr>
        </thead>
        <tbody>
          {chords.map((c, i) => (
            <tr key={c.roman} aria-selected={chordIndex === i}>
              <td>
                <button
                  type="button"
                  className={`${styles.button} ${chordIndex === i ? styles.primary : ''}`}
                  aria-pressed={chordIndex === i}
                  onClick={() => strum(c, i)}
                >
                  {c.roman}
                </button>
              </td>
              <td>{displayPc(c.symbol)}</td>
              <td className={styles.muted}>{functionOf(key, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.row}>
        <span className={styles.muted}>
          {chord
            ? `${describeChord(chord)}: root square, 3rd circle, 5th triangle${sevenths ? ', 7th hexagon' : ''}.`
            : `${keyName(key)}: the scale by degree; the tonic is the square.`}
        </span>
        {chord && (
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setChordIndex(null);
              setHeard(null);
            }}
          >
            Back to the scale
          </button>
        )}
      </div>
      <div className={styles.neck}>
        <Fretboard
          tuning={tuning}
          fretRange={KEY_REGION}
          handedness={settings.handedness}
          markers={markers}
          guideLevel={3}
          revealNotes
          accidentalPref={settings.accidentalPref}
          onTapCell={tapCell}
          label="Fretboard: tap a note to hear it"
        />
      </div>
      {heard && (
        <p className={styles.status} role="status">
          {heard}
        </p>
      )}
      {chord && (
        <section aria-label="Three places to play it">
          <h3>Three places to play {displayPc(chord.symbol)}</h3>
          {zones.length === 0 ? (
            <p className={styles.muted}>
              No CAGED shape for a {chord.quality} chord yet; its tones are on the neck above.
            </p>
          ) : (
            <div className={styles.row}>
              {zones.map((z) => (
                <button
                  key={z.shape}
                  type="button"
                  className={styles.card}
                  style={{ flex: '1 1 16rem', textAlign: 'left' }}
                  onClick={() =>
                    void playScript([{ type: 'strum', notes: shapeNotes(z), durationS: 2 }])
                  }
                  aria-label={`${z.shape} shape at fret ${z.rootFret}, tap to hear`}
                >
                  <span className={styles.muted}>
                    {z.shape} shape · root on string {z.rootString}, fret {z.rootFret}
                  </span>
                  <Fretboard
                    fretRange={shapeRange(z)}
                    handedness={settings.handedness}
                    markers={shapeMarkers(z)}
                    guideLevel={3}
                    accidentalPref={settings.accidentalPref}
                    label={`${z.shape} shape`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <section aria-label={t('keys.findKey')}>
        <h3>{t('keys.findKey')}</h3>
        <p className={styles.muted}>{t('keys.findKeyBlurb')}</p>
        <div className={styles.row}>
          {phrase === null ? (
            <button
              type="button"
              className={styles.button}
              disabled={!settings.micEnabled}
              onClick={() => {
                setPhrase([]);
                setFinding(null);
              }}
            >
              {t('keys.findKeyStart')}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => {
                setFinding(findKey(phrase));
                setPhrase(null);
              }}
            >
              {t('keys.findKeyDone')} ({phrase.length})
            </button>
          )}
          {finding && (
            <span className={styles.status} role="status">
              {finding.best
                ? t('keys.findKeyResult', describeFinding(finding))
                : t('keys.findKeyNone')}
            </span>
          )}
        </div>
      </section>
      <section aria-label="Around the circle">
        <h3>Around the circle</h3>
        <p className={styles.muted}>
          {(() => {
            const n = keyNeighbours(key);
            return `${keyName(key)}: its IV side is ${n.subdominant}, its V side is ${n.dominant}, its relative key is ${n.relative}. Neighbours share six of seven notes, which is why songs modulate to them.`;
          })()}
        </p>
      </section>
      <section aria-label="Capo helper">
        <h3>Capo helper</h3>
        <div className={styles.field}>
          <span>A song in {keyName(key)} with the open shapes of</span>
          <select
            aria-label="Shapes key"
            value={shapesKey}
            onChange={(e) => setShapesKey(e.target.value)}
            className={styles.button}
          >
            {['C', 'G', 'D', 'A', 'E'].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <p role="status">
          {mode === 'major'
            ? capoHelper(tonic.major, shapesKey).text
            : capoHelper(keyNeighbours(key).relative, shapesKey).text + ' (via the relative major)'}
        </p>
      </section>
      <section aria-label="Why it works">
        <h3>Why it works</h3>
        <p className={styles.muted}>Hear it first; the card opens after the sound.</p>
        <div className={styles.row}>
          {WHY_CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.button} ${openCard === c.id ? styles.primary : ''}`}
              onClick={() => {
                const k =
                  c.hear[0]?.startsWith('i') || c.hear[0]?.startsWith('b')
                    ? parseKey(mode === 'minor' ? tonic.minor : keyNeighbours(key).relative)
                    : parseKey(mode === 'major' ? tonic.major : keyNeighbours(key).relative);
                void playScript([
                  {
                    type: 'progression',
                    chords: c.hear.map((n) =>
                      voiceChord(chordFromNumeral(k, n), settings.accidentalPref),
                    ),
                    bpm: 100,
                    beatsPerChord: 2,
                  },
                ]);
                setOpenCard(c.id);
              }}
            >
              {c.title}
            </button>
          ))}
        </div>
        {openCard && (
          <p className={styles.status} role="note">
            {WHY_CARDS.find((c) => c.id === openCard)?.body}
          </p>
        )}
      </section>
    </div>
  );
}
