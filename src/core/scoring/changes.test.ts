import { describe, expect, it } from 'vitest';
import { parseKey, progressionChords } from '../../vendor/fretfree/theory';
import { chordToneOfPitch, createChangeScorer, hitRate, rungTones } from './changes';

const chords = progressionChords(parseKey('G'), ['I', 'V', 'vi', 'IV']); // G D Em C

describe('rungs and tones', () => {
  it('accepts the right tones per rung', () => {
    expect(rungTones('roots', chords[0]!)).toEqual(['1']);
    expect(rungTones('fifths-sevenths', chords[0]!)).toEqual(['5']);
    expect(rungTones('fifths-sevenths', { root: 'D', quality: 'dominant7' })).toEqual(['5', '7']);
    expect(rungTones('any', chords[2]!)).toEqual(['1', '3', '5']);
  });

  it('names a pitch against a chord', () => {
    expect(chordToneOfPitch(chords[0]!, 55)).toBe('1'); // G
    expect(chordToneOfPitch(chords[0]!, 59)).toBe('3'); // B
    expect(chordToneOfPitch(chords[2]!, 55)).toBe('3'); // G in Em
    expect(chordToneOfPitch(chords[0]!, 60)).toBeNull(); // C
  });
});

describe('change scorer', () => {
  it('judges the first note in the window after each change', () => {
    const s = createChangeScorer({ chords, rung: 'roots', bpm: 120 }); // window 500 ms
    s.start();
    s.onChord(0, 1000);
    s.onNote(55, 1200); // G: hit
    s.onNote(60, 1300); // ignored: already settled
    s.onChord(1, 3000);
    s.onNote(64, 3100); // E against D: miss
    s.onChord(2, 5000);
    s.onNote(52, 5800); // too late: silent
    s.onNote(48, 6900); // C, 100 ms before the change: aimed at it, a hit
    s.onChord(3, 7000);
    const r = s.result();
    expect(r.map((x) => x.outcome)).toEqual(['hit', 'miss', 'silent', 'hit']);
    expect(r[0]).toMatchObject({ chord: 'G', tone: '1', offsetMs: 200, pass: 0 });
    expect(r[3]?.offsetMs).toBe(-100);
    expect(hitRate(r)).toBe(0.5);
  });

  it('counts passes and keeps the window one beat long', () => {
    const s = createChangeScorer({ chords, rung: 'any', bpm: 60, windowBeats: 1 });
    s.start();
    s.onChord(0, 0);
    s.onNote(59, 999); // B against G, inside 1000 ms
    s.onChord(1, 2000);
    s.onChord(2, 4000);
    s.onChord(3, 6000);
    s.onChord(0, 8000);
    s.onNote(50, 9001); // D against G, just outside
    const r = s.result();
    expect(r[0]?.outcome).toBe('hit');
    expect(r[4]?.pass).toBe(1);
    expect(r[4]?.outcome).toBe('silent');
    expect(hitRate([])).toBeNull();
  });
});
