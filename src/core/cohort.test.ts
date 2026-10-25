import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { pooledExperiments, summariseParticipant } from './cohort';
import type { TrialEvent } from './types';

const t = (o: Partial<TrialEvent>): TrialEvent => ({
  trialId: 'x',
  sessionId: 's',
  at: new Date(),
  drillId: 'b1-scale-degree',
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
  purpose: 'practice',
  ...o,
});

describe('cohort view', () => {
  it('summarises one participant', () => {
    const trials = [
      ...Array.from({ length: 4 }, (_, i) =>
        t({ purpose: 'placement', correct: i < 2, sessionId: 'p' }),
      ),
      ...Array.from({ length: 25 }, (_, i) => t({ sessionId: `s${i % 3}` })),
      t({ retest: '7d', unseenKey: true, purpose: 'retest', sessionId: 'r', correct: false }),
      t({ retest: '7d', unseenKey: true, purpose: 'retest', sessionId: 'r' }),
      t({ drillId: 'c1-changes', skillId: 'C1.ladder', sessionId: 'take', mode: 'tap' }),
    ];
    const s = summariseParticipant('p1.json', trials, ['B1.major', 'B2.primary']);
    expect(s).toMatchObject({
      label: 'p1.json',
      trials: 32,
      sessions: 6,
      placement: { trials: 4, correct: 2 },
      skillsAtCriterion: ['B1.major'],
      retest7: { trials: 2, correct: 1 },
      retest30: { trials: 0, correct: 0 },
      transfer: { trials: 2, correct: 1 },
      hits: { trials: 1, correct: 1 },
    });
    expect(s.confirmShare).toBe(0);
  });

  it('pools the experiment arms across participants with participant counts', () => {
    const a = [t({ imagineFirst: true }), t({ imagineFirst: true, correct: false })];
    const b = [t({ imagineFirst: false }), t({ imagineFirst: true })];
    const pooled = pooledExperiments([{ trials: a }, { trials: b }]);
    expect(pooled[0]?.id).toBe('imagine');
    expect(pooled[0]?.arms[0]).toEqual({
      id: 'on',
      label: 'Imagine first',
      tally: { trials: 3, correct: 2 },
      participants: 2,
    });
    expect(pooled[0]?.arms[1]).toMatchObject({ tally: { trials: 1, correct: 1 }, participants: 1 });
    expect(pooledExperiments([])).toHaveLength(4);
  });
});

describe('cohort report', () => {
  it('writes the Markdown report with counts beside every percentage', async () => {
    const { cohortReport, pooledExperiments, summariseParticipant } = await import('./cohort');
    const rows = [
      summariseParticipant('p1.json', [t({ correct: true }), t({ correct: false })], ['B1.major']),
    ];
    const md = cohortReport(
      rows,
      pooledExperiments([{ trials: [t({})] }]),
      (id) => id,
      '2026-11-01',
    );
    expect(md).toContain('# GLead pilot report');
    expect(md).toContain('| p1.json | 2 | 1 |');
    expect(md).toContain(
      '| Does a silent beat to imagine the note first help? | Play at once | 100% | 1 | 1 |',
    );
  });
});
