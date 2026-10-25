import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../vendor/fretfree/engine/scheduler';
import type { Skill } from '../types';
import { placementOutcome, placementPlan, seedKnownCards } from './placement';

const skill = (id: string, n: number): Skill => ({
  id,
  title: id,
  drillId: 'd',
  needsGuitar: false,
  items: () => Array.from({ length: n }, (_, i) => ({ id: `${id}:${i}`, skillId: id })),
});
const skills = [
  skill('B1.major', 7),
  skill('B2.primary', 4),
  skill('B3.triads', 6),
  skill('B1.minor', 7),
];

describe('placement', () => {
  it('plans 22 trials over the four parts, in part order', () => {
    const plan = placementPlan(skills, () => 0.5);
    expect(plan).toHaveLength(22);
    expect(plan.every((e) => e.kind === 'review')).toBe(true);
    expect(plan.slice(0, 7).every((e) => e.item.skillId === 'B1.major')).toBe(true);
    expect(plan.slice(-5).every((e) => e.item.skillId === 'B1.minor')).toBe(true);
  });

  it('marks a skill known at 75% over at least four trials', () => {
    const items = skills.flatMap((s) => s.items());
    const byItem = {
      'B1.major:0': { trials: 2, correct: 2 },
      'B1.major:1': { trials: 2, correct: 1 },
      'B2.primary:0': { trials: 2, correct: 2 },
      'B3.triads:0': { trials: 4, correct: 2 },
    };
    const out = placementOutcome(byItem, items);
    expect(out.find((b) => b.skillId === 'B1.major')).toMatchObject({
      trials: 4,
      correct: 3,
      known: true,
    });
    expect(out.find((b) => b.skillId === 'B2.primary')?.known).toBe(false); // too few trials
    expect(out.find((b) => b.skillId === 'B3.triads')?.known).toBe(false);
    const cards = seedKnownCards(out, skills, createScheduler(), new Date('2026-10-23T10:00:00Z'));
    expect(cards).toHaveLength(7);
    expect(cards[0]?.fsrs.due.getTime()).toBeGreaterThan(
      new Date('2026-10-23T10:00:00Z').getTime(),
    );
  });
});
