/**
 * The backing-loop catalogue (PRD A3, C3): the five progressions the PRD
 * names, in any key. Four come from FretFree's catalogue; i–VI–III–VII is
 * spelled the way FretFree's harmony module reads minor keys (against the
 * major scale on the tonic: i–bVI–bIII–bVII).
 */
import {
  PROGRESSIONS,
  chordSymbol,
  progressionChords,
  type KeyMode,
  type MusicalKey,
} from '../vendor/fretfree/theory';

export interface LoopProgression {
  id: string;
  name: string;
  mode: KeyMode;
  numerals: readonly string[];
  description: string;
}

const fromCatalogue = (id: string): LoopProgression => {
  const p = PROGRESSIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown catalogue progression: ${id}`);
  return { id: p.id, name: p.name, mode: p.mode, numerals: p.numerals, description: p.description };
};

export const LOOP_PROGRESSIONS: readonly LoopProgression[] = [
  fromCatalogue('I-V-vi-IV'),
  fromCatalogue('ii-V-I'),
  fromCatalogue('12-bar-blues'),
  fromCatalogue('I-vi-IV-V'),
  {
    id: 'i-bVI-bIII-bVII',
    name: 'i–VI–III–VII',
    mode: 'minor',
    numerals: ['i', 'bVI', 'bIII', 'bVII'],
    description: 'The minor-key four-chord loop of countless rock and pop songs.',
  },
  fromCatalogue('i-bVII-bVI-bVII'),
  fromCatalogue('I-IV-V'),
];

export function loopProgression(id: string): LoopProgression {
  const p = LOOP_PROGRESSIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown loop progression: ${id}`);
  return p;
}

/** Chord symbols of a loop in a key, one per slot. */
export function loopChords(key: MusicalKey, id: string): string[] {
  return progressionChords(key, loopProgression(id).numerals).map(chordSymbol);
}

export const LOOP_FEELS = ['once', 'quarters', 'eighths', 'folk'] as const;
export const LOOP_TEMPOS = [60, 80, 100, 120] as const;
