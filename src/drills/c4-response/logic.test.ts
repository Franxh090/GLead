import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import {
  analyseResponse,
  bridgeDegrees,
  c4Check,
  c4DegreeLabels,
  c4Markers,
  c4Trial,
  c4Verdict,
  pentatonicDegrees,
} from './logic';

const C = parseKey('C');
const Am = parseKey('Am');
// C4=60 D=62 E=64 F=65 G=67 A=69 B=71; F#=66
describe('C4 call and response', () => {
  it('names the pentatonic box and the bridge notes per mode', () => {
    expect(pentatonicDegrees('major')).toEqual([1, 2, 3, 5, 6]);
    expect(bridgeDegrees('major')).toEqual([4, 7]);
    expect(pentatonicDegrees('minor')).toEqual([1, 3, 4, 5, 7]);
    expect(bridgeDegrees('minor')).toEqual([2, 6]);
  });

  it('analyses a phrase: degrees, strays, the box and landing home', () => {
    const a = analyseResponse(C, [60, 62, 64, 67, 64, 60]);
    expect(a.inKey).toBe(6);
    expect(a.outOfKey).toBe(0);
    expect(a.degrees).toEqual([1, 2, 3, 5]);
    expect(a.pentatonicOnly).toBe(true);
    expect(a.bridge).toEqual([]);
    expect(a.landedHome).toBe(true);
    expect(c4Verdict(a)).toBe('pentatonic');

    const b = analyseResponse(C, [60, 65, 71, 72]);
    expect(b.pentatonicOnly).toBe(false);
    expect(b.bridge).toEqual([4, 7]);
    expect(c4Verdict(b)).toBe('inKey');

    const s = analyseResponse(C, [60, 66, 62]);
    expect(s.outOfKey).toBe(1);
    expect(s.notes[1]).toEqual({ midi: 66, degree: null });
    expect(s.landedHome).toBe(false);
    expect(c4Verdict(s)).toBe('strays');

    expect(c4Verdict(analyseResponse(C, []))).toBe('empty');
  });

  it('reads minor keys against the natural minor scale', () => {
    // A B C D E F G: the 6 is F (♭6), the 2 is B.
    const a = analyseResponse(Am, [69, 71, 72, 65]);
    expect(a.degrees).toEqual([1, 2, 3, 6]);
    expect(a.bridge).toEqual([2, 6]);
    expect(a.pentatonicOnly).toBe(false);
    expect(c4DegreeLabels(Am, a.degrees, 'moveable-do')).toBe('la ti do fa');
  });

  it('writes the log honestly: in key and two notes or more counts, a stray or a single note does not', () => {
    expect(c4Check(C, [60, 64, 67])).toEqual({
      correct: true,
      expected: 'a phrase in C major',
      given: '1 3 5',
    });
    expect(c4Check(C, [60, 66]).correct).toBe(false);
    expect(c4Check(C, [60, 66]).given).toBe('1 (F♯)');
    expect(c4Check(C, [60]).correct).toBe(false);
    expect(c4Check(C, []).given).toBe('nothing');
  });

  it('builds a TrialEvent for the take with no card and the key marked for transfer', () => {
    const t = c4Trial({
      sessionId: 's1',
      key: parseKey('Bb'),
      midis: [58, 60, 62],
      mode: 'play',
      at: new Date('2026-10-24T10:00:00Z'),
      responseMs: 3200,
      experimentArm: 'imagine=setting;feedback=full;labels=numbers',
      schedule: 'interleaved',
      rng: () => 0.5,
    });
    expect(t).toMatchObject({
      drillId: 'c4-response',
      itemId: 'response@major',
      skillId: 'C4.response',
      key: 'Bb',
      correct: true,
      rating: 3,
      unseenKey: true,
      purpose: 'practice',
      retest: 'none',
    });
    expect(t.trialId).toMatch(/^t/);
  });

  it('marks the answer on the neck by degree, strays by name', () => {
    const m = c4Markers(C, [60, 66], STANDARD_TUNING, 'sharp', 'numbers');
    const correct = m.filter((x) => x.style === 'correct');
    const wrong = m.filter((x) => x.style === 'wrong');
    expect(correct.length).toBeGreaterThan(0);
    expect(correct.every((x) => x.label === '1')).toBe(true);
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.every((x) => x.label === 'F♯')).toBe(true);
  });
});
