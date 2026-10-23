import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext } from '../../core/types';
import {
  b2Audio,
  b2Check,
  b2Choices,
  b2FeedbackAudio,
  b2FeedbackPositions,
  b2Items,
  b2MakePrompt,
  parseB2Item,
} from './logic';

const ctx = (key: string): DrillContext => ({
  key: parseKey(key),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng: () => 0,
});

describe('B2 items', () => {
  it('has the three stages and round-trips IDs', () => {
    expect(b2Items('primary').map((i) => i.id)).toEqual([
      'function:I@major',
      'function:IV@major',
      'function:V@major',
      'function:vi@major',
    ]);
    expect(b2Items('minor')).toHaveLength(7);
    expect(parseB2Item('function:vii°@major')).toEqual({ numeral: 'vii°', mode: 'major' });
    expect(parseB2Item('function:bVII@minor')).toEqual({ numeral: 'bVII', mode: 'minor' });
    expect(parseB2Item('function:IV@minor')).toBeNull();
  });

  it('offers every numeral of the mode', () => {
    expect(b2Choices('major')).toHaveLength(7);
    expect(b2Choices('minor')).toContain('bVI');
  });
});

describe('B2 prompts and grading', () => {
  const p = b2MakePrompt({ id: 'function:vi@major', skillId: 'B2.primary' }, ctx('G'));

  it('builds the chord in the key and plays cadence, rest, strum', () => {
    expect(p.chord.symbol).toBe('Em');
    expect(p.rootPc).toBe('E');
    expect(p.notes).toEqual(['E2', 'B2', 'E3', 'G3']);
    expect(b2Audio(p).map((s) => s.type)).toEqual(['progression', 'rest', 'strum']);
  });

  it('refuses a key of the other mode', () => {
    expect(() => b2MakePrompt({ id: 'function:i@minor', skillId: 'B2.minor' }, ctx('G'))).toThrow();
  });

  it('grades numerals and names the one confused with', () => {
    expect(b2Check(p, { numeral: 'vi' })).toMatchObject({
      correct: true,
      expected: 'vi (Em)',
      given: 'vi',
    });
    expect(b2Check(p, { numeral: 'IV' })).toMatchObject({ correct: false, confusedWith: 'IV' });
  });

  it('accepts the root played in any octave and names the chord a wrong root belongs to', () => {
    expect(b2Check(p, { midi: 40 }).correct).toBe(true);
    expect(b2Check(p, { midi: 64 }).correct).toBe(true);
    const c = b2Check(p, { midi: 60 }); // C: the IV of G
    expect(c).toMatchObject({ correct: false, given: 'C4 (the root of IV)', confusedWith: 'IV' });
    expect(b2Check(p, { midi: 61 }).confusedWith).toBeUndefined();
  });

  it('works in minor with flat numerals', () => {
    const q = b2MakePrompt({ id: 'function:bVII@minor', skillId: 'B2.minor' }, ctx('Am'));
    expect(q.chord.symbol).toBe('G');
    expect(b2Check(q, { numeral: 'bVII' }).correct).toBe(true);
  });

  it('marks the root on the neck and replays both chords after a wrong numeral', () => {
    const fb = {
      answer: { numeral: 'IV' },
      mode: 'tap' as const,
      check: b2Check(p, { numeral: 'IV' }),
    };
    expect(b2FeedbackPositions(p, fb).expected).toContainEqual({ string: 6, fret: 0 });
    const steps = b2FeedbackAudio(p, fb);
    expect(steps.map((s) => s.type)).toEqual(['strum', 'rest', 'strum']);
    if (steps[2]?.type === 'strum') expect(steps[2].notes[0]).toBe('C3');
    const played = { answer: { midi: 60 }, mode: 'play' as const, check: b2Check(p, { midi: 60 }) };
    expect(b2FeedbackPositions(p, played).given).toContainEqual({ string: 2, fret: 1 });
  });
});
