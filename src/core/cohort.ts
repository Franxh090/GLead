/**
 * The pilot's cohort view (R5 §4, pilot kit §4): several participants'
 * exports side by side, and the experiment arms pooled across them with
 * trial and participant counts beside every percentage. Pure: the screen
 * parses the files and passes the trials in.
 */
import {
  chordToneHitRate,
  confirmShare,
  delayed,
  experimentReport,
  practiceOnly,
  tallyAll,
  transfer,
  trialsToCriterion,
  zero,
  type Tally,
} from './metrics';
import type { TrialEvent } from './types';

export interface ParticipantSummary {
  label: string;
  trials: number;
  /** Distinct sessions (and Changes takes) with at least one trial. */
  sessions: number;
  placement: Tally;
  /** Skills whose practice reached 90% over 20 trials. */
  skillsAtCriterion: string[];
  retest7: Tally;
  retest30: Tally;
  transfer: Tally;
  hits: Tally;
  confirmShare: number | null;
}

export function summariseParticipant(
  label: string,
  trials: readonly TrialEvent[],
  skillIds: readonly string[],
): ParticipantSummary {
  const practice = practiceOnly(trials).filter((t) => t.retest === 'none');
  const d = delayed(trials);
  return {
    label,
    trials: trials.length,
    sessions: new Set(trials.map((t) => t.sessionId)).size,
    placement: tallyAll(trials.filter((t) => t.purpose === 'placement')),
    skillsAtCriterion: skillIds.filter((id) => trialsToCriterion(practice, id) !== null),
    retest7: d['7d'],
    retest30: d['30d'],
    transfer: transfer(trials),
    hits: chordToneHitRate(trials),
    confirmShare: confirmShare(trials),
  };
}

export interface PooledArm {
  id: string;
  label: string;
  tally: Tally;
  /** Participants with at least one trial in this arm. */
  participants: number;
}

export interface PooledComparison {
  id: string;
  question: string;
  arms: PooledArm[];
}

/** The pilot report as Markdown (R5 §4 "what we report"): one row per participant, then the pooled arms, counts beside every percentage. */
export function cohortReport(
  rows: readonly ParticipantSummary[],
  pooled: readonly PooledComparison[],
  titleOf: (skillId: string) => string,
  exportedAt: string,
): string {
  const pct = (t: Tally) =>
    t.trials ? `${Math.round((100 * t.correct) / t.trials)}% (${t.trials})` : '—';
  const lines = [
    `# GLead pilot report`,
    '',
    `Generated ${exportedAt} from ${rows.length} export${rows.length === 1 ? '' : 's'}. Percentages carry their trial counts; n is small.`,
    '',
    '| Participant | Trials | Sessions | Placement | Skills at criterion | 7d | 30d | Transfer | Hit rate | Confirm |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.trials} | ${r.sessions} | ${pct(r.placement)} | ${r.skillsAtCriterion.map(titleOf).join(', ') || '—'} | ${pct(r.retest7)} | ${pct(r.retest30)} | ${pct(r.transfer)} | ${pct(r.hits)} | ${r.confirmShare === null ? '—' : `${Math.round(r.confirmShare * 100)}%`} |`,
    ),
    '',
    '## Experiments pooled across participants',
    '',
    '| Question | Arm | Accuracy | Trials | Participants |',
    '|---|---|---|---|---|',
    ...pooled.flatMap((e) =>
      e.arms.map(
        (a) =>
          `| ${e.question} | ${a.label} | ${a.tally.trials ? `${Math.round((100 * a.tally.correct) / a.tally.trials)}%` : '—'} | ${a.tally.trials} | ${a.participants} |`,
      ),
    ),
    '',
  ];
  return lines.join('\n');
}

/** The built-in experiments summed over participants (R5 §3: within-person designs, pooled with counts). */
export function pooledExperiments(
  cohort: readonly { trials: readonly TrialEvent[] }[],
): PooledComparison[] {
  const reports = cohort.map((c) => experimentReport(c.trials));
  const shape = reports[0] ?? experimentReport([]);
  return shape.map((exp, ei) => ({
    id: exp.id,
    question: exp.question,
    arms: exp.arms.map((arm, ai) => {
      const tally = zero();
      let participants = 0;
      for (const r of reports) {
        const a = r[ei]?.arms[ai];
        if (!a) continue;
        tally.trials += a.tally.trials;
        tally.correct += a.tally.correct;
        if (a.tally.trials > 0) participants += 1;
      }
      return { id: arm.id, label: arm.label, tally, participants };
    }),
  }));
}
