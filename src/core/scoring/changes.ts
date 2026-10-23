/**
 * Scoring over the changes (PRD C1, C2): at each chord change the first note
 * that starts inside the window is judged against the ladder rung. Roots
 * first, then 3rds, then 5ths and 7ths, then any chord tone. Pure: the
 * screen feeds it chord cues and notes with their times.
 */
import { chromaOf, fromHarmonyQuality, type ChordSpec } from '../../vendor/fretfree/theory';
import { chordSymbol } from '../../vendor/fretfree/theory';
import { toneSemitones, type ChordTone } from '../../drills/b3-chord-tone/logic';
import type { ChordChangeHit, Scorer } from '../types';

export type Rung = 'roots' | 'thirds' | 'fifths-sevenths' | 'any';

export const RUNGS: readonly { id: Rung; title: string; hint: string }[] = [
  { id: 'roots', title: 'Roots', hint: 'Land on the root at every change.' },
  { id: 'thirds', title: '3rds', hint: 'Land on the 3rd: it says major or minor.' },
  {
    id: 'fifths-sevenths',
    title: '5ths and 7ths',
    hint: 'The 5th, or the 7th where the chord has one.',
  },
  {
    id: 'any',
    title: 'Any chord tone',
    hint: 'Any note of the chord counts; add passing notes between.',
  },
];

/** The tones a rung accepts for a chord. */
export function rungTones(rung: Rung, chord: ChordSpec): ChordTone[] {
  const kind = fromHarmonyQuality(chord.quality);
  const has7 = kind.includes('7');
  const all: ChordTone[] = has7 ? ['1', '3', '5', '7'] : ['1', '3', '5'];
  switch (rung) {
    case 'roots':
      return ['1'];
    case 'thirds':
      return ['3'];
    case 'fifths-sevenths':
      return has7 ? ['5', '7'] : ['5'];
    case 'any':
      return all;
  }
}

/** Which tone of the chord a pitch is, if any. */
export function chordToneOfPitch(chord: ChordSpec, midi: number): ChordTone | null {
  const semis = ((((midi % 12) - chromaOf(chord.root)) % 12) + 12) % 12;
  const kind = fromHarmonyQuality(chord.quality);
  for (const t of ['1', '3', '5', '7'] as const) {
    try {
      if (toneSemitones(chord.quality, t) === semis) return t;
    } catch {
      /* the chord has no such tone */
    }
  }
  void kind;
  return null;
}

export interface ChangeScorerOptions {
  chords: readonly ChordSpec[];
  rung: Rung;
  /** Beats per chord and tempo, for the window. */
  bpm: number;
  /** Notes up to this long before the change still count for it (anticipation). */
  earlyMs?: number;
  /** The window after the change, in beats; default one beat. */
  windowBeats?: number;
}

export interface ChangeRecord extends ChordChangeHit {
  /** Index of the chord in the progression. */
  index: number;
  /** Which pass through the loop. */
  pass: number;
  /** The tones the rung asked for. */
  wanted: ChordTone[];
  /** Hit, miss (a note, but not a wanted tone) or silent (no note in the window). */
  outcome: 'hit' | 'miss' | 'silent';
  /** ms from the change to the note, negative when anticipated. */
  offsetMs: number | null;
  at: number;
}

export interface ChangeScorer extends Scorer {
  result(): ChangeRecord[];
}

export function createChangeScorer(opts: ChangeScorerOptions): ChangeScorer {
  const earlyMs = opts.earlyMs ?? 150;
  const windowMs = ((opts.windowBeats ?? 1) * 60_000) / opts.bpm;
  const records: ChangeRecord[] = [];
  const pending: { midi: number; at: number }[] = [];
  let pass = -1;
  let open: ChangeRecord | null = null;

  const settle = (r: ChangeRecord, midi: number, at: number) => {
    const tone = chordToneOfPitch(opts.chords[r.index] as ChordSpec, midi);
    r.midi = midi;
    r.tone = tone;
    r.offsetMs = at - r.at;
    r.outcome = tone !== null && r.wanted.includes(tone) ? 'hit' : 'miss';
  };

  return {
    start() {
      records.length = 0;
      pending.length = 0;
      pass = -1;
      open = null;
    },
    onChord(index, at) {
      if (index === 0) pass += 1;
      const chord = opts.chords[index];
      if (!chord) return;
      const r: ChangeRecord = {
        bar: records.length + 1,
        index,
        pass,
        chord: chordSymbol(chord),
        wanted: rungTones(opts.rung, chord),
        tone: null,
        midi: null,
        outcome: 'silent',
        offsetMs: null,
        at,
      };
      // A note just before the change was aimed at it.
      const early = pending.find((n) => n.at >= at - earlyMs);
      if (early) settle(r, early.midi, early.at);
      pending.length = 0;
      records.push(r);
      open = r;
    },
    onNote(midi, at) {
      pending.push({ midi, at });
      if (pending.length > 8) pending.shift();
      if (!open || open.outcome !== 'silent') return;
      if (at >= open.at && at <= open.at + windowMs) settle(open, midi, at);
    },
    result() {
      return records.map((r) => ({ ...r }));
    },
  };
}

export function hitRate(records: readonly ChangeRecord[]): number | null {
  return records.length === 0
    ? null
    : records.filter((r) => r.outcome === 'hit').length / records.length;
}
