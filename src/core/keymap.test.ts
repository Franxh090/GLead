import { describe, expect, it } from 'vitest';
import { diatonicChord, parseKey } from '../vendor/fretfree/theory';
import {
  cagedQualityOf,
  chordMarkers,
  chordZones,
  degreeAt,
  scaleMarkers,
  shapeNotes,
  shapeRange,
} from './keymap';

describe('key map', () => {
  it('marks every scale note with its degree and the tonic as a root', () => {
    const m = scaleMarkers(parseKey('G'), 'numbers');
    const tonics = m.filter((x) => x.style === 'root');
    expect(tonics.length).toBeGreaterThan(4);
    expect(tonics.every((x) => x.label === '1')).toBe(true);
    expect(m.some((x) => x.label === '7' && x.spokenLabel?.includes('F♯'))).toBe(true);
    expect(
      scaleMarkers(parseKey('Am'), 'moveable-do').some(
        (x) => x.label === 'la' && x.style === 'root',
      ),
    ).toBe(true);
  });

  it('marks chord tones by role and names degrees of taps', () => {
    const g7 = diatonicChord(parseKey('C'), 5, { sevenths: true });
    const m = chordMarkers(g7);
    expect(new Set(m.map((x) => x.style))).toEqual(new Set(['root', 'third', 'fifth', 'seventh']));
    expect(degreeAt(parseKey('C'), 64)).toBe(3);
    expect(degreeAt(parseKey('C'), 61)).toBeNull();
  });

  it('gives three CAGED zones up the neck for a playable chord, none for a diminished one', () => {
    const zones = chordZones({ root: 'G', quality: 'major' });
    expect(zones).toHaveLength(3);
    const lows = zones.map((z) => Math.min(...z.notes.map((n) => n.fret)));
    expect(lows).toEqual([...lows].sort((a, b) => a - b));
    expect(shapeNotes(zones[0]!).length).toBeGreaterThanOrEqual(4);
    const r = shapeRange(zones[1]!);
    expect(r.to - r.from).toBeGreaterThanOrEqual(4);
    expect(cagedQualityOf({ root: 'B', quality: 'diminished' })).toBeNull();
    expect(chordZones({ root: 'B', quality: 'diminished' })).toEqual([]);
    expect(cagedQualityOf({ root: 'D', quality: 'minor7' })).toBe('minor');
  });
});
