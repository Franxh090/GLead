import { describe, expect, it } from 'vitest';
import { CHROMA, TEMPLATES, chromaFromSpectrum, createChordTracker, matchChord } from './chroma';

const SR = 48_000;
const N = 4096;
/** A spectrum with peaks at these frequencies and their first two overtones. */
function spectrum(freqs: number[], overtones = [1, 0.5, 0.25]): Float32Array {
  const mags = new Float32Array(N / 2);
  for (const f of freqs) {
    overtones.forEach((w, h) => {
      const k = Math.round((f * (h + 1) * N) / SR);
      if (k < mags.length) mags[k] = (mags[k] ?? 0) + w;
    });
  }
  return mags;
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const pure = (...pcs: number[]) => Array.from({ length: 12 }, (_, i) => (pcs.includes(i) ? 1 : 0));

describe('chroma chord hearing', () => {
  it('has 24 triad templates with three notes each', () => {
    expect(TEMPLATES).toHaveLength(24);
    for (const t of TEMPLATES) expect(t.weights.filter((w) => w > 0)).toHaveLength(3);
    const fsm = TEMPLATES.find((t) => t.symbol === 'F#m')!.weights;
    expect([fsm[6], fsm[9], fsm[1]]).toEqual([1, 1, 1]); // F#, A, C#
  });

  it('folds a spectrum into pitch classes', () => {
    const c = chromaFromSpectrum(spectrum([hz(48), hz(52), hz(55)]), SR, N); // C3 E3 G3
    // C, E and G carry the energy (G collects C's third harmonic too); nothing else does.
    expect(Math.max(...c)).toBe(1);
    for (const pc of [0, 4, 7]) expect(c[pc]).toBeGreaterThan(0.5);
    for (const pc of [1, 3, 5, 6, 8, 10]) expect(c[pc]).toBe(0);
    expect(chromaFromSpectrum(new Float32Array(N / 2), SR, N).every((x) => x === 0)).toBe(true);
  });

  it('names a strummed triad with confidence and hears a single note as no chord', () => {
    const cMajor = matchChord(
      chromaFromSpectrum(spectrum([hz(48), hz(52), hz(55), hz(60)]), SR, N),
    );
    expect(cMajor).toMatchObject({ symbol: 'C', quality: 'major' });
    expect(cMajor!.confidence).toBeGreaterThan(0.6);
    const aMinor = matchChord(pure(9, 0, 4));
    expect(aMinor).toMatchObject({ symbol: 'Am', root: 'A', quality: 'minor' });
    expect(aMinor!.confidence).toBeGreaterThan(0.9);
    const single = matchChord(pure(4));
    expect(single!.confidence).toBe(0);
    expect(matchChord(pure())).toBeNull();
    // A major third alone leans major but with little margin.
    const third = matchChord(pure(0, 4));
    expect(third!.confidence).toBeLessThan(0.5);
  });

  it('tracks a chord to stability once per onset and resets on silence', () => {
    const tr = createChordTracker({ minStableMs: 100 });
    const g = matchChord(pure(7, 11, 2))!;
    const frame = (at: number, level = 0.1, match = g) => ({ match, level, at });
    expect(tr.push(frame(0))).toBeNull();
    expect(tr.push(frame(60))).toBeNull();
    const stable = tr.push(frame(120));
    expect(stable).toMatchObject({ symbol: 'G', startedAt: 0, stableAt: 120 });
    expect(stable!.confidence).toBeCloseTo(g.confidence);
    expect(tr.push(frame(180))).toBeNull(); // already reported
    expect(tr.push(frame(240, 0))).toBeNull(); // silence resets
    expect(tr.push(frame(300))).toBeNull();
    expect(tr.push(frame(420))).toMatchObject({ symbol: 'G', startedAt: 300 });
    // A frame below the confidence floor is noise, not a chord.
    const weak = { ...g, confidence: CHROMA.minConfidence / 2 };
    expect(tr.push(frame(500, 0.1, weak))).toBeNull();
    expect(tr.push(frame(700, 0.1, weak))).toBeNull();
  });
});
