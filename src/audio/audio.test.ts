import { describe, expect, it } from 'vitest';
import { parseKey } from '../vendor/fretfree/theory';
import { cadenceChords, cadenceMs, cadenceStep } from './cadence';
import { scriptMs, stepMs } from './player';
import { bassOf, chordMidis, voiceChord } from './voicing';

describe('voicing', () => {
  it('keeps every bass between E2 and D#3', () => {
    for (const root of ['C', 'E', 'F', 'B', 'Eb', 'D#']) {
      const b = bassOf(root);
      expect(b).toBeGreaterThanOrEqual(40);
      expect(b).toBeLessThanOrEqual(51);
    }
    expect(bassOf('E')).toBe(40);
    expect(bassOf('D#')).toBe(51);
  });

  it('voices a chord like an A-shape grip', () => {
    expect(chordMidis(45, 'major')).toEqual([45, 52, 57, 61]);
    expect(voiceChord({ root: 'A', quality: 'major' })).toEqual(['A2', 'E3', 'A3', 'C#4']);
    expect(voiceChord({ root: 'G', quality: 'dominant7' })).toEqual(['G2', 'D3', 'F3', 'B3']);
  });
});

describe('cadence', () => {
  it('is I–IV–V7–I in major with a dominant seventh', () => {
    const chords = cadenceChords(parseKey('G'));
    expect(chords.map((c) => `${c.root}${c.quality}`)).toEqual([
      'Gmajor',
      'Cmajor',
      'Ddominant7',
      'Gmajor',
    ]);
  });

  it('is i–iv–V7–i in minor with the harmonic-minor V', () => {
    const chords = cadenceChords(parseKey('Am'));
    expect(chords.map((c) => `${c.root}${c.quality}`)).toEqual([
      'Aminor',
      'Dminor',
      'Edominant7',
      'Aminor',
    ]);
    const step = cadenceStep(parseKey('Am'));
    expect(step.type).toBe('progression');
    if (step.type === 'progression') expect(step.chords[2]).toContain('G#3');
  });

  it('lasts four chords of two beats', () => {
    expect(cadenceMs()).toBeCloseTo((8 * 60_000) / 110, 5);
    expect(stepMs(cadenceStep(parseKey('C')))).toBeCloseTo(cadenceMs(), 5);
  });
});

describe('script timing', () => {
  it('adds up steps', () => {
    expect(
      scriptMs([
        { type: 'rest', ms: 400 },
        { type: 'notes', notes: ['A2'], durationS: 1 },
        { type: 'notes', notes: ['A2', 'B2'], gapS: 0.5, durationS: 1 },
        { type: 'strum', notes: ['E2'], durationS: 2 },
      ]),
    ).toBe(400 + 1000 + 1500 + 2000);
    expect(stepMs({ type: 'notes', notes: [] })).toBe(0);
  });
});
