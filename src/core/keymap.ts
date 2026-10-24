/**
 * The key map (PRD A1, A2): what the Keys screen draws. Pure helpers over
 * FretFree's theory: the scale on the neck with its degrees, a chord's tones,
 * and a chord in three neck zones through its CAGED shapes.
 */
import type { FretMarker } from '../vendor/fretfree/fretboard/Fretboard';
import {
  CAGED_ORDER,
  STANDARD_TUNING,
  cagedShape,
  chordTones,
  chromaOf,
  midiAt,
  midiToFretNote,
  positionsOfPitchClass,
  type CagedQuality,
  type CagedShape,
  type ChordSpec,
  type DiatonicChord,
  type FretRange,
  type MusicalKey,
} from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { DEGREES, degreeLabel, degreeNote } from './keys';
import type { LabelScheme } from './types';

export const KEY_REGION: FretRange = { from: 0, to: 12 };

/** Every scale note in frets 0–12, labelled by degree; the tonic as a root square. */
export function scaleMarkers(
  key: MusicalKey,
  scheme: LabelScheme,
  region = KEY_REGION,
): FretMarker[] {
  return DEGREES.flatMap((d) => {
    const pc = degreeNote(key, d);
    const label = degreeLabel(d, scheme, key.mode);
    return positionsOfPitchClass(pc, { fretRange: region }).map((p) => ({
      ...p,
      style: d === 1 ? ('root' as const) : ('tone' as const),
      label,
      spokenLabel: `${label}, ${displayPc(pc)}`,
      forceLabel: true,
    }));
  });
}

const TONE_STYLES = ['root', 'third', 'fifth', 'seventh'] as const;

/** A chord's tones in frets 0–12: root square, 3rd circle, 5th triangle, 7th hexagon. */
export function chordMarkers(chord: ChordSpec, region = KEY_REGION): FretMarker[] {
  return chordTones(chord).flatMap((pc, i) =>
    positionsOfPitchClass(pc, { fretRange: region }).map((p) => ({
      ...p,
      style: TONE_STYLES[i] ?? ('tone' as const),
      label: displayPc(pc),
      forceLabel: true,
    })),
  );
}

/** The degree a pitch has in the key, for the tap-to-hear line; null outside the scale. */
export function degreeAt(key: MusicalKey, midi: number): number | null {
  const chroma = midi % 12;
  for (const d of DEGREES) if (chromaOf(degreeNote(key, d)) === chroma) return d;
  return null;
}

/** The CAGED quality a chord can be drawn with, or null (diminished and half-diminished have no shapes yet). */
export function cagedQualityOf(chord: ChordSpec): CagedQuality | null {
  switch (chord.quality) {
    case 'major':
    case 'major7':
      return 'major';
    case 'minor':
    case 'minor7':
      return 'minor';
    case 'dominant7':
      return 'dominant7';
    default:
      return null;
  }
}

/** Three zones up the neck, lowest first: the three lowest CAGED placements that fit under fret 15. */
export function chordZones(chord: ChordSpec, count = 3): CagedShape[] {
  const quality = cagedQualityOf(chord);
  if (!quality) return [];
  const shapes = CAGED_ORDER.map((shape) => cagedShape(shape, chord.root, { quality }))
    .filter((s) => Math.max(...s.notes.map((n) => n.fret)) <= 15)
    .sort(
      (a, b) => Math.min(...a.notes.map((n) => n.fret)) - Math.min(...b.notes.map((n) => n.fret)),
    );
  return shapes.slice(0, count);
}

/** The frets a shape spans, padded by one each side and at least four wide. */
export function shapeRange(shape: CagedShape): FretRange {
  const frets = shape.notes.map((n) => n.fret);
  const from = Math.max(0, Math.min(...frets) - 1);
  const to = Math.max(Math.max(...frets) + 1, from + 4);
  return { from, to };
}

/** The shape's notes with octaves, low to high, for a strum. */
export function shapeNotes(shape: CagedShape): string[] {
  return [...shape.notes]
    .sort((a, b) => midiAt(a, STANDARD_TUNING) - midiAt(b, STANDARD_TUNING))
    .map((n) => midiToFretNote(midiAt(n, STANDARD_TUNING)).name);
}

function degreeStyle(degree: string): FretMarker['style'] {
  if (degree === 'R' || degree === '1') return 'root';
  if (degree.includes('3')) return 'third';
  if (degree.includes('7')) return 'seventh';
  return 'fifth';
}

export function shapeMarkers(shape: CagedShape): FretMarker[] {
  return shape.notes.map((n) => ({
    string: n.string,
    fret: n.fret,
    style: degreeStyle(String(n.degree)),
    label: n.degree === 'R' ? '1' : String(n.degree),
    forceLabel: true,
    group: shape.shape,
  }));
}

export function describeChord(chord: DiatonicChord): string {
  return `${chord.roman} ${displayPc(chord.symbol)}`;
}
