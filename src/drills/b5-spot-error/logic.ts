/**
 * B5 "Spot the error" (PRD B5, research finding 2: you must hear errors to
 * fix them). A short passage plays with one thing wrong: a chord of a
 * four-chord progression swapped for a chord outside the key, or a note of a
 * five-note scale run moved a half step. Which one? Tap-only: the answer is
 * a position in time, not a pitch.
 */
import {
  chordFromNumeral,
  chromaOf,
  keyName,
  type AccidentalPref,
  type ChordSpec,
  type KeyMode,
  type MusicalKey,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { cadenceStep } from '../../audio/cadence';
import { noteName, voiceChord } from '../../audio/voicing';
import { DEGREES, degreeNote, pick, type Degree } from '../../core/keys';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  Skill,
} from '../../core/types';

export const B5_ID = 'b5-spot-error';
export const B5_RATIONALE =
  'You can only fix what you can hear is wrong. One chord or one note is off; finding it trains the monitoring every practice session depends on.';

export type ErrorKind = 'chord' | 'note';

export const B5_SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  {
    id: 'B5.major',
    title: 'Spot the wrong chord or note (major)',
    drillId: B5_ID,
    needsGuitar: false,
    mode: 'major',
    items: () => b5Items('major'),
  },
  {
    id: 'B5.minor',
    title: 'Spot the wrong chord or note (minor)',
    drillId: B5_ID,
    needsGuitar: false,
    mode: 'minor',
    items: () => b5Items('minor'),
  },
];

export function b5ItemId(kind: ErrorKind, mode: KeyMode): string {
  return `spot:${kind}@${mode}`;
}

export function parseB5Item(id: string): { kind: ErrorKind; mode: KeyMode } | null {
  const m = /^spot:(chord|note)@(major|minor)$/.exec(id);
  return m ? { kind: m[1] as ErrorKind, mode: m[2] as KeyMode } : null;
}

export function b5Items(mode: KeyMode): Item[] {
  return (['chord', 'note'] as const).map((k) => ({
    id: b5ItemId(k, mode),
    skillId: `B5.${mode}`,
  }));
}

const PROGRESSIONS: Record<KeyMode, readonly (readonly string[])[]> = {
  major: [
    ['I', 'IV', 'V', 'I'],
    ['I', 'vi', 'IV', 'V'],
    ['I', 'V', 'vi', 'IV'],
    ['ii', 'V', 'I', 'IV'],
  ],
  minor: [
    ['i', 'iv', 'v', 'i'],
    ['i', 'bVI', 'bIII', 'bVII'],
    ['i', 'bVII', 'bVI', 'bVII'],
  ],
};

export const B5_TIMING = {
  restMs: 500,
  bpm: 100,
  beatsPerChord: 2,
  noteGapS: 0.5,
  noteS: 0.8,
} as const;

export interface B5Prompt {
  itemId: string;
  key: MusicalKey;
  kind: ErrorKind;
  /** Which element (0-based) is wrong. */
  wrongAt: number;
  /** The passage as played: chords with octaves, or note names. */
  played: string[][];
  /** The passage as it should be. */
  correct: string[][];
  /** Labels for the buttons and feedback. */
  labels: string[];
  accidentalPref: AccidentalPref;
}

export interface B5Answer {
  index: number;
}

/** A chord outside the key that shares the wrong slot's root: the quality flipped. */
function spoilChord(chord: ChordSpec): ChordSpec {
  const flip: Partial<Record<ChordSpec['quality'], ChordSpec['quality']>> = {
    major: 'minor',
    minor: 'major',
    diminished: 'major',
    dominant7: 'minor7',
    minor7: 'dominant7',
    major7: 'minor7',
  };
  return { root: chord.root, quality: flip[chord.quality] ?? 'minor' };
}

