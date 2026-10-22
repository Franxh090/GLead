/**
 * Guitar-like chord voicings as MIDI, after FretFree's D14 (MIT): root, 5th,
 * root, 3rd for a triad and root, 5th, 7th, 3rd for a seventh chord. On a
 * root on string 5 these are the open A-shape grips, so every quality sounds
 * like a strummed guitar chord rather than a piano block.
 */
import {
  chromaOf,
  fromHarmonyQuality,
  midiToFretNote,
  type AccidentalPref,
  type ChordSpec,
} from '../vendor/fretfree/theory';

export const VOICINGS: Readonly<Record<string, readonly number[]>> = {
  major: [0, 7, 12, 16],
  minor: [0, 7, 12, 15],
  diminished: [0, 6, 12, 15],
  augmented: [0, 8, 12, 16],
  '7': [0, 7, 10, 16],
  maj7: [0, 7, 11, 16],
  m7: [0, 7, 10, 15],
  m7b5: [0, 6, 10, 15],
  dim7: [0, 6, 9, 15],
};

/** The lowest E of the guitar; chord basses sit in the octave above it. */
export const LOW_E = 40;

/** A chord root's bass note between E2 and D♯3, the guitar's lowest octave. */
export function bassOf(root: string): number {
  return LOW_E + ((chromaOf(root) - 4 + 12) % 12);
}

/** A chord's notes as MIDI, low to high, from the given bass. */
export function chordMidis(bass: number, kind: string): number[] {
  const v = VOICINGS[kind];
  if (!v) throw new RangeError(`No voicing for ${kind}`);
  return v.map((s) => bass + s);
}

/** A chord's notes with octaves, voiced on its own bass: `G major` → E-shape-like G2 D3 G3 B3. */
export function voiceChord(chord: ChordSpec, pref: AccidentalPref = 'sharp'): string[] {
  return chordMidis(bassOf(chord.root), fromHarmonyQuality(chord.quality)).map(
    (m) => midiToFretNote(m, pref).name,
  );
}

export function noteName(midi: number, pref: AccidentalPref = 'sharp'): string {
  return midiToFretNote(midi, pref).name;
}
