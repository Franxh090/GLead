import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../vendor/fretfree/engine/scheduler';
import type { Item } from '../types';
import { interleave, newItemCap, planSession, sessionLength, spreadRepeats } from './plan';

const items: Item[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
  id: `degree:${d}@major`,
  skillId: 'B1.major',
}));
const now = new Date('2026-10-22T10:00:00Z');
const seq = () => {
  let x = 0.1;
  return () => (x = (x * 9301 + 0.49297) % 1);
};

describe('sizes', () => {
  it('turns minutes into trials and a new-item cap', () => {
    expect(sessionLength(10)).toBe(75);
    expect(sessionLength(0.5)).toBe(6);
    expect(newItemCap(10)).toBe(6);
    expect(newItemCap(2)).toBe(3);
  });
});

describe('interleave', () => {
  it('spreads two lists evenly and keeps every entry', () => {
    const a = ['a1', 'a2', 'a3'].map((id) => ({
      item: { id, skillId: 's' },
      kind: 'review' as const,
    }));
    const b = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map((id) => ({
      item: { id, skillId: 's' },
      kind: 'new' as const,
    }));
    const out = interleave(a, b).map((e) => e.item.id);
    expect(out).toHaveLength(9);
    expect(new Set(out).size).toBe(9);
    expect(out.indexOf('a2')).toBeGreaterThan(out.indexOf('b1'));
  });

  it('breaks up runs of the same item', () => {
    const e = (id: string) => ({ item: { id, skillId: 's' }, kind: 'new' as const });
    const out = spreadRepeats([e('x'), e('x'), e('y'), e('y'), e('z')]).map((p) => p.item.id);
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
  });
});

describe('planSession', () => {
  it('introduces new items in blocks with reps and fills the budget', () => {
    const plan = planSession({
      now,
      minutes: 2,
      items,
      cards: [],
      scheduler: createScheduler(),
      rng: seq(),
    });
    expect(plan).toHaveLength(sessionLength(2));
    const ids = new Set(plan.map((p) => p.item.id));
    expect(ids.size).toBe(3);
    expect(plan.filter((p) => p.kind === 'new')).toHaveLength(6);
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.item.id).not.toBe(plan[i - 1]!.item.id);
  });

  it('puts due reviews before more new items', () => {
    const scheduler = createScheduler();
    const old = new Date('2026-09-01T10:00:00Z');
    const cards = items.slice(0, 3).map((i) => scheduler.review(scheduler.newCard(i, old), 3, old));
    const plan = planSession({ now, minutes: 1, items, cards, scheduler, rng: seq() });
    expect(plan.filter((p) => p.kind === 'review').length).toBeGreaterThanOrEqual(3);
    expect(plan.some((p) => p.kind === 'new')).toBe(true);
  });
});
