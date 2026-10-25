/**
 * B9 "Progressions by ear" (PRD B4's progression half; curriculum levels 4
 * and 6): the cadence sets the key, three or four diatonic chords play, and
 * the learner names them by numeral in order, or plays their roots in order.
 * The progression is new every time; an item is "a four-chord progression in
 * a minor key", not one song.
 */
import {
  chordFromNumeral,
  chromaOf,
  diatonicChords,
  keyName,
  midiAt,
  midiToFretNote,
  type AccidentalPref,
  type DiatonicChord,
  type FretRange,
  type KeyMode,
  type MusicalKey,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { cadenceStep } from '../../audio/cadence';
import { voiceChord } from '../../audio/voicing';
import { pick } from '../../core/keys';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  Skill,
} from '../../core/types';

export const B9_ID = 'b9-progression';
export const B9_RATIONALE =
  'Songs are progressions. Hearing four chords and naming their jobs in order is the step from one chord by ear to a whole song by ear.';

export const B9_LENGTHS = [3, 4] as const;
export type ProgressionLength = (typeof B9_LENGTHS)[number];

/** The chords a progression draws from: the common six of each mode; the first chord is always the tonic. */
export const B9_POOLS: Record<KeyMode, readonly string[]> = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi'],
  minor: ['i', 'bIII', 'iv', 'v', 'bVI', 'bVII'],
};

export const B9_SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  {
    id: 'B9.major',
    title: 'Progressions by ear in a major key',
    drillId: B9_ID,
    needsGuitar: false,
    mode: 'major',
    items: () => b9Items('major'),
  },
  {
    id: 'B9.minor',
    title: 'Progressions by ear in a minor key',
    drillId: B9_ID,
    needsGuitar: false,
    mode: 'minor',
    items: () => b9Items('minor'),
  },
];

export function b9ItemId(length: ProgressionLength, mode: KeyMode): string {
  return `progression:${length}@${mode}`;
}

export function parseB9Item(id: string): { length: ProgressionLength; mode: KeyMode } | null {
  const m = /^progression:([34])@(major|minor)$/.exec(id);
  return m ? { length: Number(m[1]) as ProgressionLength, mode: m[2] as KeyMode } : null;
}

export function b9Items(mode: KeyMode): Item[] {
  return B9_LENGTHS.map((n) => ({ id: b9ItemId(n, mode), skillId: `B9.${mode}` }));
}

export const B9_REGION: FretRange = { from: 0, to: 12 };
export const B9_TIMING = { restMs: 600, bpm: 90, beatsPerChord: 2 } as const;

export interface B9Prompt {
  itemId: string;
  key: MusicalKey;
  numerals: string[];
  chords: DiatonicChord[];
  /** Every chord's voicing, for the audio and the replay. */
  voicings: string[][];
  choices: string[];
  accidentalPref: AccidentalPref;
  tuning: Tuning;
}

export interface B9Answer {
  /** One numeral per chord heard; `?` for a played note that is no chord root of the key. */
  numerals: string[];
}

/** Tonic first, then chords from the pool with no chord repeated back to back. */
export function b9Progression(mode: KeyMode, length: number, rng: () => number): string[] {
  const pool = B9_POOLS[mode];
  const out: string[] = [pool[0] as string];
  while (out.length < length) {
    const last = out[out.length - 1];
    const options = pool.filter((n) => n !== last);
    out.push(options[pick(options.length, rng)] as string);
  }
  return out;
}

export function b9MakePrompt(item: Item, ctx: DrillContext): B9Prompt {
  const ref = parseB9Item(item.id);
  if (!ref) throw new Error(`B9 cannot test item ${item.id}`);
  if (ctx.key.mode !== ref.mode) throw new Error(`B9 item ${item.id} needs a ${ref.mode} key`);
  const numerals = b9Progression(ref.mode, ref.length, ctx.rng);
  const chords = numerals.map((n) => chordFromNumeral(ctx.key, n));
  return {
    itemId: item.id,
    key: ctx.key,
    numerals,
    chords,
    voicings: chords.map((c) => voiceChord(c, ctx.accidentalPref)),
    choices: [...B9_POOLS[ref.mode]],
    accidentalPref: ctx.accidentalPref,
    tuning: ctx.tuning,
  };
}

function progressionStep(prompt: B9Prompt): AudioStep {
  return {
    type: 'progression',
    chords: prompt.voicings,
    bpm: B9_TIMING.bpm,
    beatsPerChord: B9_TIMING.beatsPerChord,
  };
}

export function b9Audio(prompt: B9Prompt): AudioStep[] {
  return [
    cadenceStep(prompt.key, prompt.accidentalPref),
    { type: 'rest', ms: B9_TIMING.restMs },
    progressionStep(prompt),
  ];
}

/** The numeral of the chord in the key whose root is this pitch, or null. */
export function b9NumeralOfPitch(key: MusicalKey, midi: number): string | null {
  const chroma = midiToFretNote(midi).chroma;
  const hit = diatonicChords(key).find((c) => chromaOf(c.root) === chroma);
  return hit ? hit.roman : null;
}

function numeralOfEvent(prompt: B9Prompt, e: InputEvent): string | null {
  if (e.degree !== undefined) return prompt.choices[e.degree - 1] ?? null;
  const midi = e.midi ?? (e.position ? midiAt(e.position, prompt.tuning) : undefined);
  if (midi === undefined) return null;
  return b9NumeralOfPitch(prompt.key, midi) ?? '?';
}

/** Answers once as many chords have been named as were heard. */
export function b9AnswerFromInput(
  prompt: B9Prompt,
  event: InputEvent,
  collected: readonly InputEvent[],
): B9Answer | null {
  const n = numeralOfEvent(prompt, event);
  if (n === null) return null;
  const numerals = [
    ...collected.map((c) => numeralOfEvent(prompt, c)).filter((x): x is string => x !== null),
    n,
  ];
  return numerals.length >= prompt.numerals.length
    ? { numerals: numerals.slice(-prompt.numerals.length) }
    : null;
}

/** The numerals named so far, for the view. */
export function b9Collected(prompt: B9Prompt, collected: readonly InputEvent[]): string[] {
  return collected.map((c) => numeralOfEvent(prompt, c)).filter((x): x is string => x !== null);
}

export function b9Check(prompt: B9Prompt, answer: B9Answer): Check {
  const expected = `${prompt.numerals.join(' ')} (${prompt.chords.map((c) => displayPc(c.symbol)).join(' ')})`;
  const given = answer.numerals.join(' ');
  const right = answer.numerals.filter((n, i) => n === prompt.numerals[i]).length;
  const correct =
    right === prompt.numerals.length && answer.numerals.length === prompt.numerals.length;
  if (correct) return { correct, expected, given };
  const firstWrong = answer.numerals.find((n, i) => n !== prompt.numerals[i] && n !== '?');
  return {
    correct,
    expected,
    given: `${given} (${right} of ${prompt.numerals.length} right)`,
    ...(firstWrong ? { confusedWith: firstWrong } : {}),
  };
}

export function b9DescribeAnswer(answer: B9Answer): string {
  return answer.numerals.join(' ');
}

/** After a miss: the progression once more. */
export function b9FeedbackAudio(prompt: B9Prompt, fb: Feedback<B9Answer>): AudioStep[] {
  return fb.check.correct ? [] : [progressionStep(prompt)];
}

export function b9Question(prompt: B9Prompt): string {
  return `${keyName(prompt.key)}. ${prompt.numerals.length} chords after the cadence. Tap their numerals in order, or play their roots.`;
}
