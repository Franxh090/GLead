import { describe, expect, it } from 'vitest';
import { parseKey } from '../vendor/fretfree/theory';
import { WHY_CARDS, capoHelper, keyNeighbours } from './whycards';

describe('why cards and helpers', () => {
  it('has six cards, each with something to hear first', () => {
    expect(WHY_CARDS).toHaveLength(6);
    for (const c of WHY_CARDS) expect(c.hear.length).toBeGreaterThan(0);
  });

  it('computes the capo fret', () => {
    expect(capoHelper('Bb', 'G')).toMatchObject({ fret: 3 });
    expect(capoHelper('E', 'D').fret).toBe(2);
    expect(capoHelper('G', 'G').fret).toBe(0);
    expect(capoHelper('Bb', 'G')).toEqual({ fret: 3, sounding: 'Bb major', shapes: 'G major' });
  });

  it('names the circle neighbours and the relative key', () => {
    expect(keyNeighbours(parseKey('G'))).toEqual({
      subdominant: 'C',
      dominant: 'D',
      relative: 'Em',
    });
    expect(keyNeighbours(parseKey('F'))).toEqual({
      subdominant: 'Bb',
      dominant: 'C',
      relative: 'Dm',
    });
    expect(keyNeighbours(parseKey('Am'))).toEqual({
      subdominant: 'F',
      dominant: 'G',
      relative: 'C',
    });
    expect(keyNeighbours(parseKey('Ebm')).relative).toBe('F#');
  });
});
