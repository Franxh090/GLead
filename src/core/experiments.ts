/**
 * The learning experiments built into the product (PRD §6, research
 * appendix §9). Each learner is assigned arms once, at first run, and the
 * trial log records what every trial got, so the dashboard can compare.
 * Early results are n-of-1 and are reported as such.
 *
 * - `imagine`: a silent beat between hearing and playing, on or off per
 *   trial at random (`random`), or fixed by the learner's setting (`setting`).
 * - `feedback`: full feedback (markers on the neck after every answer) or
 *   faded (after a correct answer, only a tick), per trial at random or
 *   fixed.
 * - `labels`: numbers or moveable-do, drawn once (the learner can change it
 *   in Settings; the trial log keeps what each trial showed).
 */
import { pick } from './keys';
import type { LabelScheme } from './types';

export interface Arms {
  imagine: 'random' | 'setting';
  feedback: 'random' | 'full';
  labels: LabelScheme;
}

export const DEFAULT_ARMS: Arms = { imagine: 'setting', feedback: 'full', labels: 'numbers' };

/** Draw a learner's arms at first run. */
export function assignArms(rng: () => number): Arms {
  return {
    imagine: 'random',
    feedback: 'random',
    labels: (['numbers', 'moveable-do'] as const)[pick(2, rng)] as LabelScheme,
  };
}

/** `imagine=random;feedback=random;labels=numbers`, as stored in settings and on every trial. */
export function encodeArms(arms: Arms): string {
  return `imagine=${arms.imagine};feedback=${arms.feedback};labels=${arms.labels}`;
}

export function decodeArms(s: string | undefined): Arms {
  if (!s || !s.includes('=')) return DEFAULT_ARMS;
  const out = { ...DEFAULT_ARMS };
  for (const part of s.split(';')) {
    const [k, v] = part.split('=');
    if (k === 'imagine' && (v === 'random' || v === 'setting')) out.imagine = v;
    if (k === 'feedback' && (v === 'random' || v === 'full')) out.feedback = v;
    if (k === 'labels' && (v === 'numbers' || v === 'moveable-do')) out.labels = v;
  }
  return out;
}

/** What one trial gets under the arms: the per-trial coin flips happen here. */
export function trialConditions(
  arms: Arms,
  settings: { imagineFirst: boolean },
  rng: () => number,
): { imagineFirst: boolean; feedbackVariant: 'full' | 'faded' } {
  return {
    imagineFirst: arms.imagine === 'random' ? rng() < 0.5 : settings.imagineFirst,
    feedbackVariant: arms.feedback === 'random' ? (rng() < 0.5 ? 'full' : 'faded') : 'full',
  };
}