export function b5MakePrompt(item: Item, ctx: DrillContext): B5Prompt {
  const ref = parseB5Item(item.id);
  if (!ref) throw new Error(`B5 cannot test item ${item.id}`);
  if (ctx.key.mode !== ref.mode) throw new Error(`B5 item ${item.id} needs a ${ref.mode} key`);
  const pref = ctx.accidentalPref;
  if (ref.kind === 'chord') {
    const options = PROGRESSIONS[ref.mode];
    const numerals = options[pick(options.length, ctx.rng)] as readonly string[];
    const chords = numerals.map((n) => chordFromNumeral(ctx.key, n));
    const wrongAt = 1 + pick(chords.length - 1, ctx.rng); // never the first chord: it sets the key
    const correct = chords.map((c) => voiceChord(c, pref));
    const played = correct.map((notes, i) =>
      i === wrongAt ? voiceChord(spoilChord(chords[i] as ChordSpec), pref) : notes,
    );
    return {
      itemId: item.id,
      key: ctx.key,
      kind: 'chord',
      wrongAt,
      played,
      correct,
      labels: numerals.map((n, i) => `${i + 1}: ${n}`),
      accidentalPref: pref,
    };
  }
  // A five-note run up or down the scale, one note a half step off.
  const up = ctx.rng() < 0.5;
  const startDegree = (1 + pick(3, ctx.rng)) as Degree; // 1, 2 or 3
  const degrees: Degree[] = [];
  for (let i = 0; i < 5; i++) {
    degrees.push((((((startDegree - 1 + (up ? i : -i)) % 7) + 7) % 7) + 1) as Degree);
  }
  let near = 55;
  const midis = degrees.map((d) => {
    const m = nearestMidi(chromaOf(degreeNote(ctx.key, d)), near);
    near = m;
    return m;
  });
  const wrongAt = 1 + pick(midis.length - 1, ctx.rng);
  // A half step in the direction that leaves the key: E to F in D major is
  // outside, but F# to G would still be a scale note.
  const scale = new Set(DEGREES.map((d) => chromaOf(degreeNote(ctx.key, d))));
  const preferred = ctx.rng() < 0.5 ? 1 : -1;
  const wrongMidi = midis[wrongAt] as number;
  const shift = scale.has((((wrongMidi + preferred) % 12) + 12) % 12) ? -preferred : preferred;
  const correct = midis.map((m) => [noteName(m, pref)]);
  const played = midis.map((m, i) => [noteName(i === wrongAt ? m + shift : m, pref)]);
  return {
    itemId: item.id,
    key: ctx.key,
    kind: 'note',
    wrongAt,
    played,
    correct,
    labels: midis.map((_, i) => `${i + 1}`),
    accidentalPref: pref,
  };
}

/** The MIDI note of a pitch class nearest to `near`, between C3 and C5. */
function nearestMidi(chroma: number, near: number): number {
  let best: number | null = null;
  for (let m = 48; m <= 72; m++) {
    if (m % 12 !== chroma) continue;
    if (best === null || Math.abs(m - near) < Math.abs(best - near)) best = m;
  }
  return best ?? near;
}

export function b5Audio(prompt: B5Prompt): AudioStep[] {
  const passage: AudioStep =
    prompt.kind === 'chord'
      ? {
          type: 'progression',
          chords: prompt.played,
          bpm: B5_TIMING.bpm,
          beatsPerChord: B5_TIMING.beatsPerChord,
        }
      : {
          type: 'notes',
          notes: prompt.played.map((n) => n[0] as string),
          gapS: B5_TIMING.noteGapS,
          durationS: B5_TIMING.noteS,
        };
  return [
    cadenceStep(prompt.key, prompt.accidentalPref),
    { type: 'rest', ms: B5_TIMING.restMs },
    passage,
  ];
}

export function b5AnswerFromInput(prompt: B5Prompt, event: InputEvent): B5Answer | null {
  if (event.kind !== 'tap' || event.degree === undefined) return null;
  const index = event.degree - 1;
  return index >= 0 && index < prompt.played.length ? { index } : null;
}

export function b5Check(prompt: B5Prompt, answer: B5Answer): Check {
  const expected = prompt.labels[prompt.wrongAt] as string;
  const given = prompt.labels[answer.index] as string;
  const correct = answer.index === prompt.wrongAt;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given, confusedWith: `slot:${answer.index + 1}` };
}

export function b5DescribeAnswer(answer: B5Answer): string {
  return `slot ${answer.index + 1}`;
}

/** After a miss: the passage as it should be. */
export function b5FeedbackAudio(prompt: B5Prompt, fb: Feedback<B5Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  return prompt.kind === 'chord'
    ? [
        {
          type: 'progression',
          chords: prompt.correct,
          bpm: B5_TIMING.bpm,
          beatsPerChord: B5_TIMING.beatsPerChord,
        },
      ]
    : [
        {
          type: 'notes',
          notes: prompt.correct.map((n) => n[0] as string),
          gapS: B5_TIMING.noteGapS,
          durationS: B5_TIMING.noteS,
        },
      ];
}

export function b5Question(prompt: B5Prompt): string {
  return prompt.kind === 'chord'
    ? `${keyName(prompt.key)}. Four chords; one of them is not in the key. Which?`
    : `${keyName(prompt.key)}. Five notes of the scale; one is a half step off. Which?`;
}

export function b5Explain(prompt: B5Prompt): string {
  const wrong = prompt.played[prompt.wrongAt] as string[];
  const right = prompt.correct[prompt.wrongAt] as string[];
  return prompt.kind === 'chord'
    ? `Slot ${prompt.wrongAt + 1} played ${displayPc(wrong.join(' '))} instead of ${displayPc(right.join(' '))}.`
    : `Note ${prompt.wrongAt + 1} was ${displayPc(wrong[0] as string)} instead of ${displayPc(right[0] as string)}.`;
}
