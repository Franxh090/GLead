import { describe, expect, it } from 'vitest';
import { parseKey } from '../vendor/fretfree/theory';
import { createBackingLoop } from './backing-loop';
import { LOOP_PROGRESSIONS, loopChords } from './loops';

describe('loops', () => {
  it('serves the five PRD progressions', () => {
    const ids = LOOP_PROGRESSIONS.map((p) => p.id);
    for (const id of ['I-V-vi-IV', 'ii-V-I', '12-bar-blues', 'I-vi-IV-V', 'i-bVI-bIII-bVII']) {
      expect(ids).toContain(id);
    }
  });

  it('realises a progression in any key', () => {
    expect(loopChords(parseKey('G'), 'I-V-vi-IV')).toEqual(['G', 'D', 'Em', 'C']);
    expect(loopChords(parseKey('Bb'), 'ii-V-I')).toEqual(['Cm', 'F', 'Bb']);
    expect(loopChords(parseKey('Am'), 'i-bVI-bIII-bVII')).toEqual(['Am', 'F', 'C', 'G']);
    expect(loopChords(parseKey('A'), '12-bar-blues')).toHaveLength(12);
  });

  it('builds a backing loop for every catalogue entry, the custom minor loop included', () => {
    for (const p of LOOP_PROGRESSIONS) {
      const key = parseKey(p.mode === 'major' ? 'E' : 'Em');
      const loop = createBackingLoop({ key, progressionId: p.id, bpm: 80, feel: 'once' });
      expect(loop.chords.length).toBe(p.numerals.length);
    }
    const loop = createBackingLoop({
      key: parseKey('Em'),
      progressionId: 'i-bVI-bIII-bVII',
      bpm: 80,
      feel: 'folk',
    });
    expect(loop.chords).toEqual(['Em', 'C', 'G', 'D']);
  });
});
