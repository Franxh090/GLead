import { describe, expect, it } from 'vitest';
import { parseKey, progressionChords } from '../../vendor/fretfree/theory';
import { createChangeScorer, stepShare } from './changes';

const G = parseKey('G');
const chords = progressionChords(G, ['I', 'V', 'vi', 'IV']); // G D Em C

describe('approaches and passing notes (Sprint 9)', () => {
  it('names how each landing was reached and counts the notes between changes', () => {
    const s = createChangeScorer({ chords, rung: 'roots', bpm: 120, key: G }); // window 500 ms
    s.start();
    s.onChord(0, 1000);
    s.onNote(55, 1100); // G lands chord 1 from nothing
    s.onNote(57, 1500); // A: passing, in key
    s.onNote(58, 1800); // A#: passing, out of key
    s.onNote(60, 1950); // C, 150 ms early: lands chord 2 (a miss), reached by step from A#
    s.onChord(1, 2000);
    s.onChord(2, 3000);
    s.onNote(52, 3100); // E lands chord 3 by leap from C
    s.onNote(52, 3400); // E again: a passing note after the landing
    const r = s.result();
    expect(r.map((x) => x.approach)).toEqual(['none', 'step', 'leap']);
    expect(r.map((x) => x.outcome)).toEqual(['hit', 'miss', 'hit']);
    expect(r[0]).toMatchObject({ between: 2, betweenInKey: 1 });
    expect(r[1]).toMatchObject({ between: 0, betweenInKey: 0 });
    expect(r[2]).toMatchObject({ between: 1, betweenInKey: 1 });
    expect(stepShare(r)).toBeCloseTo(1 / 2); // of the two landings with a note before them
  });

  it('grades the phrase rung: a chord tone counts only when reached by step', () => {
    const s = createChangeScorer({ chords, rung: 'phrase', bpm: 120, key: G });
    s.start();
    s.onChord(0, 1000);
    s.onNote(55, 1100); // G from nothing: miss
    s.onNote(60, 2500); // C passing
    s.onNote(62, 2950); // D, the root of chord 2, by step: hit
    s.onChord(1, 3000);
    s.onChord(2, 5000);
    s.onNote(52, 5100); // E by leap from D: miss
    expect(s.result().map((r) => r.outcome)).toEqual(['miss', 'hit', 'miss']);
  });

  it('marks a repeated note as the same note and leaves in-key counts null without a key', () => {
    const s = createChangeScorer({ chords, rung: 'roots', bpm: 120 });
    s.start();
    s.onChord(0, 0);
    s.onNote(55, 100);
    s.onChord(1, 1000);
    s.onNote(55, 1100);
    const r = s.result();
    expect(r[1]!.approach).toBe('same');
    expect(r[0]!.betweenInKey).toBeNull();
    expect(stepShare([])).toBeNull();
  });
});

describe('measured latency (Sprint 13)', () => {
  it('shifts the window and the reported offset by the device latency', () => {
    const s = createChangeScorer({ chords, rung: 'roots', bpm: 120, latencyMs: 100 }); // window 500 ms
    s.start();
    s.onChord(0, 1000);
    s.onNote(55, 1580); // heard 580 ms after the change, played at 480: inside the window
    s.onChord(1, 3000);
    s.onNote(62, 3080); // heard 80 ms after the change, played 20 ms before it: an anticipation
    const r = s.result();
    expect(r[0]).toMatchObject({ outcome: 'hit', offsetMs: 480 });
    expect(r[1]).toMatchObject({ outcome: 'hit', offsetMs: -20 });
    const strict = createChangeScorer({ chords, rung: 'roots', bpm: 120 });
    strict.start();
    strict.onChord(0, 1000);
    strict.onNote(55, 1580); // without latency the same note is late
    expect(strict.result()[0]!.outcome).toBe('silent');
  });
});
