/**
 * The cadence that sets the key before an ear prompt (PRD B1, OpenEar's
 * `I IV V I` and `i iv V i`). The V is a dominant seventh in both modes, and
 * minor takes the harmonic-minor V so the leading tone pulls home.
 */
import {
  diatonicChord,
  keyName,
  type AccidentalPref,
  type ChordSpec,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import type { AudioStep } from '../core/types';
import { voiceChord } from './voicing';

export const CADENCE = {
  bpm: 110,
  beatsPerChord: 2,
} as const;

/** I–IV–V7–I (or i–iv–V7–i) as chord specs in the key. */
export function cadenceChords(key: MusicalKey): ChordSpec[] {
  const I = diatonicChord(key, 1);
  const IV = diatonicChord(key, 4);
  const V: ChordSpec = { root: diatonicChord(key, 5).root, quality: 'dominant7' };
  return [I, IV, V, I];
}

export function cadenceStep(key: MusicalKey, pref: AccidentalPref = 'sharp'): AudioStep {
  return {
    type: 'progression',
    chords: cadenceChords(key).map((c) => voiceChord(c, pref)),
    bpm: CADENCE.bpm,
    beatsPerChord: CADENCE.beatsPerChord,
  };
}

/** How long the cadence sounds, in ms. */
export function cadenceMs(): number {
  return (4 * CADENCE.beatsPerChord * 60_000) / CADENCE.bpm;
}

export function describeCadence(key: MusicalKey): string {
  return `${keyName(key)}: ${key.mode === 'major' ? 'I–IV–V7–I' : 'i–iv–V7–i'}`;
}
