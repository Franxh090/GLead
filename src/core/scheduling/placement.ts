/**
 * The placement test (PRD D1): a fixed pass over the first skills, answered
 * like any drill but with no retries and no card updates, so it measures.
 * Skills at or above `knownAbove` are seeded as known: their items enter
 * review rotation instead of new blocks (FretFree's seeded cards).
 */
import type { Scheduler } from '../../vendor/fretfree/engine/scheduler';
import type { CardRecord, Item, Skill } from '../types';
import type { PlanEntry } from './plan';
import { shuffle } from './plan';

export const PLACEMENT = {
  /** Skill IDs in the order they are tested, with how many of their items. */
  parts: [
    { skillId: 'B1.major', count: 7 },
    { skillId: 'B2.primary', count: 4 },
    { skillId: 'B3.triads', count: 6 },
    { skillId: 'B1.minor', count: 5 },
  ],
  /** A skill with this accuracy or better is seeded as known. */
  knownAbove: 0.75,
  /** Trials of a skill needed before its baseline counts. */
  minTrials: 4,
} as const;

export function placementPlan(skills: readonly Skill[], rng: () => number): PlanEntry[] {
  const out: PlanEntry[] = [];
  for (const part of PLACEMENT.parts) {
    const skill = skills.find((s) => s.id === part.skillId);
    if (!skill) continue;
    const items = shuffle([...skill.items()], rng).slice(0, part.count);
    for (const item of items) out.push({ item, kind: 'review' });
  }
  return out;
}

export interface SkillBaseline {
  skillId: string;
  trials: number;
  correct: number;
  known: boolean;
}

export function placementOutcome(
  byItem: Record<string, { trials: number; correct: number }>,
  items: readonly Item[],
): SkillBaseline[] {
  const by = new Map<string, SkillBaseline>();
  for (const item of items) {
    const t = byItem[item.id];
    if (!t) continue;
    const b = by.get(item.skillId) ?? {
      skillId: item.skillId,
      trials: 0,
      correct: 0,
      known: false,
    };
    b.trials += t.trials;
    b.correct += t.correct;
    by.set(item.skillId, b);
  }
  return [...by.values()].map((b) => ({
    ...b,
    known: b.trials >= PLACEMENT.minTrials && b.correct / b.trials >= PLACEMENT.knownAbove,
  }));
}

/** Known cards for every item of every skill the placement found known. */
export function seedKnownCards(
  outcome: readonly SkillBaseline[],
  skills: readonly Skill[],
  scheduler: Pick<Scheduler, 'seedKnownCard'>,
  now: Date,
): CardRecord[] {
  return outcome
    .filter((b) => b.known)
    .flatMap((b) => skills.find((s) => s.id === b.skillId)?.items() ?? [])
    .map((item) => scheduler.seedKnownCard(item, now));
}
