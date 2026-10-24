import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext } from '../../core/types';
import {
  b8AnswerFromInput,
  b8Audio,
  b8Check,
  b8Choices,
  b8FeedbackAudio,
  b8Hint,
  b8Items,
  b8MakePrompt,
  parseB8Item,
} from './logic';

const ctx: DrillContext = {
  key: parseKey('C'),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng: () => 0,
};

describe('B8 intervals', () => {
  it('has two stages that together cover every interval but the unison', () => {
    const all = [...b8Items('intervals-1'), ...b8Items('intervals-2')];
    expect(all).toHaveLength(12);
    expect(parseB8Item('interval:P5:up')).toEqual({ interval: 'P5' });
    expect(parseB8Item('interval:P1:up')).toBeNull();
    expect(b8Choices('M7')).toEqual(['m2', 'M2', 'm6', 'M6', 'TT', 'm7', 'M7']);
  });

  it('plays two rising notes and grades the tapped name with a song hint', () => {
    const p = b8MakePrompt({ id: 'interval:P5:up', skillId: 'B8.intervals-1' }, ctx);
    expect(p.lowMidi).toBe(48);
    expect(p.highMidi).toBe(55);
    const steps = b8Audio(p);
    if (steps[0]?.type === 'notes') expect(steps[0].notes).toEqual(['C3', 'G3']);
    expect(b8Check(p, { interval: 'P5' })).toMatchObject({
      correct: true,
      expected: 'perfect 5th (C to G)',
    });
    expect(b8Check(p, { interval: 'P4' })).toMatchObject({ correct: false, confusedWith: 'P4' });
    expect(b8AnswerFromInput(p, { kind: 'tap', degree: 2, confidence: 1, at: 0 })).toEqual({
      interval: 'P5',
    });
    expect(b8AnswerFromInput(p, { kind: 'play', midi: 55, confidence: 1, at: 0 })).toBeNull();
    const fb = {
      answer: { interval: 'P4' as const },
      mode: 'tap' as const,
      variant: 'full' as const,
      check: b8Check(p, { interval: 'P4' }),
    };
    const audio = b8FeedbackAudio(p, fb);
    expect(audio).toHaveLength(3);
    if (audio[2]?.type === 'notes') expect(audio[2].notes).toEqual(['C3', 'F3']);
    expect(b8Hint('P5')).toContain('Twinkle');
  });
});
