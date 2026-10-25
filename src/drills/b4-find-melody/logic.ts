/**
 * B4 "Find it on the neck" (PRD B4): the cadence sets the key, a short
 * diatonic melody plays, and the learner plays it back in order, by ear,
 * in a key that changes every trial. No tab, no names. The melody is new
 * every time: an item is "a three-note melody in a major key", not one tune.
 */
import { pitchMatches } from '../../vendor/fretfree/mic/tracker';
import {
  chromaOf,
  keyName,
  midiAt,
  midiToFretNote,
  positionsOfMidi,
  positionsOfPitchClass,
  type AccidentalPref,
  type FretRange,
  type KeyMode,
  type MusicalKey,
  type Position,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { cadenceStep } from '../../audio/cadence';
import { noteName } from '../../audio/voicing';
import { degreeLabel, degreeNote, pick, type Degree } from '../../core/keys';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  Skill,
} from '../../core/types';

export const B4_ID = 'b4-find-melody';
export const B4_RATIONALE =
  'Hearing a phrase and finding it on the neck is the skill every other one serves. Short phrases, many of them, in a key that keeps changing, so the ear leads the hand and not the other way round.';

export const B4_LENGTHS = [3, 4] as const;
export type MelodyLength = (typeof B4_LENGTHS)[number];

export const B4_SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  {
    id: 'B4.major',
    title: 'Melodies by ear in a major key',
    drillId: B4_ID,
    needsGuitar: true,
    mode: 'major',
    items: () => b4Items('major'),
  },
  {
    id: 'B4.minor',
    title: 'Melodies by ear in a minor key',
    drillId: B4_ID,
    needsGuitar: true,
    mode: 'minor',
    items: () => b4Items('minor'),
  },
];

export function b4ItemId(length: MelodyLength, mode: KeyMode): string {
  return `melody:${length}@${mode}`;
}

export function parseB4Item(id: string): { length: MelodyLength; mode: KeyMode } | null {
  const m = /^melody:([34])@(major|minor)$/.exec(id);
  return m ? { length: Number(m[1]) as MelodyLength, mode: m[2] as KeyMode } : null;
}

export function b4Items(mode: KeyMode): Item[] {
  return B4_LENGTHS.map((n) => ({ id: b4ItemId(n, mode), skillId: `B4.${mode}` }));
}

export const B4_REGION: FretRange = { from: 0, to: 12 };
/** Melodies sit between C3 and G4, start on 1, 3 or 5, and move by steps or thirds. */
export const B4_RANGE = { low: 48, high: 67 } as const;
export const B4_TIMING = { restMs: 600, noteGapS: 0.55, noteS: 0.9 } as const;
const STARTS: readonly Degree[] = [1, 3, 5];
const MOVES = [-2, -1, 1, 2] as const; // scale steps

export interface B4Prompt {
  itemId: string;
  key: MusicalKey;
  degrees: Degree[];
  midis: number[];
  labelScheme: DrillContext['labelScheme'];
  accidentalPref: AccidentalPref;
  tuning: Tuning;
}

export interface B4Answer {
  midis: number[];
}

/** A degree's MIDI note nearest to `near`, inside the range. */
function midiOfDegree(key: MusicalKey, degree: Degree, near: number): number {
  const chroma = chromaOf(degreeNote(key, degree));
  let best: number | null = null;
  for (let m = B4_RANGE.low; m <= B4_RANGE.high; m++) {
    if (m % 12 !== chroma) continue;
    if (best === null || Math.abs(m - near) < Math.abs(best - near)) best = m;
  }
  return best ?? near;
}

export function b4Melody(
  key: MusicalKey,
  length: number,
  rng: () => number,
): { degrees: Degree[]; midis: number[] } {
  const degrees: Degree[] = [STARTS[pick(STARTS.length, rng)] as Degree];
  while (degrees.length < length) {
    const last = degrees[degrees.length - 1] as Degree;
    const move = MOVES[pick(MOVES.length, rng)] as number;
    const next = ((((last - 1 + move) % 7) + 7) % 7) + 1;
    degrees.push(next as Degree);
  }
  const midis: number[] = [];
  let near = 57; // A3: the middle of the range
  for (const d of degrees) {
    const m = midiOfDegree(key, d, near);
    midis.push(m);
    near = m;
  }
  return { degrees, midis };
}

