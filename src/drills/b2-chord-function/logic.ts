/**
 * B2 "Chord function" (PRD B2): the cadence sets the key, then one diatonic
 * chord strums. Which is it, by Roman numeral? The learner taps the numeral
 * or plays the chord's root on the guitar (ear to hand: the root is what a
 * bass line or a lead needs at the change).
 *
 * Items are one per numeral and mode (`function:vi@major`); the key varies
 * per prompt. Stages: the primary chords plus vi first (I IV V vi), then the
 * rest of the major key, then the natural-minor key. Every button of the
 * mode is always offered, so the choice set gives nothing away.
 */
import { pitchMatches } from '../../vendor/fretfree/mic/tracker';
import {
  chordFromNumeral,
  diatonicChords,
  keyName,
  midiAt,
  midiToFretNote,
  positionsOfMidi,
  positionsOfPitchClass,
  chromaOf,
  type AccidentalPref,
  type DiatonicChord,
  type FretRange,
  type KeyMode,
  type MusicalKey,
  type Position,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { cadenceStep } from '../../audio/cadence';
import { bassOf, noteName, voiceChord } from '../../audio/voicing';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  Skill,
} from '../../core/types';

export const B2_ID = 'b2-chord-function';

export const B2_RATIONALE =
  'A chord is heard by its job in the key, not its letter name: the V pulls home, the IV lifts away, the vi darkens the I. Name the job and you can follow any song in any key.';

export const B2_STAGES = {
  primary: { mode: 'major' as KeyMode, numerals: ['I', 'IV', 'V', 'vi'] },
  secondary: { mode: 'major' as KeyMode, numerals: ['ii', 'iii', 'vii°'] },
  minor: { mode: 'minor' as KeyMode, numerals: ['i', 'iv', 'v', 'bVI', 'bVII', 'bIII', 'ii°'] },
} as const;

export type B2Stage = keyof typeof B2_STAGES;

export const B2_SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  {
    id: 'B2.primary',
    title: 'I, IV, V and vi by ear',
    drillId: B2_ID,
    mode: 'major',
    items: () => b2Items('primary'),
  },
  {
    id: 'B2.secondary',
    title: 'ii, iii and vii° by ear',
    drillId: B2_ID,
    mode: 'major',
    items: () => b2Items('secondary'),
  },
  {
    id: 'B2.minor',
    title: 'Chords of a minor key by ear',
    drillId: B2_ID,
    mode: 'minor',
    items: () => b2Items('minor'),
  },
];

export function b2ItemId(numeral: string, mode: KeyMode): string {
  return `function:${numeral}@${mode}`;
}

