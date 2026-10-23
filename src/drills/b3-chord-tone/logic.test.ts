import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext } from '../../core/types';
import {
  b3Audio,
  b3Check,
  b3FeedbackAudio,
  b3FeedbackPositions,
  b3Items,
  b3MakePrompt,
  b3ToneOf,
  parseB3Item,
} from './logic';

const ctx = (root: string, rng = () => 0): DrillContext => ({
  key: parseKey(root),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng,
});

describe('B3 items', () => {
  it('has 6 triad items and 12 seventh items', () => {
    expect(b3Items('triads')).toHaveLength(6);
    expect(b3Items('sevenths')).toHaveLength(12);
    expect(parseB3Item('chord-tone:3@minor')).toEqual({ tone: '3', quality: 'minor' });
    expect(parseB3Item('chord-tone:7@major')).toBeNull();
    expect(parseB3Item('chord-tone:3@augmented')).toBeNull();
  });
});

describe('B3 prompts', () => {
  it('strums the chord on its bass and targets the tone an octave up', () => {
    const p = b3MakePrompt({ id: 'chord-tone:3@minor', skillId: 'B3.triads' }, ctx('A'));
    expect(p.chord).toEqual(['A2', 'E3', 'A3', 'C4']);
    expect(p.targetPc).toBe('C');
    expect(p.targetMidi).toBe(60); // bass A2 (45) + 3 + 12
    expect(b3Audio(p).map((s) => s.type)).toEqual(['strum', 'rest', 'notes']);
  });

  it('keeps the seventh of a seventh chord', () => {
    const p = b3MakePrompt({ id: 'chord-tone:7@dominant7', skillId: 'B3.sevenths' }, ctx('G'));
    expect(p.targetPc).toBe('F');
    expect(p.tones).toEqual(['1', '3', '5', '7']);
  });
});

describe('B3 grading', () => {
  const p = b3MakePrompt({ id: 'chord-tone:3@major', skillId: 'B3.triads' }, ctx('C')); // E

  it('accepts the pitch class in any octave and names a wrong tone', () => {
    expect(b3Check(p, { midi: 64 }).correct).toBe(true);
    expect(b3Check(p, { midi: 40 }).correct).toBe(true);
    const wrong = b3Check(p, { midi: 67 }); // G: the 5th
    expect(wrong).toMatchObject({
      correct: false,
      expected: 'the 3rd (E)',
      given: 'G4 (5th)',
      confusedWith: '5',
    });
    expect(b3Check(p, { midi: 63 }).confusedWith).toBe('♭3'); // Eb: not a chord tone
  });

  it('grades tapped tones', () => {
    expect(b3Check(p, { tone: '3' }).correct).toBe(true);
    expect(b3Check(p, { tone: '1' })).toMatchObject({
      correct: false,
      given: 'root',
      confusedWith: '1',
    });
  });

  it('names tones against the chord', () => {
    expect(b3ToneOf(p, 48)).toEqual({ tone: '1', name: 'Root' });
    expect(b3ToneOf(p, 71).tone).toBeNull();
  });

  it('shows the target on the neck and replays chord, target, then the wrong note', () => {
    const fb = {
      answer: { midi: 67 },
      mode: 'play' as const,
      variant: 'full' as const,
      check: b3Check(p, { midi: 67 }),
    };
    const pos = b3FeedbackPositions(p, fb);
    expect(pos.expected).toContainEqual({ string: 6, fret: 0 });
    expect(pos.given).toContainEqual({ string: 1, fret: 3 });
    const steps = b3FeedbackAudio(p, fb);
    expect(steps.map((s) => s.type)).toEqual(['strum', 'rest', 'notes']);
    if (steps[2]?.type === 'notes') expect(steps[2].notes).toEqual(['E4', 'G4']);
    const tapped = {
      answer: { tone: '5' as const },
      mode: 'tap' as const,
      variant: 'full' as const,
      check: b3Check(p, { tone: '5' }),
    };
    const s2 = b3FeedbackAudio(p, tapped);
    if (s2[2]?.type === 'notes') expect(s2[2].notes).toEqual(['E4', 'G4']);
  });
});
