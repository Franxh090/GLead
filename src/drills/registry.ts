/** Every drill and skill. Add a drill by adding its folder and listing it here. */
import type { KeyMode } from '../vendor/fretfree/theory';
import type { AnyDrill, Item, Skill } from '../core/types';
import scaleDegree from './b1-scale-degree/drill';
import { B1_SKILLS } from './b1-scale-degree/logic';

export const DRILLS: readonly AnyDrill[] = [scaleDegree];

export const SKILLS: readonly (Skill & { mode: KeyMode })[] = [...B1_SKILLS];

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

export function drillForItem(item: Item): AnyDrill {
  return drillById(skillById(item.skillId).drillId);
}

export function modeOfItem(item: Item): KeyMode {
  return skillById(item.skillId).mode;
}
