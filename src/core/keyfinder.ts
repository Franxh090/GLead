/**
 * Key-finding from a played phrase (PRD B8, support for playing by ear): the
 * pitch classes heard are weighted by how long and how often they sounded,
 * then correlated with the Krumhansl–Kessler key profiles for all 24 keys.
 * The best fits come back in order with a confidence from the gap to the
 * next candidate. Not a drill: a tool on the Keys screen.
 */
import { keyLabel, keyName, type MusicalKey } from '../vendor/fretfree/theory';

/** Krumhansl & Kessler (1982) probe-tone profiles, tonic first. */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export interface KeyGuess {
  key: MusicalKey;
  /** Pearson correlation with the profile, −1…1. */
  score: number;
}

export interface KeyFinding {
  best: KeyGuess | null;
  others: KeyGuess[];
  /** 0–1: how far the best fit stands above the second. */
  confidence: number;
  notes: number;
}

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

/** Pitch-class weights from played notes: each note counts once, the first and last count double. */
export function pitchClassWeights(midis: readonly number[]): number[] {
  const w = new Array<number>(12).fill(0);
  midis.forEach((m, i) => {
    const pc = ((m % 12) + 12) % 12;
    w[pc] = (w[pc] ?? 0) + (i === 0 || i === midis.length - 1 ? 2 : 1);
  });
  return w;
}

export function findKey(midis: readonly number[], top = 3): KeyFinding {
  if (midis.length === 0) return { best: null, others: [], confidence: 0, notes: 0 };
  const w = pitchClassWeights(midis);
  const guesses: KeyGuess[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotate = (profile: number[]) =>
      w.map((_, pc) => profile[(((pc - tonic) % 12) + 12) % 12] as number);
    guesses.push({
      key: { tonic: TONICS[tonic] as string, mode: 'major' },
      score: correlation(w, rotate(MAJOR_PROFILE)),
    });
    guesses.push({
      key: { tonic: MINOR_TONICS[tonic] as string, mode: 'minor' },
      score: correlation(w, rotate(MINOR_PROFILE)),
    });
  }
  guesses.sort((a, b) => b.score - a.score);
  const best = guesses[0] ?? null;
  const second = guesses[1];
  const confidence = best && second ? Math.max(0, Math.min(1, (best.score - second.score) * 4)) : 0;
  return { best, others: guesses.slice(1, top), confidence, notes: midis.length };
}

export function describeFinding(f: KeyFinding): { best: string; others: string } {
  return {
    best: f.best ? keyName(f.best.key) : '—',
    others: f.others.map((g) => keyLabel(g.key)).join(', '),
  };
}
