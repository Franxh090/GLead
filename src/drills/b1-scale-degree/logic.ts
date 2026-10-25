/**
 * B1 "Scale degree in key" (PRD B1): a cadence sets the key, one note
 * sounds, and the learner plays it back on the guitar or taps its degree.
 * The pure half: items, prompts, grading, feedback.
 *
 * Items are one per degree and mode (`degree:3@major`), the key varying per
 * prompt (a card is the sound's shape, not one recording of it). Any octave
 * of the right pitch class counts: the ear hears the degree, and the detector
 * can miss an octave.
 */
import { pitchMatches } from '../../vendor/fretfree/mic/tracker';
import {
  chromaOf,
  chromaticDegree,
  degreeOfPitch,
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
import { DEGREES, degreeLabel, degreeNote, isDegree, pick, type Degree } from '../../core/keys';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  LabelScheme,
  Skill,
} from '../../core/types';

export const B1_ID = 'b1-scale-degree';

export const B1_RATIONALE =
  'The cadence tells your ear where home is; the note is heard as a distance from home, not as a pitch. Playing it back joins that hearing to your hands.';

export const B1_SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  {
    id: 'B1.major',
    title: 'Scale degrees in a major key',
    drillId: B1_ID,
    needsGuitar: false,
    mode: 'major',
    items: () => b1Items('major'),
  },
  {
    id: 'B1.minor',
    title: 'Scale degrees in a minor key',
    drillId: B1_ID,
    needsGuitar: false,
    mode: 'minor',
    items: () => b1Items('minor'),
  },
];

export function b1ItemId(degree: Degree, mode: KeyMode): string {
  return `degree:${degree}@${mode}`;
}

export function parseB1Item(id: string): { degree: Degree; mode: KeyMode } | null {
  const m = /^degree:([1-7])@(major|minor)$/.exec(id);
  if (!m) return null;
  return { degree: Number(m[1]) as Degree, mode: m[2] as KeyMode };
}

export function b1Items(mode: KeyMode): Item[] {
  return DEGREES.map((d) => ({ id: b1ItemId(d, mode), skillId: `B1.${mode}` }));
}

/** Target notes sit between C3 and G4: the middle of the neck, clear on any guitar. */
export const B1_TARGET_RANGE = { low: 48, high: 67 } as const;
export const B1_REGION: FretRange = { from: 0, to: 12 };
/** Silence between the cadence and the target, and how long the target rings. */
export const B1_TIMING = { restMs: 600, targetS: 1.6 } as const;

export interface B1Prompt {
  itemId: string;
  key: MusicalKey;
  degree: Degree;
  /** The target's pitch class, spelled for the key. */
  targetPc: string;
  targetMidi: number;
  labelScheme: LabelScheme;
  accidentalPref: AccidentalPref;
  tuning: Tuning;
}

/** A played pitch, or a tapped degree. */
export interface B1Answer {
  midi?: number;
  degree?: Degree;
}

/** Every MIDI note of a pitch class inside the target range. */
export function midisInRange(pc: string, range = B1_TARGET_RANGE): number[] {
  const out: number[] = [];
  for (let m = range.low; m <= range.high; m++) if (m % 12 === chromaOf(pc)) out.push(m);
  return out;
}

export function b1MakePrompt(item: Item, ctx: DrillContext): B1Prompt {
  const ref = parseB1Item(item.id);
  if (!ref) throw new Error(`B1 cannot test item ${item.id}`);
  if (ctx.key.mode !== ref.mode) throw new Error(`B1 item ${item.id} needs a ${ref.mode} key`);
  const targetPc = degreeNote(ctx.key, ref.degree);
  const options = midisInRange(targetPc);
  return {
    itemId: item.id,
    key: ctx.key,
    degree: ref.degree,
    targetPc,
    targetMidi: options[pick(options.length, ctx.rng)] as number,
    labelScheme: ctx.labelScheme,
    accidentalPref: ctx.accidentalPref,
    tuning: ctx.tuning,
  };
}

export function b1Label(prompt: Pick<B1Prompt, 'labelScheme' | 'key'>, degree: Degree): string {
  return degreeLabel(degree, prompt.labelScheme, prompt.key.mode);
}

/** The cadence, a breath, then the note. */
export function b1Audio(prompt: B1Prompt): AudioStep[] {
  return [
    cadenceStep(prompt.key, prompt.accidentalPref),
    { type: 'rest', ms: B1_TIMING.restMs },
    {
      type: 'notes',
      notes: [noteName(prompt.targetMidi, prompt.accidentalPref)],
      durationS: B1_TIMING.targetS,
    },
  ];
}

