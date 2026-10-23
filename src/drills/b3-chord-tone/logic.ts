/**
 * B3 "Note against chord" (PRD B3): a chord strums, then one of its notes
 * sounds. Root, 3rd, 5th or 7th? The learner plays it back or taps the tone.
 * This is the bridge to improvising over changes: hearing a note as a chord
 * tone is what landing on one at a change needs.
 *
 * Items are one per tone and chord kind (`chord-tone:3@minor`). The root
 * varies per prompt, drawn from the key pool's tonics, so a card is the
 * sound of "the 3rd of a minor chord", not of one chord.
 */
import { pitchMatches } from '../../vendor/fretfree/mic/tracker';
import {
  chromaticDegree,
  fromHarmonyQuality,
  midiAt,
  midiToFretNote,
  positionsOfMidi,
  positionsOfPitchClass,
  type AccidentalPref,
  type ChordQuality,
  type FretRange,
  type MusicalKey,
  type Position,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { bassOf, chordMidis, noteName } from '../../audio/voicing';
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

export const B3_ID = 'b3-chord-tone';

export const B3_RATIONALE =
  'Every note you play over a chord is a chord tone or a step away from one. Hearing which tone a note is, against the chord that is sounding, is what lets you land on purpose at a change.';

export type ChordTone = '1' | '3' | '5' | '7';
export const TRIAD_TONES: readonly ChordTone[] = ['1', '3', '5'];
export const SEVENTH_TONES: readonly ChordTone[] = ['1', '3', '5', '7'];

/** Chord kinds by stage, with their tones. */
export const B3_KINDS: Record<'triads' | 'sevenths', readonly ChordQuality[]> = {
  triads: ['major', 'minor'],
  sevenths: ['dominant7', 'major7', 'minor7'],
};

export const B3_SKILLS: readonly (Skill & { mode: 'major' })[] = [
  {
    id: 'B3.triads',
    title: 'Chord tones of major and minor chords',
    drillId: B3_ID,
    mode: 'major',
    items: () => b3Items('triads'),
  },
  {
    id: 'B3.sevenths',
    title: 'Chord tones of seventh chords',
    drillId: B3_ID,
    mode: 'major',
    items: () => b3Items('sevenths'),
  },
];

export function b3ItemId(tone: ChordTone, quality: ChordQuality): string {
  return `chord-tone:${tone}@${quality}`;
}

export function parseB3Item(id: string): { tone: ChordTone; quality: ChordQuality } | null {
  const m = /^chord-tone:([1357])@([a-z0-9-]+)$/.exec(id);
  if (!m) return null;
  const quality = m[2] as ChordQuality;
  const tone = m[1] as ChordTone;
  const stage = B3_KINDS.triads.includes(quality)
    ? 'triads'
    : B3_KINDS.sevenths.includes(quality)
      ? 'sevenths'
      : null;
  if (!stage) return null;
  if (stage === 'triads' && tone === '7') return null;
  return { tone, quality };
}

export function b3Items(stage: 'triads' | 'sevenths'): Item[] {
  const tones = stage === 'triads' ? TRIAD_TONES : SEVENTH_TONES;
  return B3_KINDS[stage].flatMap((q) =>
    tones.map((t) => ({ id: b3ItemId(t, q), skillId: `B3.${stage}` })),
  );
}

/** Semitones above the root of each tone in each quality. */
const TONE_SEMITONES: Record<ChordQuality, Partial<Record<ChordTone, number>>> = {
  major: { '1': 0, '3': 4, '5': 7 },
  minor: { '1': 0, '3': 3, '5': 7 },
  diminished: { '1': 0, '3': 3, '5': 6 },
  augmented: { '1': 0, '3': 4, '5': 8 },
  dominant7: { '1': 0, '3': 4, '5': 7, '7': 10 },
  major7: { '1': 0, '3': 4, '5': 7, '7': 11 },
  minor7: { '1': 0, '3': 3, '5': 7, '7': 10 },
  'half-diminished7': { '1': 0, '3': 3, '5': 6, '7': 10 },
  diminished7: { '1': 0, '3': 3, '5': 6, '7': 9 },
};

export function toneSemitones(quality: ChordQuality, tone: ChordTone): number {
  const s = TONE_SEMITONES[quality][tone];
  if (s === undefined) throw new RangeError(`${quality} has no ${tone}`);
  return s;
}

export const B3_REGION: FretRange = { from: 0, to: 12 };
export const B3_TIMING = { restMs: 500, chordS: 2.4, targetS: 1.6 } as const;

export interface B3Prompt {
  itemId: string;
  /** The chord root as a pitch class; the trial's "key". */
  root: string;
  quality: ChordQuality;
  tone: ChordTone;
  tones: readonly ChordTone[];
  /** The strummed chord, with octaves. */
  chord: string[];
  targetPc: string;
  targetMidi: number;
  accidentalPref: AccidentalPref;
  tuning: Tuning;
}

export interface B3Answer {
  midi?: number;
  tone?: ChordTone;
}

export function b3MakePrompt(item: Item, ctx: DrillContext): B3Prompt {
  const ref = parseB3Item(item.id);
  if (!ref) throw new Error(`B3 cannot test item ${item.id}`);
  const root = ctx.key.tonic;
  const bass = bassOf(root);
  const chord = chordMidis(bass, fromHarmonyQuality(ref.quality)).map((m) =>
    noteName(m, ctx.accidentalPref),
  );
  // The target sits in the octave above the bass, or the one above that: inside the chord's register.
  const low = bass + toneSemitones(ref.quality, ref.tone);
  const options = [low + 12, low + 24].filter((m) => m <= 76);
  const targetMidi = options[pick(options.length, ctx.rng)] as number;
  return {
    itemId: item.id,
    root,
    quality: ref.quality,
    tone: ref.tone,
    tones: B3_KINDS.triads.includes(ref.quality) ? TRIAD_TONES : SEVENTH_TONES,
    chord,
    targetPc: midiToFretNote(targetMidi, ctx.accidentalPref).pc,
    targetMidi,
    accidentalPref: ctx.accidentalPref,
    tuning: ctx.tuning,
  };
}

export const TONE_NAMES: Record<ChordTone, string> = {
  '1': 'Root',
  '3': '3rd',
  '5': '5th',
  '7': '7th',
};

export function b3Audio(prompt: B3Prompt): AudioStep[] {
  return [
    { type: 'strum', notes: prompt.chord, durationS: B3_TIMING.chordS },
    { type: 'rest', ms: B3_TIMING.restMs },
    {
      type: 'notes',
      notes: [noteName(prompt.targetMidi, prompt.accidentalPref)],
      durationS: B3_TIMING.targetS,
    },
  ];
}

export function b3AnswerFromInput(prompt: B3Prompt, event: InputEvent): B3Answer | null {
  if (event.kind === 'play' && event.midi !== undefined) return { midi: event.midi };
  if (event.kind === 'tap') {
    if (event.position) return { midi: midiAt(event.position, prompt.tuning) };
    if (event.midi !== undefined) return { midi: event.midi };
  }
  return null;
}

/** Which chord tone a pitch is against the chord, or its chromatic degree from the root. */
export function b3ToneOf(prompt: B3Prompt, midi: number): { tone: ChordTone | null; name: string } {
  const pc = midiToFretNote(midi).pc;
  const semis =
    (((midiToFretNote(midi).chroma - midiToFretNote(bassOf(prompt.root)).chroma) % 12) + 12) % 12;
  for (const t of prompt.tones)
    if (toneSemitones(prompt.quality, t) === semis) return { tone: t, name: TONE_NAMES[t] };
  return { tone: null, name: displayPc(chromaticDegree(prompt.root, pc)) };
}

export function b3Expected(prompt: B3Prompt): string {
  return `the ${TONE_NAMES[prompt.tone].toLowerCase()} (${displayPc(prompt.targetPc)})`;
}

export function b3Check(prompt: B3Prompt, answer: B3Answer): Check {
  const expected = b3Expected(prompt);
  if (answer.tone !== undefined) {
    const correct = answer.tone === prompt.tone;
    const given = TONE_NAMES[answer.tone].toLowerCase();
    return correct
      ? { correct, expected, given }
      : { correct, expected, given, confusedWith: answer.tone };
  }
  if (answer.midi === undefined) return { correct: false, expected, given: '—' };
  const correct = pitchMatches(answer.midi, prompt.targetMidi, 'pitch-class');
  const heard = b3ToneOf(prompt, answer.midi);
  const given = `${displayPc(midiToFretNote(answer.midi, prompt.accidentalPref).name)} (${heard.name.toLowerCase()})`;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given, confusedWith: heard.tone ?? heard.name };
}

