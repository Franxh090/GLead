/**
 * Songs by ear (curriculum level 6, "learn a melody and its chords by ear"):
 * a tune in a rotating key, one phrase at a time. The melody plays and the
 * learner plays it back; the chords play and the learner names them in
 * order. Every attempt is a TrialEvent under `b10-songs`; nothing here is
 * scheduled, the learner chooses the song.
 */
import { pitchMatches } from '../vendor/fretfree/mic/tracker';
import {
  chordFromNumeral,
  chromaOf,
  keyLabel,
  midiToFretNote,
  type AccidentalPref,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { cadenceStep } from '../audio/cadence';
import { noteName, voiceChord } from '../audio/voicing';
import { newId } from '../core/events/ids';
import { degreeNote, isUnseenKey } from '../core/keys';
import type { AnswerMode, AudioStep, Check, TrialEvent } from '../core/types';
import { b9NumeralOfPitch } from '../drills/b9-progression/logic';
import type { Song, SongPhrase } from './catalogue';

export const SONGS_DRILL_ID = 'b10-songs';
export const SONGS_SKILL_ID = 'B10.songs';
export type SongPart = 'melody' | 'chords';

export function songItemId(songId: string, phrase: number, part: SongPart): string {
  return `song:${songId}:${phrase}:${part}`;
}

export function parseSongItem(
  id: string,
): { songId: string; phrase: number; part: SongPart } | null {
  const m = /^song:([a-z0-9-]+):(\d+):(melody|chords)$/.exec(id);
  return m ? { songId: m[1] as string, phrase: Number(m[2]), part: m[3] as SongPart } : null;
}

/** The tonic between E3 and E♭4, so every melody sits on the neck's lower half. */
export function tonicMidi(key: MusicalKey): number {
  return 52 + ((chromaOf(key.tonic) - 4 + 12) % 12);
}

/** A degree's semitones above the tonic in the key's scale (natural minor for minor). */
function degreeSemis(key: MusicalKey, degree: number): number {
  return (chromaOf(degreeNote(key, degree)) - chromaOf(key.tonic) + 12) % 12;
}

/** The phrase's sounding notes in the key, rests left out. */
export function phraseMidis(phrase: SongPhrase, key: MusicalKey): number[] {
  const tonic = tonicMidi(key);
  return phrase.melody
    .filter((x) => x.degree !== null)
    .map((x) => tonic + degreeSemis(key, x.degree as number) + 12 * (x.octave ?? 0));
}

export function phraseNumerals(phrase: SongPhrase): string[] {
  return phrase.chords.map((c) => c.numeral);
}

/** Cadence, a breath, then the melody with its own rhythm: one step per note. */
export function melodyAudio(
  song: Song,
  phrase: SongPhrase,
  key: MusicalKey,
  pref: AccidentalPref,
): AudioStep[] {
  const beat = 60 / song.bpm;
  const tonic = tonicMidi(key);
  const steps: AudioStep[] = [cadenceStep(key, pref), { type: 'rest', ms: 500 }];
  for (const x of phrase.melody) {
    if (x.degree === null) steps.push({ type: 'rest', ms: Math.round(x.beats * beat * 1000) });
    else
      steps.push({
        type: 'notes',
        notes: [noteName(tonic + degreeSemis(key, x.degree) + 12 * (x.octave ?? 0), pref)],
        durationS: x.beats * beat,
      });
  }
  return steps;
}

/** The phrase's chords strummed for their own lengths. */
export function chordsAudio(
  song: Song,
  phrase: SongPhrase,
  key: MusicalKey,
  pref: AccidentalPref,
): AudioStep[] {
  const beat = 60 / song.bpm;
  return phrase.chords.map((c) => ({
    type: 'strum',
    notes: voiceChord(chordFromNumeral(key, c.numeral), pref),
    durationS: c.beats * beat,
  }));
}

/** The whole tune through, melody only, for the end. */
export function wholeSongAudio(song: Song, key: MusicalKey, pref: AccidentalPref): AudioStep[] {
  return song.phrases.flatMap((p, i) => melodyAudio(song, p, key, pref).slice(i === 0 ? 0 : 2));
}

const names = (midis: readonly number[], pref: AccidentalPref) =>
  midis.map((m) => displayPc(midiToFretNote(m, pref).pc)).join(' ');

/** The melody played back, judged by pitch class in order. */
export function checkMelody(
  expected: readonly number[],
  played: readonly number[],
  pref: AccidentalPref,
): Check & { right: number } {
  const right = played.filter(
    (m, i) => expected[i] !== undefined && pitchMatches(m, expected[i] as number, 'pitch-class'),
  ).length;
  const correct = right === expected.length && played.length === expected.length;
  return {
    correct,
    expected: names(expected, pref),
    given: correct
      ? names(played, pref)
      : `${names(played, pref)} (${right} of ${expected.length} right)`,
    right,
  };
}

/** The chords named in order. */
export function checkChords(
  expected: readonly string[],
  given: readonly string[],
): Check & { right: number } {
  const right = given.filter((n, i) => n === expected[i]).length;
  const correct = right === expected.length && given.length === expected.length;
  return {
    correct,
    expected: expected.join(' '),
    given: correct ? given.join(' ') : `${given.join(' ')} (${right} of ${expected.length} right)`,
    right,
  };
}

/** A played or tapped pitch as a numeral of the key, `?` when it is no chord root. */
export function numeralOfPitch(key: MusicalKey, midi: number): string {
  return b9NumeralOfPitch(key, midi) ?? '?';
}

export interface SongTrialInput {
  sessionId: string;
  songId: string;
  phrase: number;
  part: SongPart;
  key: MusicalKey;
  check: Check;
  mode: AnswerMode;
  at: Date;
  responseMs: number;
  experimentArm: string;
  rng?: () => number;
}

export function songTrial(input: SongTrialInput): TrialEvent {
  return {
    trialId: newId('t', input.rng),
    sessionId: input.sessionId,
    at: input.at,
    drillId: SONGS_DRILL_ID,
    itemId: songItemId(input.songId, input.phrase, input.part),
    skillId: SONGS_SKILL_ID,
    key: keyLabel(input.key),
    mode: input.mode,
    correct: input.check.correct,
    expected: input.check.expected,
    given: input.check.given,
    responseMs: input.responseMs,
    confidence: 1,
    rating: input.check.correct ? 3 : 1,
    imagineFirst: false,
    feedbackVariant: 'full',
    experimentArm: input.experimentArm,
    retest: 'none',
    unseenKey: isUnseenKey(input.key),
    purpose: 'practice',
  };
}

/** Phrases of a song with both parts answered right at least once, from the log (measure, don't assume). */
export function learnedPhrases(song: Song, trials: readonly TrialEvent[]): Set<number> {
  const done = { melody: new Set<number>(), chords: new Set<number>() };
  for (const t of trials) {
    if (t.drillId !== SONGS_DRILL_ID || !t.correct) continue;
    const ref = parseSongItem(t.itemId);
    if (ref && ref.songId === song.id) done[ref.part].add(ref.phrase);
  }
  return new Set([...done.melody].filter((p) => done.chords.has(p)));
}
