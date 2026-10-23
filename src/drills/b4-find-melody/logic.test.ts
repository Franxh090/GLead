import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext, InputEvent } from '../../core/types';
import {
  b4AnswerFromInput,
  b4Audio,
  b4Check,
  b4FeedbackPositions,
  b4Items,
  b4MakePrompt,
  b4Melody,
  parseB4Item,
} from './logic';

const ctx = (key: string, rng = () => 0.3): DrillContext => ({
  key: parseKey(key),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng,
});
const play = (midi: number): InputEvent => ({ kind: 'play', midi, confidence: 1, at: 0 });

describe('B4 melodies', () => {
  it('has two items per mode and round-trips IDs', () => {
    expect(b4Items('major').map((i) => i.id)).toEqual(['melody:3@major', 'melody:4@major']);
    expect(parseB4Item('melody:5@major')).toBeNull();
  });

  it('builds diatonic melodies that start on 1, 3 or 5 and move by step or third', () => {
    let x = 0.17;
    const rng = () => (x = (x * 7.31 + 0.11) % 1);
    for (let i = 0; i < 50; i++) {
      const { degrees, midis } = b4Melody(parseKey('D'), 4, rng);
      expect([1, 3, 5]).toContain(degrees[0]);
      expect(midis).toHaveLength(4);
      for (let k = 1; k < degrees.length; k++) {
        const step = Math.abs(degrees[k]! - degrees[k - 1]!);
        expect([1, 2, 5, 6]).toContain(step); // a step or third, possibly wrapping round the octave
      }
      for (const m of midis) {
        expect(m).toBeGreaterThanOrEqual(48);
        expect(m).toBeLessThanOrEqual(67);
      }
    }
  });

  it('plays cadence, rest, then the notes', () => {
    const p = b4MakePrompt({ id: 'melody:3@major', skillId: 'B4.major' }, ctx('C'));
    const steps = b4Audio(p);
    expect(steps.map((s) => s.type)).toEqual(['progression', 'rest', 'notes']);
    if (steps[2]?.type === 'notes') expect(steps[2].notes).toHaveLength(3);
  });
});

describe('B4 answers', () => {
  const p = b4MakePrompt({ id: 'melody:3@major', skillId: 'B4.major' }, ctx('C'));

  it('collects until as many notes as the melody has, then grades by pitch class in order', () => {
    expect(b4AnswerFromInput(p, play(p.midis[0]!), [])).toBeNull();
    expect(b4AnswerFromInput(p, play(p.midis[1]!), [play(p.midis[0]!)])).toBeNull();
    const a = b4AnswerFromInput(p, play(p.midis[2]! + 12), [play(p.midis[0]!), play(p.midis[1]!)]);
    expect(a).not.toBeNull();
    expect(b4Check(p, a!).correct).toBe(true);
    const wrong = b4Check(p, { midis: [p.midis[0]!, p.midis[1]! + 1, p.midis[2]!] });
    expect(wrong.correct).toBe(false);
    expect(wrong.given).toContain('2 of 3 right');
  });

  it('marks the melody and the wrong notes', () => {
    const fb = {
      answer: { midis: [p.midis[0]!, p.midis[1]! + 1, p.midis[2]!] },
      mode: 'play' as const,
      variant: 'full' as const,
      check: b4Check(p, { midis: [p.midis[0]!, p.midis[1]! + 1, p.midis[2]!] }),
    };
    const pos = b4FeedbackPositions(p, fb);
    expect(pos.expected.length).toBeGreaterThan(3);
    expect(pos.given.length).toBeGreaterThan(0);
  });
});
