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
  /** `alternate`: interleaved and blocked practice swap each week (research appendix §9). */
  schedule: 'interleaved' | 'alternate';
}

export type Schedule = 'interleaved' | 'blocked';

export const DEFAULT_ARMS: Arms = {
  imagine: 'setting',
  feedback: 'full',
  labels: 'numbers',
  schedule: 'interleaved',
};

/** Draw a learner's arms at first run. */
export function assignArms(rng: () => number): Arms {
  return {
    imagine: 'random',
    feedback: 'random',
    labels: (['numbers', 'moveable-do'] as const)[pick(2, rng)] as LabelScheme,
    schedule: 'alternate',
  };
}

const WEEK_MS = 7 * 86_400_000;
/** A Monday, so weeks turn over on Mondays. */
const WEEK_EPOCH = Date.UTC(2026, 0, 5);

/**
 * This week's schedule under the arms: interleaved every week, or alternating
 * with blocked practice (one key for the session, skills one after another),
 * swapping each Monday. The week is recorded on every trial.
 */
export function scheduleFor(arms: Arms, date: Date): Schedule {
  if (arms.schedule !== 'alternate') return 'interleaved';
  const week = Math.floor((date.getTime() - WEEK_EPOCH) / WEEK_MS);
  return week % 2 === 0 ? 'interleaved' : 'blocked';
}

/** `imagine=random;feedback=random;labels=numbers`, as stored in settings and on every trial. */
export function encodeArms(arms: Arms): string {
  return `imagine=${arms.imagine};feedback=${arms.feedback};labels=${arms.labels};schedule=${arms.schedule}`;
}

export function decodeArms(s: string | undefined): Arms {
  if (!s || !s.includes('=')) return DEFAULT_ARMS;
  const out = { ...DEFAULT_ARMS };
  for (const part of s.split(';')) {
    const [k, v] = part.split('=');
    if (k === 'imagine' && (v === 'random' || v === 'setting')) out.imagine = v;
    if (k === 'feedback' && (v === 'random' || v === 'full')) out.feedback = v;
    if (k === 'labels' && (v === 'numbers' || v === 'moveable-do')) out.labels = v;
    if (k === 'schedule' && (v === 'interleaved' || v === 'alternate')) out.schedule = v;
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