export function b3DescribeAnswer(answer: B3Answer): string {
  if (answer.tone !== undefined) return TONE_NAMES[answer.tone];
  if (answer.midi !== undefined) return displayPc(midiToFretNote(answer.midi).name);
  return '—';
}

export function b3FeedbackPositions(
  prompt: B3Prompt,
  fb: Feedback<B3Answer>,
): { expected: Position[]; given: Position[] } {
  const opts = { tuning: prompt.tuning, fretRange: B3_REGION };
  const expected = positionsOfPitchClass(prompt.targetPc, opts);
  if (fb.check.correct || fb.answer.midi === undefined) return { expected, given: [] };
  const exact = positionsOfMidi(fb.answer.midi, opts);
  return {
    expected,
    given: exact.length ? exact : positionsOfPitchClass(midiToFretNote(fb.answer.midi).pc, opts),
  };
}

/** After a miss: the chord again, the right note, then what was played or tapped. */
export function b3FeedbackAudio(prompt: B3Prompt, fb: Feedback<B3Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  const target = noteName(prompt.targetMidi, prompt.accidentalPref);
  let played: number | null = fb.answer.midi ?? null;
  if (played === null && fb.answer.tone !== undefined) {
    played =
      prompt.targetMidi -
      toneSemitones(prompt.quality, prompt.tone) +
      toneSemitones(prompt.quality, fb.answer.tone);
  }
  const notes = played === null ? [target] : [target, noteName(played, prompt.accidentalPref)];
  return [
    { type: 'strum', notes: prompt.chord, durationS: 1.6 },
    { type: 'rest', ms: 200 },
    { type: 'notes', notes, gapS: 0.9, durationS: 1.2 },
  ];
}

const QUALITY_WORDS: Partial<Record<ChordQuality, string>> = {
  major: 'major',
  minor: 'minor',
  dominant7: 'dominant seventh',
  major7: 'major seventh',
  minor7: 'minor seventh',
};

export function b3Question(prompt: B3Prompt): string {
  return `A ${QUALITY_WORDS[prompt.quality] ?? prompt.quality} chord, then one of its notes. Play that note back, or tap which chord tone it is.`;
}

/** The trial's key label is the chord root. */
export function b3KeyOf(root: string): MusicalKey {
  return { tonic: root, mode: 'major' };
}