export function parseB2Item(id: string): { numeral: string; mode: KeyMode } | null {
  const m = /^function:([A-Za-z°b#]+)@(major|minor)$/.exec(id);
  if (!m) return null;
  const mode = m[2] as KeyMode;
  const numeral = m[1] as string;
  const known = Object.values(B2_STAGES).some(
    (s) => s.mode === mode && (s.numerals as readonly string[]).includes(numeral),
  );
  return known ? { numeral, mode } : null;
}

export function b2Items(stage: B2Stage): Item[] {
  const s = B2_STAGES[stage];
  return s.numerals.map((n) => ({ id: b2ItemId(n, s.mode), skillId: `B2.${stage}` }));
}

/** The numerals a mode offers as buttons, in scale order. */
export function b2Choices(mode: KeyMode): string[] {
  return mode === 'major'
    ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
    : ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII'];
}

export const B2_REGION: FretRange = { from: 0, to: 12 };
export const B2_TIMING = { restMs: 500, chordS: 2.4 } as const;

export interface B2Prompt {
  itemId: string;
  key: MusicalKey;
  numeral: string;
  chord: DiatonicChord;
  /** The strummed chord, with octaves. */
  notes: string[];
  rootPc: string;
  rootMidi: number;
  choices: string[];
  accidentalPref: AccidentalPref;
  tuning: Tuning;
}

export interface B2Answer {
  numeral?: string;
  midi?: number;
}

export function b2MakePrompt(item: Item, ctx: DrillContext): B2Prompt {
  const ref = parseB2Item(item.id);
  if (!ref) throw new Error(`B2 cannot test item ${item.id}`);
  if (ctx.key.mode !== ref.mode) throw new Error(`B2 item ${item.id} needs a ${ref.mode} key`);
  const chord = chordFromNumeral(ctx.key, ref.numeral);
  return {
    itemId: item.id,
    key: ctx.key,
    numeral: ref.numeral,
    chord,
    notes: voiceChord(chord, ctx.accidentalPref),
    rootPc: chord.root,
    rootMidi: bassOf(chord.root) + 12,
    choices: b2Choices(ref.mode),
    accidentalPref: ctx.accidentalPref,
    tuning: ctx.tuning,
  };
}

export function b2Audio(prompt: B2Prompt): AudioStep[] {
  return [
    cadenceStep(prompt.key, prompt.accidentalPref),
    { type: 'rest', ms: B2_TIMING.restMs },
    { type: 'strum', notes: prompt.notes, durationS: B2_TIMING.chordS },
  ];
}

export function b2AnswerFromInput(prompt: B2Prompt, event: InputEvent): B2Answer | null {
  if (event.kind === 'play' && event.midi !== undefined) return { midi: event.midi };
  if (event.kind === 'tap') {
    if (event.position) return { midi: midiAt(event.position, prompt.tuning) };
    if (event.midi !== undefined) return { midi: event.midi };
  }
  return null;
}

/** The diatonic chord whose root is this pitch, if any. */
export function b2NumeralOfPitch(prompt: B2Prompt, midi: number): string | null {
  const chroma = midiToFretNote(midi).chroma;
  const hit = diatonicChords(prompt.key).find((c) => chromaOf(c.root) === chroma);
  return hit ? hit.roman : null;
}

export function b2Expected(prompt: B2Prompt): string {
  return `${prompt.numeral} (${displayPc(prompt.chord.symbol)})`;
}

export function b2Check(prompt: B2Prompt, answer: B2Answer): Check {
  const expected = b2Expected(prompt);
  if (answer.numeral !== undefined) {
    const correct = answer.numeral === prompt.numeral;
    return correct
      ? { correct, expected, given: answer.numeral }
      : { correct, expected, given: answer.numeral, confusedWith: answer.numeral };
  }
  if (answer.midi === undefined) return { correct: false, expected, given: '—' };
  const correct = pitchMatches(answer.midi, prompt.rootMidi, 'pitch-class');
  const numeral = b2NumeralOfPitch(prompt, answer.midi);
  const note = displayPc(midiToFretNote(answer.midi, prompt.accidentalPref).name);
  const given = numeral
    ? `${note} (the root of ${numeral})`
    : `${note} (no chord of the key has that root)`;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given, ...(numeral ? { confusedWith: numeral } : {}) };
}

export function b2DescribeAnswer(answer: B2Answer): string {
  if (answer.numeral !== undefined) return answer.numeral;
  if (answer.midi !== undefined) return displayPc(midiToFretNote(answer.midi).name);
  return '—';
}

export function b2FeedbackPositions(
  prompt: B2Prompt,
  fb: Feedback<B2Answer>,
): { expected: Position[]; given: Position[] } {
  const opts = { tuning: prompt.tuning, fretRange: B2_REGION };
  const expected = positionsOfPitchClass(prompt.rootPc, opts);
  if (fb.check.correct || fb.answer.midi === undefined) return { expected, given: [] };
  const exact = positionsOfMidi(fb.answer.midi, opts);
  return {
    expected,
    given: exact.length ? exact : positionsOfPitchClass(midiToFretNote(fb.answer.midi).pc, opts),
  };
}

/** After a miss: the right chord, then the chord that was named (or the note played). */
export function b2FeedbackAudio(prompt: B2Prompt, fb: Feedback<B2Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  const steps: AudioStep[] = [
    { type: 'strum', notes: prompt.notes, durationS: 1.8 },
    { type: 'rest', ms: 300 },
  ];
  if (fb.answer.numeral !== undefined) {
    const other = chordFromNumeral(prompt.key, fb.answer.numeral);
    steps.push({ type: 'strum', notes: voiceChord(other, prompt.accidentalPref), durationS: 1.8 });
  } else if (fb.answer.midi !== undefined) {
    steps.push({
      type: 'notes',
      notes: [
        noteName(prompt.rootMidi, prompt.accidentalPref),
        noteName(fb.answer.midi, prompt.accidentalPref),
      ],
      gapS: 0.9,
      durationS: 1.2,
    });
  }
  return steps;
}

export function b2Question(prompt: B2Prompt): string {
  return `${keyName(prompt.key)}. After the cadence, one chord. Tap its numeral, or play its root.`;
}
