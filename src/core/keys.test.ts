import { describe, expect, it } from 'vitest';
import { keyLabel, parseKey } from '../vendor/fretfree/theory';
import { degreeLabel, degreeNote, isUnseenKey, nextKey, practisedKeys, unseenKeys } from './keys';

describe('key pools', () => {
  it('practised and unseen keys do not overlap and cover all twelve', () => {
    for (const mode of ['major', 'minor'] as const) {
      const a = practisedKeys(mode).map(keyLabel);
      const b = unseenKeys(mode).map(keyLabel);
      expect(new Set([...a, ...b]).size).toBe(12);
      expect(a.filter((k) => b.includes(k))).toEqual([]);
    }
  });

  it('flags unseen keys by pitch, in either spelling', () => {
    expect(isUnseenKey(parseKey('Bb'))).toBe(true);
    expect(isUnseenKey(parseKey('G'))).toBe(false);
    expect(isUnseenKey(parseKey('Ebm'))).toBe(true);
  });
});

describe('nextKey', () => {
  it('never repeats the previous key when the pool allows', () => {
    const pool = practisedKeys('major');
    let previous = pool[0]!;
    let rng = 0;
    for (let i = 0; i < 200; i++) {
      rng = (rng + 0.137) % 1;
      const r = rng;
      const next = nextKey(pool, previous, () => r);
      expect(keyLabel(next)).not.toBe(keyLabel(previous));
      previous = next;
    }
  });

  it('returns the only key of a one-key pool', () => {
    const g = parseKey('G');
    expect(keyLabel(nextKey([g], g, () => 0.5))).toBe('G');
  });

  it('copes with an rng that returns 1', () => {
    const pool = practisedKeys('major');
    expect(pool.map(keyLabel)).toContain(keyLabel(nextKey(pool, null, () => 1)));
  });
});

describe('degrees', () => {
  it('spells degree notes by key', () => {
    expect(degreeNote(parseKey('G'), 7)).toBe('F#');
    expect(degreeNote(parseKey('Eb'), 4)).toBe('Ab');
    expect(degreeNote(parseKey('Am'), 3)).toBe('C');
    expect(degreeNote(parseKey('Em'), 6)).toBe('C');
  });

  it('labels degrees by scheme and mode', () => {
    expect(degreeLabel(3, 'numbers', 'major')).toBe('3');
    expect(degreeLabel(3, 'moveable-do', 'major')).toBe('mi');
    expect(degreeLabel(1, 'moveable-do', 'minor')).toBe('la');
    expect(degreeLabel(3, 'moveable-do', 'minor')).toBe('do');
  });
});
