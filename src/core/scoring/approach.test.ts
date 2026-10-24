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
