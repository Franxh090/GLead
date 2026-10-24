/** Every drill and skill. Add a drill by adding its folder and listing it here. */
import type { KeyMode } from '../vendor/fretfree/theory';
import { t } from '../core/i18n';
import type { AnyDrill, Item, Skill } from '../core/types';
import scaleDegree from './b1-scale-degree/drill';
import { B1_SKILLS } from './b1-scale-degree/logic';
import chordFunction from './b2-chord-function/drill';
import { B2_SKILLS } from './b2-chord-function/logic';
import chordTone from './b3-chord-tone/drill';
import { B3_SKILLS } from './b3-chord-tone/logic';
import findMelody from './b4-find-melody/drill';
import { B4_SKILLS } from './b4-find-melody/logic';
import spotError from './b5-spot-error/drill';
import { B5_SKILLS } from './b5-spot-error/logic';
import intervals from './b8-intervals/drill';
import { B8_SKILLS } from './b8-intervals/logic';
import progressions from './b9-progression/drill';
import { B9_SKILLS } from './b9-progression/logic';

export const DRILLS: readonly AnyDrill[] = [
  scaleDegree,
  chordFunction,
  chordTone,
  findMelody,
  spotError,
  intervals,
  progressions,
];

/** Skills in curriculum order (PRD §12 levels 1–4). `mode` picks the key pool a prompt draws from. */
export const SKILLS: readonly (Skill & { mode: KeyMode })[] = [
  B1_SKILLS[0]!,
  B2_SKILLS[0]!,
  B3_SKILLS[0]!,
  B5_SKILLS[0]!,
  B4_SKILLS[0]!,
  B1_SKILLS[1]!,
  B2_SKILLS[1]!,
  B3_SKILLS[1]!,
  B2_SKILLS[2]!,
  B5_SKILLS[1]!,
  B4_SKILLS[1]!,
  B9_SKILLS[0]!,
  B9_SKILLS[1]!,
  B8_SKILLS[0]!,
  B8_SKILLS[1]!,
];

export function drillById(id: string): AnyDrill {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown drill: ${id}`);
  return d;
}

export function skillById(id: string): Skill & { mode: KeyMode } {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown skill: ${id}`);
  return s;
}

/** A skill's title in the interface language; the registry's `title` stays English for the log and the tests. */
export function skillTitle(id: string): string {
  return t(`skill.${id}`);
}

/** A drill's rationale in the interface language (PRD D5). */
export function rationaleOf(drillId: string): string {
  return t(`rationale.${drillId}`);
}

export function drillForItem(item: Item): AnyDrill {
  return drillById(skillById(item.skillId).drillId);
}

export function modeOfItem(item: Item): KeyMode {
  return skillById(item.skillId).mode;
}