export function b1AnswerFromInput(prompt: B1Prompt, event: InputEvent): B1Answer | null {
  if (event.kind === 'play' && event.midi !== undefined) return { midi: event.midi };
  if (event.kind === 'tap') {
    if (event.degree !== undefined && isDegree(event.degree)) return { degree: event.degree };
    if (event.position) return { midi: midiAt(event.position, prompt.tuning) };
    if (event.midi !== undefined) return { midi: event.midi };
  }
  return null;
}

/** The degree a pitch has in the key, or its chromatic name (`b3`) when it is outside it. */
export function b1DegreeOf(
  prompt: B1Prompt,
  midi: number,
): { degree: Degree | null; name: string } {
  const pc = midiToFretNote(midi, prompt.accidentalPref).pc;
  const scale = prompt.key.mode === 'major' ? prompt.key.tonic : null;
  if (scale) {
    const d = degreeOfPitch(scale, pc);
    return d
      ? { degree: d, name: b1Label(prompt, d) }
      : { degree: null, name: chromaticDegree(prompt.key.tonic, pc) };
  }
  // Minor: degrees against the natural minor scale.
  for (const d of DEGREES) {
    if (chromaOf(degreeNote(prompt.key, d)) === chromaOf(pc))
      return { degree: d, name: b1Label(prompt, d) };
  }
  return { degree: null, name: chromaticDegree(prompt.key.tonic, pc) };
}

export function b1Expected(prompt: B1Prompt): string {
  return `${b1Label(prompt, prompt.degree)} (${displayPc(prompt.targetPc)})`;
}

export function b1Check(prompt: B1Prompt, answer: B1Answer): Check {
  const expected = b1Expected(prompt);
  if (answer.degree !== undefined) {
    const correct = answer.degree === prompt.degree;
    const given = b1Label(prompt, answer.degree);
    return correct
      ? { correct, expected, given }
      : { correct, expected, given, confusedWith: given };
  }
  if (answer.midi === undefined) return { correct: false, expected, given: '—' };
  const correct = pitchMatches(answer.midi, prompt.targetMidi, 'pitch-class');
  const heard = b1DegreeOf(prompt, answer.midi);
  const given = `${displayPc(midiToFretNote(answer.midi, prompt.accidentalPref).name)} (${heard.name})`;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given, confusedWith: heard.name };
}

export function b1DescribeAnswer(answer: B1Answer): string {
  if (answer.degree !== undefined) return `degree ${answer.degree}`;
  if (answer.midi !== undefined) return displayPc(midiToFretNote(answer.midi).name);
  return '—';
}

/** Where the target is on the neck, and where the wrong note was, if one was played. */
export function b1FeedbackPositions(
  prompt: B1Prompt,
  fb: Feedback<B1Answer>,
): { expected: Position[]; given: Position[] } {
  const opts = { tuning: prompt.tuning, fretRange: B1_REGION };
  const expected = positionsOfPitchClass(prompt.targetPc, opts);
  if (fb.check.correct || fb.answer.midi === undefined) return { expected, given: [] };
  const exact = positionsOfMidi(fb.answer.midi, opts);
  return {
    expected,
    given:
      exact.length > 0 ? exact : positionsOfPitchClass(midiToFretNote(fb.answer.midi).pc, opts),
  };
}

/** After a miss: the right note, then the one played (or the degree tapped, in the target's octave). */
export function b1FeedbackAudio(prompt: B1Prompt, fb: Feedback<B1Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  const target = noteName(prompt.targetMidi, prompt.accidentalPref);
  let played: number | null = fb.answer.midi ?? null;
  if (played === null && fb.answer.degree !== undefined) {
    const pc = degreeNote(prompt.key, fb.answer.degree);
    const near = midisInRange(pc).sort(
      (a, b) => Math.abs(a - prompt.targetMidi) - Math.abs(b - prompt.targetMidi),
    );
    played = near[0] ?? null;
  }
  const notes = played === null ? [target] : [target, noteName(played, prompt.accidentalPref)];
  return [{ type: 'notes', notes, gapS: 0.9, durationS: 1.2 }];
}

export function b1Question(prompt: B1Prompt): string {
  return `${keyName(prompt.key)}. Listen, then play the note you heard, or tap its degree.`;
}