export function b4MakePrompt(item: Item, ctx: DrillContext): B4Prompt {
  const ref = parseB4Item(item.id);
  if (!ref) throw new Error(`B4 cannot test item ${item.id}`);
  if (ctx.key.mode !== ref.mode) throw new Error(`B4 item ${item.id} needs a ${ref.mode} key`);
  const { degrees, midis } = b4Melody(ctx.key, ref.length, ctx.rng);
  return {
    itemId: item.id,
    key: ctx.key,
    degrees,
    midis,
    labelScheme: ctx.labelScheme,
    accidentalPref: ctx.accidentalPref,
    tuning: ctx.tuning,
  };
}

export function b4Audio(prompt: B4Prompt): AudioStep[] {
  return [
    cadenceStep(prompt.key, prompt.accidentalPref),
    { type: 'rest', ms: B4_TIMING.restMs },
    {
      type: 'notes',
      notes: prompt.midis.map((m) => noteName(m, prompt.accidentalPref)),
      gapS: B4_TIMING.noteGapS,
      durationS: B4_TIMING.noteS,
    },
  ];
}

function midiOfEvent(prompt: B4Prompt, e: InputEvent): number | null {
  if (e.midi !== undefined) return e.midi;
  if (e.position) return midiAt(e.position, prompt.tuning);
  return null;
}

/** Answers once as many notes have been heard as the melody has. */
export function b4AnswerFromInput(
  prompt: B4Prompt,
  event: InputEvent,
  collected: readonly InputEvent[],
): B4Answer | null {
  const midi = midiOfEvent(prompt, event);
  if (midi === null) return null;
  const midis = [
    ...collected.map((c) => midiOfEvent(prompt, c)).filter((m): m is number => m !== null),
    midi,
  ];
  return midis.length >= prompt.midis.length ? { midis: midis.slice(-prompt.midis.length) } : null;
}

export function b4Labels(prompt: B4Prompt): string {
  return prompt.degrees.map((d) => degreeLabel(d, prompt.labelScheme, prompt.key.mode)).join(' ');
}

export function b4Check(prompt: B4Prompt, answer: B4Answer): Check {
  const expected = `${b4Labels(prompt)} (${prompt.midis.map((m) => displayPc(midiToFretNote(m, prompt.accidentalPref).pc)).join(' ')})`;
  const given = answer.midis
    .map((m) => displayPc(midiToFretNote(m, prompt.accidentalPref).pc))
    .join(' ');
  const right = answer.midis.filter(
    (m, i) =>
      prompt.midis[i] !== undefined && pitchMatches(m, prompt.midis[i] as number, 'pitch-class'),
  ).length;
  const correct = right === prompt.midis.length && answer.midis.length === prompt.midis.length;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given: `${given} (${right} of ${prompt.midis.length} right)` };
}

export function b4DescribeAnswer(answer: B4Answer): string {
  return answer.midis.map((m) => displayPc(midiToFretNote(m).name)).join(' ');
}

/** Every note of the melody on the neck, and the wrong notes where they were played. */
export function b4FeedbackPositions(
  prompt: B4Prompt,
  fb: Feedback<B4Answer>,
): { expected: Position[]; given: Position[] } {
  const opts = { tuning: prompt.tuning, fretRange: B4_REGION };
  const expected = prompt.midis.flatMap((m) => positionsOfPitchClass(midiToFretNote(m).pc, opts));
  const given = fb.check.correct
    ? []
    : fb.answer.midis.flatMap((m, i) => {
        const want = prompt.midis[i];
        if (want !== undefined && pitchMatches(m, want, 'pitch-class')) return [];
        const exact = positionsOfMidi(m, opts);
        return exact.length ? exact : positionsOfPitchClass(midiToFretNote(m).pc, opts);
      });
  return { expected, given };
}

export function b4FeedbackAudio(prompt: B4Prompt, fb: Feedback<B4Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  return [
    {
      type: 'notes',
      notes: prompt.midis.map((m) => noteName(m, prompt.accidentalPref)),
      gapS: B4_TIMING.noteGapS,
      durationS: B4_TIMING.noteS,
    },
  ];
}

export function b4Question(prompt: B4Prompt): string {
  return `${keyName(prompt.key)}. ${prompt.midis.length} notes. Listen, then play them back in order.`;
}
