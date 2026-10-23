import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext } from '../../core/types';
import {
  B1_TARGET_RANGE,
  b1Audio,
  b1AnswerFromInput,
  b1Check,
  b1FeedbackAudio,
  b1FeedbackPositions,
  b1Items,
  b1MakePrompt,
  midisInRange,
  parseB1Item,
} from './logic';

const ctx = (key: string, rng = () => 0.5): DrillContext => ({
  key: parseKey(key),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng,
});

describe('B1 items', () => {
  it('has one item per degree and mode, round-tripping its ID', () => {
    const items = b1Items('major');
    expect(items).toHaveLength(7);
    expect(parseB1Item(items[2]!.id)).toEqual({ degree: 3, mode: 'major' });
    expect(parseB1Item('degree:8@major')).toBeNull();
    expect(parseB1Item('degree:3@dorian')).toBeNull();
  });
});

describe('B1 prompts', () => {
  it('targets the degree of the key in the middle of the neck', () => {
    const p = b1MakePrompt({ id: 'degree:7@major', skillId: 'B1.major' }, ctx('G'));
    expect(p.targetPc).toBe('F#');
    expect(p.targetMidi % 12).toBe(6);
    expect(p.targetMidi).toBeGreaterThanOrEqual(B1_TARGET_RANGE.low);
    expect(p.targetMidi).toBeLessThanOrEqual(B1_TARGET_RANGE.high);
  });

  it('refuses a key of the other mode', () => {
    expect(() => b1MakePrompt({ id: 'degree:3@minor', skillId: 'B1.minor' }, ctx('G'))).toThrow();
  });

  it('plays the cadence, a rest, then the note', () => {
    const p = b1MakePrompt(
      { id: 'degree:1@major', skillId: 'B1.major' },
      ctx('C', () => 0),
    );
    const steps = b1Audio(p);
    expect(steps.map((s) => s.type)).toEqual(['progression', 'rest', 'notes']);
    const last = steps[2];
    if (last?.type === 'notes') expect(last.notes).toEqual(['C3']);
  });

  it('offers every octave in range', () => {
    expect(midisInRange('C')).toEqual([48, 60]);
    expect(midisInRange('G')).toEqual([55, 67]);
  });
});

describe('B1 grading', () => {
  const p = b1MakePrompt(
    { id: 'degree:3@major', skillId: 'B1.major' },
    ctx('G', () => 0),
  ); // B3 = 59

  it('accepts the right pitch class in any octave', () => {
    expect(b1Check(p, { midi: 59 }).correct).toBe(true);
    expect(b1Check(p, { midi: 47 }).correct).toBe(true);
    expect(b1Check(p, { midi: 71 }).correct).toBe(true);
  });

  it('names the degree that was played instead, for interleaving', () => {
    const c = b1Check(p, { midi: 60 }); // C = 4 in G
    expect(c.correct).toBe(false);
    expect(c.expected).toBe('3 (B)');
    expect(c.given).toBe('C4 (4)');
    expect(c.confusedWith).toBe('4');
    expect(b1Check(p, { midi: 58 }).confusedWith).toBe('b3'); // Bb: outside G major
  });

  it('grades tapped degrees', () => {
    expect(b1Check(p, { degree: 3 })).toMatchObject({ correct: true, given: '3' });
    expect(b1Check(p, { degree: 5 })).toMatchObject({ correct: false, confusedWith: '5' });
  });

  it('uses moveable-do labels when asked', () => {
    const q = b1MakePrompt(
      { id: 'degree:3@minor', skillId: 'B1.minor' },
      { ...ctx('Am', () => 0), labelScheme: 'moveable-do' },
    );
    expect(b1Check(q, { degree: 3 }).expected).toBe('do (C)');
    expect(b1Check(q, { midi: 50 }).given).toBe('D3 (re)');
  });

  it('maps input events to answers', () => {
    expect(b1AnswerFromInput(p, { kind: 'play', midi: 59, confidence: 1, at: 0 })).toEqual({
      midi: 59,
    });
    expect(b1AnswerFromInput(p, { kind: 'tap', degree: 2, confidence: 1, at: 0 })).toEqual({
      degree: 2,
    });
    expect(
      b1AnswerFromInput(p, { kind: 'tap', position: { string: 5, fret: 2 }, confidence: 1, at: 0 }),
    ).toEqual({ midi: 47 });
    expect(b1AnswerFromInput(p, { kind: 'play', confidence: 1, at: 0 })).toBeNull();
  });
});

describe('B1 feedback', () => {
  const p = b1MakePrompt(
    { id: 'degree:3@major', skillId: 'B1.major' },
    ctx('G', () => 0),
  );

  it('marks every B on the neck and the wrong note where it was played', () => {
    const fb = {
      answer: { midi: 60 },
      mode: 'play' as const,
      variant: 'full' as const,
      check: b1Check(p, { midi: 60 }),
    };
    const pos = b1FeedbackPositions(p, fb);
    expect(pos.expected.length).toBeGreaterThan(4);
    expect(pos.expected).toContainEqual({ string: 5, fret: 2 });
    expect(pos.given).toContainEqual({ string: 2, fret: 1 });
  });

  it('plays the right note then the wrong one after a miss, and nothing after a hit', () => {
    const miss = {
      answer: { midi: 60 },
      mode: 'play' as const,
      variant: 'full' as const,
      check: b1Check(p, { midi: 60 }),
    };
    const steps = b1FeedbackAudio(p, miss);
    expect(steps).toHaveLength(1);
    if (steps[0]?.type === 'notes') expect(steps[0].notes).toEqual(['B3', 'C4']);
    const tapped = {
      answer: { degree: 5 as const },
      mode: 'tap' as const,
      variant: 'full' as const,
      check: b1Check(p, { degree: 5 }),
    };
    const s2 = b1FeedbackAudio(p, tapped);
    if (s2[0]?.type === 'notes') expect(s2[0].notes).toEqual(['B3', 'D4']);
    const hit = {
      answer: { midi: 59 },
      mode: 'play' as const,
      variant: 'full' as const,
      check: b1Check(p, { midi: 59 }),
    };
    expect(b1FeedbackAudio(p, hit)).toEqual([]);
  });
});
