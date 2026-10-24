import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../vendor/fretfree/engine/scheduler';
import type { Item } from '../types';
import {
  interleave,
  newItemCap,
  planSession,
  roundRobinBySkill,
  sessionLength,
  sessionShape,
  spreadRepeats,
  spreadSkills,
  warmUpFirst,
} from './plan';

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

describe('skills interleaved (B7)', () => {
  const b1: Item[] = [1, 2, 3].map((d) => ({ id: `degree:${d}@major`, skillId: 'B1.major' }));
  const b3: Item[] = ['1', '3', '5'].map((t) => ({
    id: `chord-tone:${t}@major`,
    skillId: 'B3.triads',
  }));

  it('deals new items of several skills in turns', () => {
    expect(roundRobinBySkill([...b1, ...b3]).map((i) => i.skillId)).toEqual([
      'B1.major',
      'B3.triads',
      'B1.major',
      'B3.triads',
      'B1.major',
      'B3.triads',
    ]);
  });

  it('breaks runs of three of one skill', () => {
    const e = (item: Item) => ({ item, kind: 'new' as const });
    const out = spreadSkills([e(b1[0]!), e(b1[1]!), e(b1[2]!), e(b3[0]!), e(b3[1]!), e(b3[2]!)]);
    for (let i = 2; i < out.length; i++) {
      const run =
        out[i]!.item.skillId === out[i - 1]!.item.skillId &&
        out[i - 1]!.item.skillId === out[i - 2]!.item.skillId;
      expect(run).toBe(false);
    }
    expect(out).toHaveLength(6);
  });

  it('a session over two skills opens items of both', () => {
    const plan = planSession({
      now,
      minutes: 2,
      items: [...b1, ...b3],
      cards: [],
      scheduler: createScheduler(),
      rng: seq(),
    });
    const skills = new Set(plan.filter((p) => p.kind === 'new').map((p) => p.item.skillId));
    expect(skills.size).toBe(2);
  });
});

describe('session shape (D2)', () => {
  const e = (id: string, skillId: string, kind: 'review' | 'new') => ({
    item: { id, skillId },
    kind,
  });
  it('states the goal and puts reviews first', () => {
    const plan = [
      e('a', 'B1.major', 'new'),
      e('b', 'B1.major', 'review'),
      e('c', 'B3.triads', 'new'),
      e('d', 'B2.primary', 'review'),
    ];
    const shape = sessionShape(plan, 10, (id) => id);
    expect(shape.goal).toBe(
      '2 reviews to warm up, new: B1.major and B3.triads, then 2 minutes over a loop.',
    );
    expect(sessionShape(plan, 5, (id) => id).playAlong).toBeNull();
    expect(warmUpFirst(plan).map((x) => x.kind)).toEqual(['review', 'review', 'new', 'new']);
    expect(sessionShape([], 5, (id) => id).goal).toBe('A short pass over what you know.');
  });
});

describe('blocked practice (the control arm)', () => {
  const b1: Item[] = [1, 2, 3].map((d) => ({ id: `degree:${d}@major`, skillId: 'B1.major' }));
  const b3: Item[] = ['1', '3', '5'].map((t) => ({
    id: `chord-tone:${t}@major`,
    skillId: 'B3.triads',
  }));
  it('keeps each skill together and still never repeats an item back to back', () => {
    const plan = planSession({
      now,
      minutes: 2,
      items: [...b1, ...b3],
      cards: [],
      scheduler: createScheduler(),
      rng: seq(),
      blocked: true,
    });
    const skills = plan.map((p) => p.item.skillId);
    const changes = skills.filter((s, i) => i > 0 && s !== skills[i - 1]).length;
    expect(changes).toBeLessThanOrEqual(2);
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.item.id).not.toBe(plan[i - 1]!.item.id);
  });
});
