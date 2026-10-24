import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  confirmShare,
  delayed,
  experimentReport,
  learningRate,
  skillReport,
  tallyBy,
  targetsByDefault,
  transfer,
  trialsToCriterion,
} from './metrics';
import type { TrialEvent } from './types';

const t = (o: Partial<TrialEvent>): TrialEvent => ({
  trialId: 'x',
  sessionId: 's',
  at: new Date(),
  drillId: 'b1',
  itemId: 'degree:1@major',
  skillId: 'B1.major',
  key: 'G',
  mode: 'play',
  correct: true,
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
  ...o,
});

describe('metrics', () => {
  it('tallies by key, transfer and delay', () => {
    const trials = [
      t({ key: 'G' }),
      t({ key: 'G', correct: false }),
      t({ key: 'Bb', unseenKey: true }),
      t({ key: 'Bb', unseenKey: true, retest: '7d', correct: false }),
    ];
    expect(tallyBy(trials, (x) => x.key)).toEqual({
      G: { trials: 2, correct: 1 },
      Bb: { trials: 2, correct: 1 },
    });
    expect(transfer(trials)).toEqual({ trials: 2, correct: 1 });
    expect(delayed(trials)['7d']).toEqual({ trials: 1, correct: 0 });
    expect(delayed(trials)['1d']).toEqual({ trials: 0, correct: 0 });
  });

  it('finds the trial at which a skill reached criterion', () => {
    const seq = [
      ...Array.from({ length: 10 }, () => t({ correct: false })),
      ...Array.from({ length: 25 }, () => t({ correct: true })),
    ];
    // After 10 misses, the 20-trial window first hits 90% at trial 10 + 18 = 28.
    expect(trialsToCriterion(seq, 'B1.major')).toBe(28);
    expect(trialsToCriterion(seq, 'B1.minor')).toBeNull();
    expect(trialsToCriterion(seq.slice(0, 15), 'B1.major')).toBeNull();
  });

  it('reports the confirm share of mic answers', () => {
    expect(confirmShare([t({ mode: 'tap' })])).toBeNull();
    expect(confirmShare([t({ mode: 'play' }), t({ mode: 'confirm' }), t({ mode: 'tap' })])).toBe(
      0.5,
    );
  });

  it('reports a skill: baseline, practice, recent, criterion, learning rate, retests', () => {
    const trials = [
      ...Array.from({ length: 4 }, () => t({ purpose: 'placement', correct: false })),
      ...Array.from({ length: 10 }, () => t({ correct: false })),
      ...Array.from({ length: 25 }, () => t({ correct: true })),
      t({ retest: '7d', unseenKey: true, correct: true }),
      t({ skillId: 'B2.primary' }),
    ];
    const r = skillReport(trials, 'B1.major');
    expect(r.baseline).toEqual({ trials: 4, correct: 0 });
    expect(r.practice.trials).toBe(35);
    expect(r.recent).toBe(1);
    expect(r.trialsToCriterion).toBe(28);
    expect(r.learningRate).toBeGreaterThan(0);
    expect(r.retests['7d']).toEqual({ trials: 1, correct: 1 });
    expect(r.transfer.trials).toBe(1);
    expect(learningRate(trials.slice(0, 5))).toBeNull();
  });

  it('compares arms from what each trial got', () => {
    const trials = [
      t({ imagineFirst: true, correct: true }),
      t({ imagineFirst: false, correct: false }),
      t({ feedbackVariant: 'faded', correct: true }),
      t({ experimentArm: 'imagine=random;feedback=random;labels=moveable-do' }),
    ];
    const report = experimentReport(trials);
    expect(report).toHaveLength(4);
    expect(report[0]?.arms[0]).toEqual({
      label: 'Imagine first',
      tally: { trials: 1, correct: 1 },
    });
    expect(report[1]?.arms[1]?.tally).toEqual({ trials: 1, correct: 1 });
    expect(report[3]?.arms[1]?.tally.trials).toBe(1);
    expect(report[2]?.arms[0]?.tally.trials).toBe(4);
  });

  it('hides the targets once two takes in a row land 80%', () => {
    const take = (sessionId: string, hits: number, n = 4) =>
      Array.from({ length: n }, (_, i) =>
        t({
          sessionId,
          drillId: 'c1-changes',
          itemId: 'changes:roots@I-V-vi-IV',
          correct: i < hits,
        }),
      );
    expect(targetsByDefault([], 'roots')).toBe(true);
    expect(targetsByDefault(take('a', 4), 'roots')).toBe(true);
    expect(targetsByDefault([...take('a', 4), ...take('b', 4)], 'roots')).toBe(false);
    expect(targetsByDefault([...take('a', 4), ...take('b', 2)], 'roots')).toBe(true);
    expect(targetsByDefault([...take('a', 4), ...take('b', 4)], 'thirds')).toBe(true);
  });
});
