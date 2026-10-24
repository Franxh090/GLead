import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { parseKey } from '../vendor/fretfree/theory';
import type { TrialEvent } from '../core/types';
import { B9_POOLS } from '../drills/b9-progression/logic';
import { SONGS, songById } from './catalogue';
import {
  checkChords,
  checkMelody,
  chordsAudio,
  learnedPhrases,
  melodyAudio,
  numeralOfPitch,
  parseSongItem,
  phraseMidis,
  phraseNumerals,
  songItemId,
  songTrial,
  tonicMidi,
  wholeSongAudio,
} from './logic';

describe('song catalogue', () => {
  it('is well formed: bars add up, chords match the melody length, numerals are in the mode’s pool', () => {
    for (const s of SONGS) {
      expect(s.phrases.length).toBeGreaterThanOrEqual(2);
      for (const p of s.phrases) {
        const melodyBeats = p.melody.reduce((n, x) => n + x.beats, 0);
        const chordBeats = p.chords.reduce((n, x) => n + x.beats, 0);
        expect(melodyBeats, `${s.id} melody`).toBe(chordBeats);
        expect(melodyBeats % s.beatsPerBar, `${s.id} bars`).toBe(0);
        for (const c of p.chords)
          expect(B9_POOLS[s.mode], `${s.id} ${c.numeral}`).toContain(c.numeral);
      }
    }
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
    expect(() => songById('nope')).toThrow();
  });
});

describe('song logic', () => {
  const ode = songById('ode-to-joy');
  const C = parseKey('C');
  const G = parseKey('G');

  it('puts the tonic between E3 and E♭4 and spells a phrase in the key', () => {
    expect(tonicMidi(parseKey('E'))).toBe(52);
    expect(tonicMidi(C)).toBe(60);
    expect(tonicMidi(parseKey('Eb'))).toBe(63);
    expect(phraseMidis(ode.phrases[0]!, C)).toEqual([64, 64, 65, 67, 67, 65, 64, 62]);
    expect(phraseMidis(ode.phrases[0]!, G)).toEqual([59, 59, 60, 62, 62, 60, 59, 57]);
    // The minor study's low 7 sits a whole step under the tonic.
    const minor = songById('minor-study');
    expect(phraseMidis(minor.phrases[0]!, parseKey('Am')).slice(-1)[0]).toBe(55);
    expect(phraseNumerals(ode.phrases[3]!)).toEqual(['I', 'V', 'I']);
  });

  it('builds the audio: cadence then one step per note, strums per chord, the whole song once', () => {
    const steps = melodyAudio(ode, ode.phrases[1]!, C, 'sharp');
    expect(steps[0]!.type).toBe('progression');
    expect(steps.slice(2)).toHaveLength(7);
    expect(steps[6]).toMatchObject({ type: 'notes', notes: ['E4'] });
    expect((steps[6] as { durationS: number }).durationS).toBeCloseTo(0.9);
    const saints = songById('saints');
    expect(melodyAudio(saints, saints.phrases[0]!, C, 'sharp')[2]).toMatchObject({ type: 'rest' });
    const chords = chordsAudio(ode, ode.phrases[3]!, C, 'sharp');
    expect(chords.map((c) => c.type)).toEqual(['strum', 'strum', 'strum']);
    expect(chords[1]).toMatchObject({ durationS: 1.2 });
    expect(wholeSongAudio(ode, C, 'sharp').filter((s) => s.type === 'progression')).toHaveLength(1);
  });

  it('grades the melody by pitch class in order and the chords slot by slot', () => {
    const expected = phraseMidis(ode.phrases[0]!, C);
    expect(
      checkMelody(
        expected,
        expected.map((m) => m + 12),
        'sharp',
      ),
    ).toMatchObject({
      correct: true,
      right: 8,
    });
    const wrong = checkMelody(expected, [64, 64, 65, 67, 67, 65, 64, 60], 'sharp');
    expect(wrong.correct).toBe(false);
    expect(wrong.given).toMatch(/\(7 of 8 right\)$/);
    expect(checkChords(['I', 'V', 'I'], ['I', 'V', 'I']).correct).toBe(true);
    expect(checkChords(['I', 'V', 'I'], ['I', 'IV', 'I'])).toMatchObject({
      correct: false,
      right: 2,
    });
    expect(numeralOfPitch(C, 65)).toBe('IV');
    expect(numeralOfPitch(C, 66)).toBe('?');
  });

  it('logs a take and reads learned phrases back from the log', () => {
    const base = {
      sessionId: 's',
      songId: 'ode-to-joy',
      key: G,
      mode: 'play' as const,
      at: new Date(),
      responseMs: 1000,
      experimentArm: 'default',
      rng: () => 0.5,
    };
    const ok = (phrase: number, part: 'melody' | 'chords') =>
      songTrial({ ...base, phrase, part, check: { correct: true, expected: '', given: '' } });
    const t1 = ok(0, 'melody');
    expect(t1).toMatchObject({
      drillId: 'b10-songs',
      itemId: 'song:ode-to-joy:0:melody',
      skillId: 'B10.songs',
      key: 'G',
      correct: true,
      rating: 3,
      purpose: 'practice',
    });
    expect(parseSongItem(songItemId('twinkle', 3, 'chords'))).toEqual({
      songId: 'twinkle',
      phrase: 3,
      part: 'chords',
    });
    const miss: TrialEvent = { ...ok(1, 'chords'), correct: false, rating: Rating.Again };
    const trials = [t1, ok(0, 'chords'), ok(1, 'melody'), miss, ok(2, 'chords')];
    expect([...learnedPhrases(ode, trials)]).toEqual([0]);
  });
});
