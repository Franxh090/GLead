/**
 * Keys for practice and for transfer. The PRD measures transfer in unseen
 * keys (§6), so the twelve majors (and minors) are split: a practised set the
 * session rotates through, and a held-out set that only retests use.
 */
import {
  keyLabel,
  parseKey,
  scaleDegreeNote,
  scaleOf,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import type { LabelScheme } from './types';

/** Guitar-friendly majors first; the held-out keys are the less common ones. */
export const PRACTISED_MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'F'] as const;
export const UNSEEN_MAJOR_KEYS = ['Bb', 'Eb', 'Ab', 'B', 'F#', 'Db'] as const;
export const PRACTISED_MINOR_KEYS = ['Am', 'Em', 'Dm', 'Bm', 'F#m', 'Cm'] as const;
export const UNSEEN_MINOR_KEYS = ['Gm', 'C#m', 'G#m', 'Fm', 'Bbm', 'Ebm'] as const;

export function practisedKeys(mode: MusicalKey['mode']): MusicalKey[] {
  return (mode === 'major' ? PRACTISED_MAJOR_KEYS : PRACTISED_MINOR_KEYS).map(parseKey);
}

export function unseenKeys(mode: MusicalKey['mode']): MusicalKey[] {
  return (mode === 'major' ? UNSEEN_MAJOR_KEYS : UNSEEN_MINOR_KEYS).map(parseKey);
}

export function isUnseenKey(key: MusicalKey): boolean {
  return unseenKeys(key.mode).some((k) => keyLabel(k) === keyLabel(key));
}

/** A uniform pick of `0 … n-1`, safe against an rng that returns 1. */
export function pick(n: number, rng: () => number): number {
  return Math.min(n - 1, Math.max(0, Math.floor(rng() * n)));
}

/**
 * The next key for a prompt: any key in the pool but the one just used, so
 * consecutive trials never share a key (interleaving, PRD B7).
 */
export function nextKey(
  pool: readonly MusicalKey[],
  previous: MusicalKey | null,
  rng: () => number,
): MusicalKey {
  if (pool.length === 0) throw new RangeError('Key pool is empty');
  const options =
    previous && pool.length > 1 ? pool.filter((k) => keyLabel(k) !== keyLabel(previous)) : pool;
  return options[pick(options.length, rng)] as MusicalKey;
}

/** The note on a scale degree of a key: the major scale, or the natural minor. */
export function degreeNote(key: MusicalKey, degree: number): string {
  if (key.mode === 'major') return scaleDegreeNote(key.tonic, degree);
  const note = scaleOf(key)[degree - 1];
  if (!note) throw new RangeError(`Invalid degree: ${degree}`);
  return note;
}

const MOVEABLE_DO = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'] as const;
/** La-based minor: the minor tonic is `la`. */
const MOVEABLE_LA = ['la', 'ti', 'do', 're', 'mi', 'fa', 'sol'] as const;

/** The label a learner reads for a degree: `3` or `mi` (`do` in minor is the ♭3). */
export function degreeLabel(degree: number, scheme: LabelScheme, mode: MusicalKey['mode']): string {
  if (scheme === 'numbers') return String(degree);
  const table = mode === 'major' ? MOVEABLE_DO : MOVEABLE_LA;
  const label = table[degree - 1];
  if (!label) throw new RangeError(`Invalid degree: ${degree}`);
  return label;
}

export const DEGREES = [1, 2, 3, 4, 5, 6, 7] as const;
export type Degree = (typeof DEGREES)[number];

export function isDegree(n: number): n is Degree {
  return Number.isInteger(n) && n >= 1 && n <= 7;
}
