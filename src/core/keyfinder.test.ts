import { describe, expect, it } from 'vitest';
import { describeFinding, findKey, pitchClassWeights } from './keyfinder';

describe('key finder', () => {
  it('weights the first and last note double', () => {
    expect(pitchClassWeights([60, 62, 64])[0]).toBe(2);
    expect(pitchClassWeights([60, 62, 64])[2]).toBe(1);
    expect(pitchClassWeights([60, 62, 64])[4]).toBe(2);
  });

  it('hears a G major phrase as G major and an A minor phrase as A minor', () => {
    const g = findKey([55, 57, 59, 60, 62, 64, 66, 67, 62, 55]);
    expect(g.best?.key).toEqual({ tonic: 'G', mode: 'major' });
    expect(g.confidence).toBeGreaterThan(0);
    const am = findKey([57, 60, 64, 65, 64, 62, 60, 59, 57]);
    expect(am.best?.key.mode).toBe('minor');
    expect(am.best?.key.tonic).toBe('A');
    expect(describeFinding(g).best).toBe('G major');
    expect(describeFinding(g).others.split(', ')).toHaveLength(2);
  });

  it('returns nothing for silence', () => {
    expect(findKey([])).toMatchObject({ best: null, confidence: 0, notes: 0 });
  });
});
