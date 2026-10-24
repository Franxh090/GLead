import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import type { DrillContext, InputEvent } from '../../core/types';
import {
  B9_POOLS,
  b9AnswerFromInput,
  b9Audio,
  b9Check,
  b9Collected,
  b9FeedbackAudio,
  b9Items,
  b9MakePrompt,
  b9NumeralOfPitch,
  b9Progression,
  parseB9Item,
} from './logic';

const seq = (xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};
const ctx = (key: string, rng: () => number): DrillContext => ({
  key: parseKey(key),
  tuning: STANDARD_TUNING,
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  scopeLevel: 0,
  rng,
});
const tap = (degree: number, at = 1): InputEvent => ({ kind: 'tap', degree, confidence: 1, at });
const play = (midi: number, at = 1): InputEvent => ({ kind: 'play', midi, confidence: 0.9, at });

describe('B9 progressions by ear', () => {
  it('has two items per mode and parses them back', () => {
    expect(b9Items('major').map((i) => i.id)).toEqual([
      'progression:3@major',
      'progression:4@major',
    ]);
    expect(parseB9Item('progression:4@minor')).toEqual({ length: 4, mode: 'minor' });
    expect(parseB9Item('progression:5@minor')).toBeNull();
  });

  it('starts on the tonic and never repeats a chord back to back', () => {
    for (let s = 0; s < 50; s++) {
      const p = b9Progression('major', 4, seq([s / 50, 0.3, 0.9, 0.1]));
      expect(p[0]).toBe('I');
      expect(p).toHaveLength(4);
      for (let i = 1; i < p.length; i++) expect(p[i]).not.toBe(p[i - 1]);
      for (const n of p) expect(B9_POOLS.major).toContain(n);
    }
    expect(b9Progression('minor', 3, seq([0.99]))[0]).toBe('i');
  });

  it('builds a prompt with voiced chords and a cadence first', () => {
    const prompt = b9MakePrompt(
      { id: 'progression:4@major', skillId: 'B9.major' },
      ctx('G', seq([0.5, 0.9, 0.1])),
    );
    expect(prompt.numerals).toHaveLength(4);
    expect(prompt.chords[0]!.symbol).toBe('G');
    expect(prompt.voicings[0]).toHaveLength(4);
    const audio = b9Audio(prompt);
    expect(audio.map((s) => s.type)).toEqual(['progression', 'rest', 'progression']);
    expect(() =>
      b9MakePrompt({ id: 'progression:4@major', skillId: 'B9.major' }, ctx('Am', seq([0.5]))),
    ).toThrow();
  });

  it('collects taps until the sequence is complete, then grades slot by slot', () => {
    const prompt = b9MakePrompt(
      { id: 'progression:3@major', skillId: 'B9.major' },
      ctx('C', seq([0.5, 0.9])),
    );
    // choices are I ii iii IV V vi; degree is the 1-based index
    const first = b9AnswerFromInput(prompt, tap(1), []);
    expect(first).toBeNull();
    expect(b9Collected(prompt, [tap(1), tap(4)])).toEqual(['I', 'IV']);
    const idx = (n: string) => prompt.choices.indexOf(n) + 1;
    const events = prompt.numerals.map((n) => tap(idx(n)));
    const answer = b9AnswerFromInput(prompt, events[2]!, events.slice(0, 2));
    expect(answer).toEqual({ numerals: prompt.numerals });
    expect(b9Check(prompt, answer!).correct).toBe(true);
    const wrong = b9Check(prompt, { numerals: [prompt.numerals[0]!, 'vi', prompt.numerals[2]!] });
    expect(wrong.correct).toBe(false);
    expect(wrong.given).toMatch(/\(2 of 3 right\)$/);
    expect(wrong.confusedWith).toBe('vi');
    expect(
      b9FeedbackAudio(prompt, {
        answer: wrong as never,
        mode: 'tap',
        check: wrong,
        variant: 'full',
      }),
    ).toHaveLength(1);
  });

  it('reads played roots as numerals of the key, and a stray note as ?', () => {
    const C = parseKey('C');
    expect(b9NumeralOfPitch(C, 60)).toBe('I');
    expect(b9NumeralOfPitch(C, 65)).toBe('IV');
    expect(b9NumeralOfPitch(C, 69)).toBe('vi');
    expect(b9NumeralOfPitch(C, 66)).toBeNull();
    const prompt = b9MakePrompt(
      { id: 'progression:3@major', skillId: 'B9.major' },
      ctx('C', seq([0.5, 0.9])),
    );
    expect(b9Collected(prompt, [play(60), play(66)])).toEqual(['I', '?']);
  });
});
