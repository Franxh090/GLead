import { Note } from 'tonal';
import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, TUNINGS as FRETFREE_TUNINGS } from '../vendor/fretfree/theory';
import { TUNINGS, getTuning } from './tunings';

describe('tunings', () => {
  it('starts with FretFree’s tunings and adds GLead’s own', () => {
    expect(TUNINGS.slice(0, FRETFREE_TUNINGS.length)).toEqual(FRETFREE_TUNINGS);
    expect(TUNINGS.length).toBeGreaterThan(FRETFREE_TUNINGS.length);
    expect(TUNINGS.map((t) => t.id)).toContain('dadgad');
  });

  it('has unique ids and six real notes per tuning, low to high', () => {
    expect(new Set(TUNINGS.map((t) => t.id)).size).toBe(TUNINGS.length);
    for (const t of TUNINGS) {
      expect(t.notes).toHaveLength(6);
      const midis = t.notes.map((n) => Note.midi(n));
      for (const m of midis) expect(m).not.toBeNull();
      for (let i = 1; i < midis.length; i++) expect(midis[i]!).toBeGreaterThan(midis[i - 1]!);
    }
  });

  it('looks tunings up by id and falls back to standard', () => {
    expect(getTuning('open-g').notes[0]).toBe('D2');
    expect(getTuning('drop-d').id).toBe('drop-d');
    expect(getTuning('no-such-tuning')).toBe(STANDARD_TUNING);
  });
});
