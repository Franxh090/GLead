import { describe, expect, it } from 'vitest';
import { assignArms, decodeArms, encodeArms, trialConditions } from './experiments';

describe('experiments', () => {
  it('round-trips arms through the settings string', () => {
    const arms = assignArms(() => 0.9);
    expect(arms.labels).toBe('moveable-do');
    expect(decodeArms(encodeArms(arms))).toEqual(arms);
    expect(decodeArms('default')).toEqual({
      imagine: 'setting',
      feedback: 'full',
      labels: 'numbers',
    });
    expect(decodeArms(undefined).feedback).toBe('full');
  });

  it('flips per trial under random arms and follows the setting otherwise', () => {
    const random = {
      imagine: 'random' as const,
      feedback: 'random' as const,
      labels: 'numbers' as const,
    };
    expect(trialConditions(random, { imagineFirst: false }, () => 0.2)).toEqual({
      imagineFirst: true,
      feedbackVariant: 'full',
    });
    expect(trialConditions(random, { imagineFirst: false }, () => 0.8)).toEqual({
      imagineFirst: false,
      feedbackVariant: 'faded',
    });
    const fixed = {
      imagine: 'setting' as const,
      feedback: 'full' as const,
      labels: 'numbers' as const,
    };
    expect(trialConditions(fixed, { imagineFirst: true }, () => 0.8)).toEqual({
      imagineFirst: true,
      feedbackVariant: 'full',
    });
  });
});
