import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { confirmShare, delayed, tallyBy, transfer, trialsToCriterion } from './metrics';
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
});
