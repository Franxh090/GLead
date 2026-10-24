/**
 * "Why it works" cards (PRD A4): one short paragraph each, read after the
 * sound has been heard (research finding 11: hear first, label second), and
 * the capo helper (PRD A4, topic C10).
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
  title: string;
  body: string;
  /** The numerals the Keys screen strums before showing the card. */
  hear: readonly string[];
}

export const WHY_CARDS: readonly WhyCard[] = [
  {
    id: 'v-pulls-home',
    title: 'Why V pulls home',
    hear: ['V', 'I'],
    body: 'The V chord holds the 7th degree of the key, one half step under the tonic, and (as V7) the 4th, one half step over the 3rd. Both lean on their neighbours, so the chord sounds unfinished until the I resolves it.',
  },
  {
    id: 'iv-lifts',
    title: 'Why IV lifts away',
    hear: ['I', 'IV'],
    body: 'IV shares the tonic with I but swaps the 3rd and 5th for the 4th and 6th: the ground stays, the roof moves up. It feels like stepping away from home without leaving the key.',
  },
  {
    id: 'vi-darkens',
    title: 'Why vi sounds sad',
    hear: ['I', 'vi'],
    body: 'vi shares two notes with I (the tonic and the 3rd) and replaces the 5th with the 6th. Same colour, minor shape: the relative minor. That is why I–vi–IV–V and vi–IV–I–V are the same four chords with a different mood.',
  },
  {
    id: 'ii-v-i',
    title: 'Why ii–V–I is the jazz cadence',
    hear: ['ii', 'V', 'I'],
    body: 'Roots falling by fifths (2 → 5 → 1) is the strongest motion in the key, and ii shares three notes with IV, so ii–V–I is IV–V–I with a minor colour in front of the pull home.',
  },
  {
    id: 'twelve-bar',
    title: 'Why the 12-bar blues uses dominant sevenths everywhere',
    hear: ['I7', 'IV7', 'V7', 'I7'],
    body: 'In the blues every chord is a dominant seventh, so every chord pulls somewhere and none of them is quite at rest. The ♭7 on the I chord is the blue note that major harmony does not have.',
  },
  {
    id: 'minor-vii',
    title: 'Why minor keys lean on ♭VII and ♭VI',
    hear: ['i', 'bVII', 'bVI', 'bVII'],
    body: 'Natural minor has no leading tone, so its V is minor and weak. ♭VII and ♭VI are the major chords a whole step and a half step under the tonic; rock minor vamps live on them because they move without pulling.',
  },
];

export interface CapoAnswer {
  fret: number;
  text: string;
}

/** A song in `sounding` played with the open shapes of `shapes`: which fret? */
export function capoHelper(sounding: string, shapes: string): CapoAnswer {
  const fret = capoFret(parseKey(sounding), parseKey(shapes));
  const s = keyName(parseKey(sounding));
  const sh = keyName(parseKey(shapes));
  if (fret === 0)
    return { fret, text: `${s} with ${sh} shapes needs no capo: they are the same key.` };
  return {
    fret,
    text: `Capo on fret ${fret}: ${sh} shapes sound in ${s}. Each fret of capo raises the shapes one half step.`,
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
