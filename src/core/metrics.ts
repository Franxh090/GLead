/**
 * The PRD §6 measures, computed from the trial log. R5 will refine the
 * definitions; these are the first cut, written so the dashboard leads with
 * delayed and transfer results rather than today's score.
 */
import type { TrialEvent } from './types';

export interface Tally {
  trials: number;
  correct: number;
}

export function accuracyOf(t: Tally): number | null {
  return t.trials === 0 ? null : t.correct / t.trials;
}

export function tallyBy<K extends string>(
  trials: readonly TrialEvent[],
  keyOf: (t: TrialEvent) => K,
): Record<K, Tally> {
  const out = {} as Record<K, Tally>;
  for (const t of trials) {
    const k = keyOf(t);
    const tally = (out[k] ??= { trials: 0, correct: 0 });
    tally.trials += 1;
    if (t.correct) tally.correct += 1;
  }
  return out;
}

/** Accuracy over trials in keys the learner has not practised (PRD §6 transfer). */
export function transfer(trials: readonly TrialEvent[]): Tally {
  return tallyAll(trials.filter((t) => t.unseenKey));
}

/** Accuracy over the automatic retests (PRD §6 delayed retention), by delay. */
export function delayed(trials: readonly TrialEvent[]): Record<'1d' | '7d' | '30d', Tally> {
  const by = tallyBy(
    trials.filter((t) => t.retest !== 'none'),
    (t) => t.retest as '1d' | '7d' | '30d',
  );
  return { '1d': by['1d'] ?? zero(), '7d': by['7d'] ?? zero(), '30d': by['30d'] ?? zero() };
}

export function tallyAll(trials: readonly TrialEvent[]): Tally {
  return { trials: trials.length, correct: trials.filter((t) => t.correct).length };
}

export function zero(): Tally {
  return { trials: 0, correct: 0 };
}

/**
 * Trials to criterion: the trial count at which a skill first reached
 * `threshold` accuracy over `window` consecutive trials, or null.
 */
export function trialsToCriterion(
  trials: readonly TrialEvent[],
  skillId: string,
  { window = 20, threshold = 0.9 } = {},
): number | null {
  const seq = trials.filter((t) => t.skillId === skillId);
  let hits = 0;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i]!.correct) hits += 1;
    if (i >= window && seq[i - window]!.correct) hits -= 1;
    if (i + 1 >= window && hits / window >= threshold) return i + 1;
  }
  return null;
}

/** Share of mic answers the learner had to confirm: a detection-reliability proxy until R2's test set exists. */
export function confirmShare(trials: readonly TrialEvent[]): number | null {
  const mic = trials.filter((t) => t.mode !== 'tap');
  if (mic.length === 0) return null;
  return mic.filter((t) => t.mode === 'confirm').length / mic.length;
}

export function percent(x: number | null): string {
  return x === null ? '—' : `${Math.round(x * 100)}%`;
}
