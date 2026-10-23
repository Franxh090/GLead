/**
 * Delayed retests (PRD D3, §6 "delayed retention" and "transfer"): once a
 * skill first reaches criterion in practice, three retests are scheduled at
 * 1, 7 and 30 days, each run in keys the learner has not practised. A retest
 * only measures: no retries, no card updates, and its trials carry `retest`.
 */
import type { RetestDelay, RetestRecord, TrialEvent } from '../types';
import { trialsToCriterion } from '../metrics';

export const RETEST_DELAYS: readonly { delay: RetestDelay; days: number }[] = [
  { delay: '1d', days: 1 },
  { delay: '7d', days: 7 },
  { delay: '30d', days: 30 },
];

/** Trials per retest: two passes over a seven-item skill, say. */
export const RETEST_TRIALS = 14;

const DAY_MS = 86_400_000;

/** Practice trials only: placement and retests never count towards criterion. */
export function practiceTrials(trials: readonly TrialEvent[]): TrialEvent[] {
  return trials.filter((t) => (t.purpose ?? 'practice') === 'practice' && t.retest === 'none');
}

/**
 * The retests to add now: for each skill that has reached criterion and has
 * none scheduled yet, the three delays anchored at `now`.
 */
export function planRetests(
  trials: readonly TrialEvent[],
  existing: readonly RetestRecord[],
  skillIds: readonly string[],
  now: Date,
): RetestRecord[] {
  const practice = practiceTrials(trials);
  const scheduled = new Set(existing.map((r) => r.skillId));
  const out: RetestRecord[] = [];
  for (const skillId of skillIds) {
    if (scheduled.has(skillId)) continue;
    if (trialsToCriterion(practice, skillId) === null) continue;
    for (const { delay, days } of RETEST_DELAYS) {
      out.push({
        skillId,
        delay,
        anchoredAt: now,
        dueAt: new Date(now.getTime() + days * DAY_MS),
        doneAt: null,
        sessionId: null,
      });
    }
  }
  return out;
}

/** Retests due and not yet run, earliest first. */
export function dueRetests(retests: readonly RetestRecord[], now: Date): RetestRecord[] {
  return retests
    .filter((r) => r.doneAt === null && r.dueAt.getTime() <= now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

/** The next retest still to come, for the Today screen. */
export function nextRetest(retests: readonly RetestRecord[], now: Date): RetestRecord | null {
  const later = retests
    .filter((r) => r.doneAt === null && r.dueAt.getTime() > now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  return later[0] ?? null;
}
