/**
 * The Mic lab (research R2): the in-app harness that measures the detector
 * on this device and this guitar. Three parts, each a list of prompts the
 * screen walks through:
 *
 * - **Notes**: 24 positions across the neck; play each. Records what was
 *   heard, how sure the detector was, and whether it matched.
 * - **Wrong notes**: 8 prompts to play the fret *above* the named one, to
 *   see whether a wrong play is accepted as the named note.
 * - **Latency**: 12 clicks at 60 bpm; pluck on each. The offset from click to
 *   stable note, over many plucks, is the detector's latency plus the
 *   player's timing; the median is what matters.
 *
 * Pure: the screen feeds results in and reads the summary out.
 */
import {
  STANDARD_TUNING,
  midiAt,
  midiToFretNote,
  type Position,
  type Tuning,
} from '../vendor/fretfree/theory';
import { pitchMatches } from '../vendor/fretfree/mic/tracker';

export type MicLabPart = 'notes' | 'wrong' | 'latency';

export interface MicLabPrompt {
  part: MicLabPart;
  index: number;
  /** The position named to the player. */
  position: Position;
  /** What the player is asked to play (the fret above, in the wrong set). */
  play: Position;
  expectedMidi: number;
}

/** Six strings at frets 0, 3, 5, 7, 9 and 12, low to high: 24 notes with repeats at the octave. */
export const NOTE_SET: readonly Position[] = [6, 5, 4, 3, 2, 1].flatMap((string) =>
  [0, 5, 9, 12].map((fret) => ({ string, fret })),
);
export const WRONG_SET: readonly Position[] = [
  { string: 6, fret: 3 },
  { string: 5, fret: 7 },
  { string: 4, fret: 2 },
  { string: 3, fret: 4 },
  { string: 2, fret: 8 },
  { string: 1, fret: 5 },
  { string: 5, fret: 0 },
  { string: 3, fret: 9 },
];
export const LATENCY = { clicks: 12, bpm: 60, windowMs: 700 } as const;

export function micLabPrompts(tuning: Tuning = STANDARD_TUNING): MicLabPrompt[] {
  const notes = NOTE_SET.map((p, index) => ({
    part: 'notes' as const,
    index,
    position: p,
    play: p,
    expectedMidi: midiAt(p, tuning),
  }));
  const wrong = WRONG_SET.map((p, index) => ({
    part: 'wrong' as const,
    index,
    position: p,
    play: { string: p.string, fret: p.fret + 1 },
    expectedMidi: midiAt(p, tuning),
  }));
  return [...notes, ...wrong];
}

export interface MicLabRecord {
  part: MicLabPart;
  index: number;
  expectedMidi: number;
  heardMidi: number | null;
  cents: number | null;
  confidence: number | null;
  /** Notes and wrong set: ms from the prompt to the stable note. Latency: ms from the click. */
  ms: number | null;
}

export interface MicLabRun {
  id?: number;
  at: Date;
  userAgent: string;
  confirmBelow: number;
  records: MicLabRecord[];
  /** The summary without its function, so IndexedDB can store it. */
  summary: Omit<MicLabSummary, 'heardName'>;
}

export interface MicLabSummary {
  /** Correct plays heard as the named pitch (any octave) / correct plays heard at all. */
  correctAccepted: number | null;
  /** Correct plays heard at the exact pitch. */
  correctExact: number | null;
  /** Correct plays with confidence below the confirm threshold. */
  confirmShare: number | null;
  /** Wrong plays (the fret above) heard as the named note. */
  wrongAccepted: number | null;
  /** Prompts where nothing was heard. */
  silent: number;
  medianLatencyMs: number | null;
  latencySpreadMs: number | null;
  /** The confidence that 90% of correct plays reach: a threshold that would confirm one in ten. */
  suggestedConfirmBelow: number | null;
  heardName(midi: number): string;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

function quantile(xs: number[], q: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[i] as number;
}

export function summarise(records: readonly MicLabRecord[], confirmBelow: number): MicLabSummary {
  const notes = records.filter((r) => r.part === 'notes');
  const heard = notes.filter((r) => r.heardMidi !== null);
  const accepted = heard.filter((r) =>
    pitchMatches(r.heardMidi as number, r.expectedMidi, 'pitch-class'),
  );
  const exact = heard.filter((r) => r.heardMidi === r.expectedMidi);
  const wrong = records.filter((r) => r.part === 'wrong' && r.heardMidi !== null);
  const wrongAccepted = wrong.filter((r) =>
    pitchMatches(r.heardMidi as number, r.expectedMidi, 'pitch-class'),
  );
  const latencies = records
    .filter((r) => r.part === 'latency' && r.ms !== null)
    .map((r) => r.ms as number);
  const confidences = accepted.map((r) => r.confidence ?? 0);
  const q10 = quantile(confidences, 0.1);
  const q25 = quantile(latencies, 0.25);
  const q75 = quantile(latencies, 0.75);
  return {
    correctAccepted: heard.length ? accepted.length / heard.length : null,
    correctExact: heard.length ? exact.length / heard.length : null,
    confirmShare: accepted.length
      ? accepted.filter((r) => (r.confidence ?? 0) < confirmBelow).length / accepted.length
      : null,
    wrongAccepted: wrong.length ? wrongAccepted.length / wrong.length : null,
    silent: records.filter((r) => r.part !== 'latency' && r.heardMidi === null).length,
    medianLatencyMs: median(latencies),
    latencySpreadMs: q25 !== null && q75 !== null ? q75 - q25 : null,
    suggestedConfirmBelow:
      q10 === null ? null : Math.round(Math.max(0, Math.min(0.95, q10)) * 20) / 20,
    heardName: (midi) => midiToFretNote(midi).name,
  };
}

/** The summary without its function, for storage. */
export function storableSummary(s: MicLabSummary): Omit<MicLabSummary, 'heardName'> {
  const { heardName: _h, ...rest } = s;
  return rest;
}
