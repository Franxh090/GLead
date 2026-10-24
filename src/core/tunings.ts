/**
 * GLead's tuning list (PRD D7): FretFree's two first, then the tunings a
 * stuck intermediate is likely to meet. Kept here rather than in the vendored
 * table so `src/vendor/fretfree` stays as upstream wrote it. CAGED zones on
 * the Keys screen are standard-tuning grips and stay standard only
 * (`core/keymap.ts`); everything else reads the open strings from here.
 */
import {
  TUNINGS as FRETFREE_TUNINGS,
  STANDARD_TUNING,
  type Tuning,
} from '../vendor/fretfree/theory';

const GLEAD_TUNINGS: readonly Tuning[] = [
  {
    id: 'eb-standard',
    name: 'Half step down (E♭A♭D♭G♭B♭E♭)',
    notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
  },
  {
    id: 'd-standard',
    name: 'Whole step down (DGCFAD)',
    notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  },
  { id: 'drop-c', name: 'Drop C (CGCFAD)', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'dadgad', name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'open-g', name: 'Open G (DGDGBD)', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { id: 'open-d', name: 'Open D (DADF♯AD)', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
];

/** Every tuning Settings offers, FretFree's first. */
export const TUNINGS: readonly Tuning[] = [...FRETFREE_TUNINGS, ...GLEAD_TUNINGS];

/** The tuning with this id, or standard when the id is unknown (an old setting, say). */
export function getTuning(id: string): Tuning {
  return TUNINGS.find((t) => t.id === id) ?? STANDARD_TUNING;
}
