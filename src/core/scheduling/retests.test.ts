import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { RetestRecord, TrialEvent } from '../types';
import { dueRetests, nextRetest, planRetests, practiceTrials, restingSkills } from './retests';

const t = (o: Partial<TrialEvent>): TrialEvent => ({
  trialId: 'x',
  sessionId: 's',
  at: new Date('2026-10-20T10:00:00Z'),
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
const now = new Date('2026-10-23T10:00:00Z');

describe('planRetests', () => {
  it('schedules three retests once a skill reaches criterion, and never twice', () => {
    const trials = Array.from({ length: 20 }, () => t({}));
    const planned = planRetests(trials, [], ['B1.major', 'B2.primary'], now);
    expect(planned.map((r) => `${r.skillId}:${r.delay}`)).toEqual([
      'B1.major:1d',
      'B1.major:7d',
      'B1.major:30d',
    ]);
    expect(planned[1]?.dueAt.toISOString()).toBe('2026-10-30T10:00:00.000Z');
    expect(planRetests(trials, planned, ['B1.major'], now)).toEqual([]);
  });

  it('ignores placement and retest trials when judging criterion', () => {
    const trials = Array.from({ length: 20 }, () => t({ purpose: 'placement' }));
    expect(practiceTrials(trials)).toEqual([]);
    expect(planRetests(trials, [], ['B1.major'], now)).toEqual([]);
    expect(planRetests([...trials, t({ retest: '7d' })], [], ['B1.major'], now)).toEqual([]);
  });

  it('lists due retests in order and the next one to come', () => {
    const r = (delay: '1d' | '7d' | '30d', due: string, done = false): RetestRecord => ({
      skillId: 'B1.major',
      delay,
      anchoredAt: now,
      dueAt: new Date(due),
      doneAt: done ? now : null,
      sessionId: null,
    });
    const all = [
      r('30d', '2026-11-22T10:00:00Z'),
      r('7d', '2026-10-23T09:00:00Z'),
      r('1d', '2026-10-21T10:00:00Z', true),
    ];
    expect(dueRetests(all, now).map((x) => x.delay)).toEqual(['7d']);
    expect(nextRetest(all, now)?.delay).toBe('30d');
  });

  it('rests a skill while any of its retests is pending', () => {
    const base = { anchoredAt: now, dueAt: now, sessionId: null };
    expect(
      restingSkills([
        { ...base, skillId: 'B1.major', delay: '1d', doneAt: now },
        { ...base, skillId: 'B1.major', delay: '7d', doneAt: null },
        { ...base, skillId: 'B2.primary', delay: '1d', doneAt: now },
      ]),
    ).toEqual(new Set(['B1.major']));
  });
});
