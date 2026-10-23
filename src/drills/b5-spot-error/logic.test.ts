import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, chromaOf, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext } from '../../core/types';
import {
  b5AnswerFromInput,
  b5Audio,
  b5Check,
  b5Explain,
  b5FeedbackAudio,
  b5Items,
  b5MakePrompt,
  parseB5Item,
} from './logic';

const ctx = (key: string, rng = () => 0.3): DrillContext => ({
  key: parseKey(key),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng,
});

describe('B5 items', () => {
  it('has a chord and a note item per mode', () => {
    expect(b5Items('minor').map((i) => i.id)).toEqual(['spot:chord@minor', 'spot:note@minor']);
    expect(parseB5Item('spot:bar@major')).toBeNull();
  });
});

describe('B5 chord errors', () => {
  const p = b5MakePrompt({ id: 'spot:chord@major', skillId: 'B5.major' }, ctx('G'));
  it('swaps one chord after the first for one outside the key', () => {
    expect(p.wrongAt).toBeGreaterThan(0);
    expect(p.played).toHaveLength(4);
    expect(p.played[p.wrongAt]).not.toEqual(p.correct[p.wrongAt]);
    p.played.forEach((c, i) => {
      if (i !== p.wrongAt) expect(c).toEqual(p.correct[i]);
    });
    expect(b5Audio(p).map((s) => s.type)).toEqual(['progression', 'rest', 'progression']);
  });
  it('grades the tapped slot and replays the right passage after a miss', () => {
    expect(b5Check(p, { index: p.wrongAt }).correct).toBe(true);
    const other = (p.wrongAt + 1) % 4;
    expect(b5Check(p, { index: other })).toMatchObject({
      correct: false,
      confusedWith: `slot:${other + 1}`,
    });
    expect(b5AnswerFromInput(p, { kind: 'tap', degree: 2, confidence: 1, at: 0 })).toEqual({
      index: 1,
    });
    expect(b5AnswerFromInput(p, { kind: 'play', midi: 50, confidence: 1, at: 0 })).toBeNull();
    const fb = {
      answer: { index: other },
      mode: 'tap' as const,
      variant: 'full' as const,
      check: b5Check(p, { index: other }),
    };
    expect(b5FeedbackAudio(p, fb)[0]?.type).toBe('progression');
    expect(b5Explain(p)).toMatch(/Slot \d played/);
  });
});

describe('B5 note errors', () => {
  it('moves one note of a diatonic run a half step', () => {
    let x = 0.2;
    const rng = () => (x = (x * 5.7 + 0.13) % 1);
    for (let i = 0; i < 20; i++) {
      const p = b5MakePrompt({ id: 'spot:note@major', skillId: 'B5.major' }, ctx('D', rng));
      expect(p.played).toHaveLength(5);
      const scale = new Set([0, 2, 4, 5, 7, 9, 11].map((s) => (s + chromaOf('D')) % 12));
      p.correct.forEach((n) => expect(scale.has(chromaOf(n[0]!))).toBe(true));
      expect(scale.has(chromaOf(p.played[p.wrongAt]![0]!))).toBe(false);
      expect(p.wrongAt).toBeGreaterThan(0);
    }
  });
});
