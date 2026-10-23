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

/** Chord-tone hit rate (PRD §6): share of chord changes landed on a wanted tone, over play-along trials. */
export function chordToneHitRate(trials: readonly TrialEvent[], drillId = 'c1-changes'): Tally {
  return tallyAll(trials.filter((t) => t.drillId === drillId));
}

/** The placement baseline per skill, from the placement session's trials. */
export function placementBaseline(trials: readonly TrialEvent[]): Record<string, Tally> {
  return tallyBy(
    trials.filter((t) => t.purpose === 'placement'),
    (t) => t.skillId,
  );
}

/** Practice trials only, for the in-session numbers. */
export function practiceOnly(trials: readonly TrialEvent[]): TrialEvent[] {
  return trials.filter((t) => (t.purpose ?? 'practice') === 'practice');
}

// --- Per-skill report (PRD D4) --------------------------------------------

export interface SkillReport {
  skillId: string;
  baseline: Tally;
  practice: Tally;
  /** Accuracy over the last `window` practice trials. */
  recent: number | null;
  trialsToCriterion: number | null;
  /** Accuracy gain per 100 practice trials, from a straight line through the running accuracy. */
  learningRate: number | null;
  retests: Record<'1d' | '7d' | '30d', Tally>;
  transfer: Tally;
}

/** Least-squares slope of accuracy against trial index, per 100 trials, over a rolling window. */
export function learningRate(trials: readonly TrialEvent[], window = 10): number | null {
  if (trials.length < window * 2) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = window; i <= trials.length; i++) {
    const slice = trials.slice(i - window, i);
    xs.push(i);
    ys.push(slice.filter((t) => t.correct).length / window);
  }
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 100;
}

export function skillReport(
  trials: readonly TrialEvent[],
  skillId: string,
  window = 20,
): SkillReport {
  const mine = trials.filter((t) => t.skillId === skillId);
  const practice = practiceOnly(mine).filter((t) => t.retest === 'none');
  const recentSlice = practice.slice(-window);
  return {
    skillId,
    baseline: tallyAll(mine.filter((t) => t.purpose === 'placement')),
    practice: tallyAll(practice),
    recent: recentSlice.length >= Math.min(window, 5) ? accuracyOf(tallyAll(recentSlice)) : null,
    trialsToCriterion: trialsToCriterion(practice, skillId, { window }),
    learningRate: learningRate(practice),
    retests: delayed(mine),
    transfer: transfer(mine),
  };
}

// --- Experiments (PRD §6) ---------------------------------------------------

export interface ArmComparison {
  question: string;
  arms: { label: string; tally: Tally }[];
}

/** Accuracy by arm for each built-in experiment, from the trial log. */
export function experimentReport(trials: readonly TrialEvent[]): ArmComparison[] {
  const practice = practiceOnly(trials).filter(
    (t) => t.retest === 'none' && t.drillId !== 'c1-changes',
  );
  const by = <K extends string>(
    keyOf: (t: TrialEvent) => K,
    labels: Record<K, string>,
  ): { label: string; tally: Tally }[] =>
    (Object.entries(labels) as [K, string][]).map(([k, label]) => ({
      label,
      tally: tallyAll(practice.filter((t) => keyOf(t) === k)),
    }));
  return [
    {
      question: 'Does a silent beat to imagine the note first help?',
      arms: by((t) => (t.imagineFirst ? 'on' : 'off'), {
        on: 'Imagine first',
        off: 'Play at once',
      }),
    },
    {
      question: 'Does less feedback after a right answer hurt or help?',
      arms: by((t) => t.feedbackVariant, { full: 'Full feedback', faded: 'Faded feedback' }),
    },
    {
      question: 'Numbers or moveable-do?',
      arms: by((t) => (t.experimentArm.includes('labels=moveable-do') ? 'do' : 'num'), {
        num: 'Numbers',
        do: 'Moveable-do',
      }),
    },
  ];
}
