/**
 * C4 call and response (PRD C4): after a B4 melody has been copied, the
 * learner answers it with a phrase of their own in the same key. Nothing is
 * graded or scheduled; the take is logged so Progress can show how often an
 * answer stays in key, and the feedback names the pentatonic-to-scale bridge
 * (the 4 and the 7 in major, the 2 and the ♭6 in minor) when the phrase
 * never left the box.
 */
import type { FretMarker } from '../../vendor/fretfree/fretboard/Fretboard';
import {
  keyLabel,
  keyName,
  midiToFretNote,
  positionsOfMidi,
  positionsOfPitchClass,
  type AccidentalPref,
  type FretRange,
  type KeyMode,
  type MusicalKey,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { newId } from '../../core/events/ids';
import { degreeAt } from '../../core/keymap';
import { degreeLabel, isUnseenKey, type Degree } from '../../core/keys';
import type { AnswerMode, Check, LabelScheme, TrialEvent } from '../../core/types';

export const C4_ID = 'c4-response';
export const C4_SKILL_ID = 'C4.response';
/** An answer ends after this many notes, or after `C4_SILENCE_MS` without one. */
export const C4_MAX_NOTES = 8;
export const C4_SILENCE_MS = 4000;
export const C4_REGION: FretRange = { from: 0, to: 12 };

export function c4ItemId(mode: KeyMode): string {
  return `response@${mode}`;
}

/** The pentatonic box of the mode, as scale degrees of its own scale. */
export function pentatonicDegrees(mode: KeyMode): readonly Degree[] {
  return mode === 'major' ? [1, 2, 3, 5, 6] : [1, 3, 4, 5, 7];
}

/** The degrees that turn the box into the full scale. */
export function bridgeDegrees(mode: KeyMode): readonly Degree[] {
  return mode === 'major' ? [4, 7] : [2, 6];
}

export interface ResponseNote {
  midi: number;
  /** The scale degree in the key, or null for a note outside it. */
  degree: Degree | null;
}

export interface ResponseAnalysis {
  notes: ResponseNote[];
  inKey: number;
  outOfKey: number;
  /** Degrees used, in order of first appearance. */
  degrees: Degree[];
  /** Every in-key note sits in the pentatonic box (and there was at least one). */
  pentatonicOnly: boolean;
  /** The bridge degrees the phrase used. */
  bridge: Degree[];
  /** The last note is 1, 3 or 5: a chord tone of I. */
  landedHome: boolean;
}

export function analyseResponse(key: MusicalKey, midis: readonly number[]): ResponseAnalysis {
  const notes: ResponseNote[] = midis.map((midi) => {
    const d = degreeAt(key, midi);
    return { midi, degree: d === null ? null : (d as Degree) };
  });
  const degrees: Degree[] = [];
  for (const n of notes)
    if (n.degree !== null && !degrees.includes(n.degree)) degrees.push(n.degree);
  const pent = pentatonicDegrees(key.mode);
  const inKey = notes.filter((n) => n.degree !== null).length;
  const last = notes[notes.length - 1];
  return {
    notes,
    inKey,
    outOfKey: notes.length - inKey,
    degrees,
    pentatonicOnly: inKey > 0 && degrees.every((d) => pent.includes(d)),
    bridge: bridgeDegrees(key.mode).filter((d) => degrees.includes(d)),
    landedHome: last !== undefined && last.degree !== null && [1, 3, 5].includes(last.degree),
  };
}

export type Verdict = 'empty' | 'strays' | 'pentatonic' | 'inKey';

/** What the feedback leads with. */
export function c4Verdict(a: ResponseAnalysis): Verdict {
  if (a.notes.length === 0) return 'empty';
  if (a.outOfKey > 0) return 'strays';
  if (a.pentatonicOnly) return 'pentatonic';
  return 'inKey';
}

/** The degrees of a phrase as the learner reads them, e.g. `1 3 5` or `do mi sol`. */
export function c4DegreeLabels(
  key: MusicalKey,
  degrees: readonly Degree[],
  scheme: LabelScheme,
): string {
  return degrees.map((d) => degreeLabel(d, scheme, key.mode)).join(' ');
}

/**
 * The log's view of a take: "correct" means a phrase of two notes or more
 * that stayed in the key. No card is reviewed on it.
 */
export function c4Check(key: MusicalKey, midis: readonly number[]): Check {
  const a = analyseResponse(key, midis);
  const given =
    a.notes.length === 0
      ? 'nothing'
      : a.notes
          .map((n) =>
            n.degree === null ? `(${displayPc(midiToFretNote(n.midi).pc)})` : String(n.degree),
          )
          .join(' ');
  return {
    correct: a.notes.length >= 2 && a.outOfKey === 0,
    expected: `a phrase in ${keyName(key)}`,
    given,
  };
}

export interface C4TrialInput {
  sessionId: string;
  key: MusicalKey;
  midis: readonly number[];
  /** `play` through the mic, `tap` on the neck. */
  mode: AnswerMode;
  at: Date;
  responseMs: number;
  experimentArm: string;
  schedule: 'interleaved' | 'blocked';
  rng?: () => number;
}

/** The TrialEvent a take writes (PRD §6: every trial is logged, graded or not). */
export function c4Trial(input: C4TrialInput): TrialEvent {
  const check = c4Check(input.key, input.midis);
  return {
    trialId: newId('t', input.rng),
    sessionId: input.sessionId,
    at: input.at,
    drillId: C4_ID,
    itemId: c4ItemId(input.key.mode),
    skillId: C4_SKILL_ID,
    key: keyLabel(input.key),
    mode: input.mode,
    correct: check.correct,
    expected: check.expected,
    given: check.given,
    responseMs: input.responseMs,
    confidence: 1,
    rating: check.correct ? 3 : 1,
    imagineFirst: false,
    feedbackVariant: 'full',
    experimentArm: input.experimentArm,
    retest: 'none',
    unseenKey: isUnseenKey(input.key),
    purpose: 'practice',
    schedule: input.schedule,
  };
}

/** The answer on the neck: in-key notes labelled by degree, strays by name, where they were played. */
export function c4Markers(
  key: MusicalKey,
  midis: readonly number[],
  tuning: Tuning,
  pref: AccidentalPref,
  scheme: LabelScheme,
): FretMarker[] {
  const opts = { tuning, fretRange: C4_REGION };
  const seen = new Set<string>();
  const out: FretMarker[] = [];
  for (const n of analyseResponse(key, midis).notes) {
    const exact = positionsOfMidi(n.midi, opts);
    const pcs = exact.length ? exact : positionsOfPitchClass(midiToFretNote(n.midi).pc, opts);
    for (const p of pcs) {
      const id = `${p.string}:${p.fret}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        ...p,
        style: n.degree === null ? 'wrong' : 'correct',
        label:
          n.degree === null
            ? displayPc(midiToFretNote(n.midi, pref).pc)
            : degreeLabel(n.degree, scheme, key.mode),
        forceLabel: true,
      });
    }
  }
  return out;
}
