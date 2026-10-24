/**
 * "Why it works" cards (PRD A4): one short paragraph each, read after the
 * sound has been heard (research finding 11: hear first, label second), and
 * the capo helper (PRD A4, topic C10). The cards' text lives in `i18n.ts`
 * under `why.<id>.title` and `why.<id>.body`; this module keeps what to play.
 */
import {
  capoFret,
  keyName,
  parseKey,
  relativeMinor,
  type MusicalKey,
} from '../vendor/fretfree/theory';

export interface WhyCard {
  id: string;
  /** The numerals the Keys screen strums before showing the card. */
  hear: readonly string[];
}

export const WHY_CARDS: readonly WhyCard[] = [
  { id: 'v-pulls-home', hear: ['V', 'I'] },
  { id: 'iv-lifts', hear: ['I', 'IV'] },
  { id: 'vi-darkens', hear: ['I', 'vi'] },
  { id: 'ii-v-i', hear: ['ii', 'V', 'I'] },
  { id: 'twelve-bar', hear: ['I7', 'IV7', 'V7', 'I7'] },
  { id: 'minor-vii', hear: ['i', 'bVII', 'bVI', 'bVII'] },
];

export interface CapoAnswer {
  /** 0 when the two keys are the same. */
  fret: number;
  /** The key the song sounds in, named. */
  sounding: string;
  /** The key whose open shapes are played, named. */
  shapes: string;
}

/** A song in `sounding` played with the open shapes of `shapes`: which fret? The screen words it. */
export function capoHelper(sounding: string, shapes: string): CapoAnswer {
  return {
    fret: capoFret(parseKey(sounding), parseKey(shapes)),
    sounding: keyName(parseKey(sounding)),
    shapes: keyName(parseKey(shapes)),
  };
}

/** The key's neighbours on the circle: its IV and V keys and its relative key. */
export function keyNeighbours(key: MusicalKey): {
  subdominant: string;
  dominant: string;
  relative: string;
} {
  const up = parseKey(key.tonic);
  const fifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const chroma = (pc: string) => parseKey(pc).tonic;
  void chroma;
  void up;
  const major = key.mode === 'major' ? key.tonic : relativeMajorOf(key.tonic);
  const i = fifths.findIndex(
    (k) => parseKey(k).tonic === parseKey(major).tonic || sameChroma(k, major),
  );
  const dominant = fifths[(i + 1) % 12] as string;
  const subdominant = fifths[(i + 11) % 12] as string;
  return {
    subdominant,
    dominant,
    relative: key.mode === 'major' ? `${relativeMinor(key.tonic)}m` : major,
  };
}

function sameChroma(a: string, b: string): boolean {
  const semis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const chroma = (pc: string) => {
    let c = semis[pc[0] as string] ?? 0;
    for (const ch of pc.slice(1)) c += ch === '#' ? 1 : ch === 'b' ? -1 : 0;
    return ((c % 12) + 12) % 12;
  };
  return chroma(a) === chroma(b);
}

function relativeMajorOf(minorTonic: string): string {
  const fifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  // The relative major is three half steps up.
  const semis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let c = semis[minorTonic[0] as string] ?? 0;
  for (const ch of minorTonic.slice(1)) c += ch === '#' ? 1 : ch === 'b' ? -1 : 0;
  const target = (((c + 3) % 12) + 12) % 12;
  return fifths.find((k) =>
    sameChroma(
      k,
      ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][target] as string,
    ),
  ) as string;
}
