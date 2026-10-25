import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../vendor/fretfree/engine/scheduler';
import type { Item, TrialEvent } from '../types';
import { bandDecision, planSession, recentBySkill, sessionShape } from './plan';

const now = new Date('2026-10-25T10:00:00Z');
const b1: Item[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
  id: `degree:${d}@major`,
  skillId: 'B1.major',
}));
const b3: Item[] = ['1', '3', '5'].map((t) => ({
  id: `chord-tone:${t}@major`,
  skillId: 'B3.triads',
}));
const seq = () => {
  let x = 0.1;
  return () => (x = (x * 9301 + 0.49297) % 1);
};
const t = (skillId: string, correct: boolean, o: Partial<TrialEvent> = {}): TrialEvent => ({
  trialId: 'x',
  sessionId: 's',
  at: now,
  drillId: 'd',
  itemId: 'i',
  skillId,
  key: 'G',
  mode: 'tap',
  correct,
  expected: '',
  given: '',
  responseMs: 0,
  confidence: 1,
  rating: Rating.Good,
  imagineFirst: false,
  feedbackVariant: 'full',
  experimentArm: 'default',
  retest: 'none',
  unseenKey: false,
  purpose: 'practice',
  ...o,
});

describe('the adaptive band (B7)', () => {
  it('decides nothing on few answers, holds below 75%, widens above 92%', () => {
    expect(bandDecision(undefined)).toBe('steady');
    expect(bandDecision({ trials: 9, correct: 0 })).toBe('steady');
    expect(bandDecision({ trials: 10, correct: 7 })).toBe('hold');
    expect(bandDecision({ trials: 20, correct: 17 })).toBe('steady');
    expect(bandDecision({ trials: 20, correct: 19 })).toBe('widen');
  });

  it('tallies the last twenty practice trials per skill, leaving retests and placement out', () => {
    const trials = [
      ...Array.from({ length: 25 }, (_, i) => t('B1.major', i >= 5)),
      t('B1.major', false, { retest: '7d' }),
      t('B1.major', false, { purpose: 'placement' }),
      t('B3.triads', true),
    ];
    expect(recentBySkill(trials, ['B1.major', 'B3.triads'])).toEqual({
      'B1.major': { trials: 20, correct: 20 },
      'B3.triads': { trials: 1, correct: 1 },
    });
  });

  it('holds a struggling skill to reviews and gives a strong one an extra new item', () => {
    const base = {
      now,
      minutes: 2,
      items: [...b1, ...b3],
      cards: [],
      scheduler: createScheduler(),
    };
    const held = planSession({
      ...base,
      rng: seq(),
      recent: { 'B3.triads': { trials: 10, correct: 5 } },
    });
    expect(held.filter((p) => p.kind === 'new').every((p) => p.item.skillId === 'B1.major')).toBe(
      true,
    );
    const plain = planSession({ ...base, rng: seq() });
    const widened = planSession({
      ...base,
      rng: seq(),
      recent: { 'B1.major': { trials: 20, correct: 20 } },
    });
    const newIds = (plan: typeof plain) =>
      new Set(plan.filter((p) => p.kind === 'new').map((p) => p.item.id));
    expect(newIds(widened).size).toBe(newIds(plain).size + 1);
  });

  it('says in the goal which skills are being held', () => {
    const plan = planSession({
      now,
      minutes: 5,
      items: b1,
      cards: [],
      scheduler: createScheduler(),
      rng: seq(),
    });
    const shape = sessionShape(plan, 5, (id) => id, undefined, true, ['B3.triads']);
    expect(shape.goal).toMatch(/holding B3\.triads steady with reviews/);
  });
});
