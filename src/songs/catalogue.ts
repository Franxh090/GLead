/**
 * Tunes for Songs by ear (curriculum level 6), written in scale degrees so
 * they transpose to any key. Only traditional, public-domain and original
 * material (PRD appendix §10: content rights). Rhythm is in beats; a chord
 * lasts its `beats`, so a bar may change chord halfway. Every melody and
 * harmonisation here is GLead's own arrangement.
 */
import type { KeyMode } from '../vendor/fretfree/theory';
import type { Degree } from '../core/keys';

export interface SongNote {
  /** Scale degree, or null for a rest. */
  degree: Degree | null;
  /** Octave relative to the tonic octave: -1, 0 or 1. */
  octave?: -1 | 0 | 1;
  beats: number;
}

export interface SongChord {
  numeral: string;
  beats: number;
}

export interface SongPhrase {
  melody: SongNote[];
  chords: SongChord[];
}

export type SongSource = 'traditional' | 'public-domain' | 'original';

export interface Song {
  id: string;
  /** The English title; the screen translates by `song.<id>.title`. */
  title: string;
  source: SongSource;
  mode: KeyMode;
  beatsPerBar: number;
  bpm: number;
  phrases: SongPhrase[];
}

const n = (degree: Degree, beats = 1, octave: -1 | 0 | 1 = 0): SongNote => ({
  degree,
  beats,
  ...(octave ? { octave } : {}),
});
const rest = (beats: number): SongNote => ({ degree: null, beats });
const c = (numeral: string, beats = 4): SongChord => ({ numeral, beats });

export const SONGS: readonly Song[] = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    source: 'public-domain',
    mode: 'major',
    beatsPerBar: 4,
    bpm: 100,
    phrases: [
      {
        melody: [n(3), n(3), n(4), n(5), n(5), n(4), n(3), n(2)],
        chords: [c('I'), c('V')],
      },
      {
        melody: [n(1), n(1), n(2), n(3), n(3, 1.5), n(2, 0.5), n(2, 2)],
        chords: [c('I'), c('V')],
      },
      {
        melody: [n(3), n(3), n(4), n(5), n(5), n(4), n(3), n(2)],
        chords: [c('I'), c('V')],
      },
      {
        melody: [n(1), n(1), n(2), n(3), n(2, 1.5), n(1, 0.5), n(1, 2)],
        chords: [c('I'), c('V', 2), c('I', 2)],
      },
    ],
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle (Ah! vous dirai-je, maman)',
    source: 'traditional',
    mode: 'major',
    beatsPerBar: 4,
    bpm: 96,
    phrases: [
      {
        melody: [n(1), n(1), n(5), n(5), n(6), n(6), n(5, 2)],
        chords: [c('I'), c('IV', 2), c('I', 2)],
      },
      {
        melody: [n(4), n(4), n(3), n(3), n(2), n(2), n(1, 2)],
        chords: [c('IV', 2), c('I', 2), c('V', 2), c('I', 2)],
      },
      {
        melody: [n(5), n(5), n(4), n(4), n(3), n(3), n(2, 2)],
        chords: [c('I', 2), c('IV', 2), c('I', 2), c('V', 2)],
      },
      {
        melody: [n(5), n(5), n(4), n(4), n(3), n(3), n(2, 2)],
        chords: [c('I', 2), c('IV', 2), c('I', 2), c('V', 2)],
      },
      {
        melody: [n(1), n(1), n(5), n(5), n(6), n(6), n(5, 2)],
        chords: [c('I'), c('IV', 2), c('I', 2)],
      },
      {
        melody: [n(4), n(4), n(3), n(3), n(2), n(2), n(1, 2)],
        chords: [c('IV', 2), c('I', 2), c('V', 2), c('I', 2)],
      },
    ],
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    source: 'traditional',
    mode: 'major',
    beatsPerBar: 4,
    bpm: 110,
    phrases: [
      { melody: [rest(1), n(1), n(3), n(4), n(5, 4)], chords: [c('I'), c('I')] },
      { melody: [rest(1), n(1), n(3), n(4), n(5, 4)], chords: [c('I'), c('I')] },
      {
        melody: [rest(1), n(1), n(3), n(4), n(5), n(3), n(1), n(3), n(2, 4)],
        chords: [c('I'), c('I'), c('V')],
      },
      {
        melody: [n(3), n(3), n(2), n(1), n(1, 1.5), n(3, 0.5), n(5), n(5), n(4, 4)],
        chords: [c('I'), c('I'), c('IV')],
      },
      {
        melody: [n(3), n(4), n(5), n(3), n(1), n(2), n(1, 2)],
        chords: [c('I'), c('V', 2), c('I', 2)],
      },
    ],
  },
  {
    id: 'minor-study',
    title: 'Minor study',
    source: 'original',
    mode: 'minor',
    beatsPerBar: 4,
    bpm: 92,
    phrases: [
      {
        melody: [n(1), n(2), n(3, 2), n(2), n(1), n(7, 2, -1)],
        chords: [c('i'), c('bVII')],
      },
      {
        melody: [n(1), n(3), n(5, 2), n(4), n(3), n(2, 2)],
        chords: [c('i'), c('bVII')],
      },
      {
        melody: [n(3), n(4), n(5, 2), n(6), n(5), n(3, 2)],
        chords: [c('bIII'), c('bVI')],
      },
      {
        melody: [n(2), n(1), n(7, 2, -1), n(1, 4)],
        chords: [c('bVII'), c('i')],
      },
    ],
  },
];

export function songById(id: string): Song {
  const s = SONGS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown song: ${id}`);
  return s;
}
