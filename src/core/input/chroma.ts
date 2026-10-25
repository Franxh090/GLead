/**
 * Chord hearing by chroma templates (PRD §2: "chroma-based chord recognisers";
 * appendix open question 3). A magnitude spectrum is folded into twelve pitch
 * classes and compared with the 24 major and minor triads by cosine
 * similarity. The confidence is the best match scaled by its margin over the
 * runner-up, so a single note (which fits eight triads equally) scores 0 and
 * the confirm gate asks the learner. Pure: the detector feeds spectra in.
 * GLead's own code; no model weights are used (R3: BetterChord's are off-limits).
 */
import { chordSymbol, type ChordSpec } from '../../vendor/fretfree/theory';

export const CHROMA = {
  /** Bins outside this range are ignored: below the low E's neighbourhood, above the top fret's overtones. */
  minHz: 65,
  maxHz: 1300,
  /** A chord counts once it has held this long. */
  minStableMs: 150,
  /** RMS below this is silence. */
  minLevel: 0.01,
  /** Frames matched with less confidence than this are noise, not a chord. */
  minConfidence: 0.15,
  /** Margin over the runner-up at which the match is fully trusted. */
  fullMargin: 0.15,
} as const;

export const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type TriadQuality = 'major' | 'minor';

/** Twelve pitch classes, C first, scaled so the loudest is 1 (all 0 for silence). */
export function chromaFromSpectrum(
  magnitudes: ArrayLike<number>,
  sampleRate: number,
  fftSize: number,
  range: { minHz: number; maxHz: number } = CHROMA,
): number[] {
  const chroma = new Array<number>(12).fill(0);
  const binHz = sampleRate / fftSize;
  for (let k = 1; k < magnitudes.length; k++) {
    const f = k * binHz;
    if (f < range.minHz || f > range.maxHz) continue;
    const m = magnitudes[k] as number;
    if (!(m > 0)) continue;
    const pc = (((Math.round(12 * Math.log2(f / 440)) + 69) % 12) + 12) % 12;
    chroma[pc] = (chroma[pc] as number) + m;
  }
  const max = Math.max(...chroma);
  return max > 0 ? chroma.map((x) => x / max) : chroma;
}

export interface ChordTemplate {
  root: string;
  quality: TriadQuality;
  symbol: string;
  weights: number[];
}

function template(rootIndex: number, quality: TriadQuality): ChordTemplate {
  const weights = new Array<number>(12).fill(0);
  weights[rootIndex] = 1;
  weights[(rootIndex + (quality === 'major' ? 4 : 3)) % 12] = 1;
  weights[(rootIndex + 7) % 12] = 1;
  const root = PITCH_CLASSES[rootIndex] as string;
  return { root, quality, symbol: chordSymbol({ root, quality }), weights };
}

export const TEMPLATES: readonly ChordTemplate[] = PITCH_CLASSES.flatMap((_, i) => [
  template(i, 'major'),
  template(i, 'minor'),
]);

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < 12; i++) {
    dot += (a[i] as number) * (b[i] as number);
    na += (a[i] as number) ** 2;
    nb += (b[i] as number) ** 2;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export interface ChordMatch {
  root: string;
  quality: TriadQuality;
  symbol: string;
  /** Cosine similarity of the chroma to the winning template. */
  score: number;
  /** The runner-up, for the margin. */
  second: string;
  /** 0–1: the score scaled by the margin over the runner-up. */
  confidence: number;
}

export function matchChord(chroma: readonly number[]): ChordMatch | null {
  if (chroma.every((x) => x === 0)) return null;
  let best: ChordTemplate | null = null;
  let bestScore = -1;
  let secondScore = -1;
  let second: ChordTemplate | null = null;
  for (const tpl of TEMPLATES) {
    const s = cosine(chroma, tpl.weights);
    if (s > bestScore) {
      second = best;
      secondScore = bestScore;
      best = tpl;
      bestScore = s;
    } else if (s > secondScore) {
      second = tpl;
      secondScore = s;
    }
  }
  if (!best) return null;
  const margin = Math.max(0, bestScore - Math.max(0, secondScore));
  const confidence = Math.max(0, Math.min(1, bestScore)) * Math.min(1, margin / CHROMA.fullMargin);
  return {
    root: best.root,
    quality: best.quality,
    symbol: best.symbol,
    score: bestScore,
    second: second?.symbol ?? best.symbol,
    confidence,
  };
}

export function toChordSpec(m: Pick<ChordMatch, 'root' | 'quality'>): ChordSpec {
  return { root: m.root, quality: m.quality };
}

export interface ChordFrame {
  match: ChordMatch | null;
  /** RMS level of the frame. */
  level: number;
  /** Time in ms on the caller's clock. */
  at: number;
}

export interface StableChord {
  root: string;
  quality: TriadQuality;
  symbol: string;
  /** Mean confidence over the frames that made it stable. */
  confidence: number;
  startedAt: number;
  stableAt: number;
}

/** Like the note tracker: a chord counts once the same match has held `minStableMs`, once per onset. */
export function createChordTracker(
  opts: { minStableMs?: number; minLevel?: number; minConfidence?: number } = {},
) {
  const minStableMs = opts.minStableMs ?? CHROMA.minStableMs;
  const minLevel = opts.minLevel ?? CHROMA.minLevel;
  const minConfidence = opts.minConfidence ?? CHROMA.minConfidence;
  let current: string | null = null;
  let startedAt = 0;
  let confidences: number[] = [];
  let emitted = false;
  return {
    push(frame: ChordFrame): StableChord | null {
      const m = frame.match;
      if (frame.level < minLevel || !m || m.confidence < minConfidence) {
        current = null;
        emitted = false;
        confidences = [];
        return null;
      }
      if (m.symbol !== current) {
        current = m.symbol;
        startedAt = frame.at;
        confidences = [m.confidence];
        emitted = false;
        return null;
      }
      confidences.push(m.confidence);
      if (emitted || frame.at - startedAt < minStableMs) return null;
      emitted = true;
      return {
        root: m.root,
        quality: m.quality,
        symbol: m.symbol,
        confidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
        startedAt,
        stableAt: frame.at,
      };
    },
  };
}
