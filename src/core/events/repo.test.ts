import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { TrialEvent } from '../types';
import { GLeadDB } from './db';
import { createRepo, exportJson } from './repo';

function trial(overrides: Partial<TrialEvent> = {}): TrialEvent {
  return {
    trialId: 't1',
    sessionId: 's1',
    at: new Date('2026-10-22T10:00:00Z'),
    drillId: 'b1-scale-degree',
    itemId: 'degree:3@major',
    skillId: 'B1.major',
    key: 'G',
    mode: 'play',
    correct: true,
    expected: '3 (B)',
    given: 'B3',
    responseMs: 1200,
    confidence: 0.9,
    rating: Rating.Good,
    imagineFirst: false,
    feedbackVariant: 'full',
    experimentArm: 'default',
    retest: 'none',
    unseenKey: false,
    ...overrides,
  };
}

describe('repo', () => {
  it('returns default settings and merges patches', async () => {
    const repo = createRepo(new GLeadDB(`test-${Math.random()}`));
    const s = await repo.getSettings();
    expect(s.labelScheme).toBe('numbers');
    const next = await repo.saveSettings({ labelScheme: 'moveable-do' });
    expect(next.labelScheme).toBe('moveable-do');
    expect((await repo.getSettings()).confirmBelow).toBe(0.6);
  });

  it('logs trials in order and exports them with a header', async () => {
    const repo = createRepo(new GLeadDB(`test-${Math.random()}`));
    await repo.logTrial(trial({ trialId: 'b', at: new Date('2026-10-22T10:01:00Z') }));
    await repo.logTrial(trial({ trialId: 'a' }));
    expect((await repo.trials()).map((t) => t.trialId)).toEqual(['a', 'b']);
    const json = JSON.parse(await exportJson(repo, new Date('2026-10-22T12:00:00Z')));
    expect(json.app).toBe('glead');
    expect(json.format).toBe(1);
    expect(json.trials).toHaveLength(2);
    expect(json.settings).toEqual([]);
  });

  it('updates a session by its sessionId', async () => {
    const repo = createRepo(new GLeadDB(`test-${Math.random()}`));
    const base = {
      sessionId: 's1',
      startedAt: new Date(),
      endedAt: null,
      minutes: 10,
      trials: 0,
      correct: 0,
      reflection: '',
    };
    await repo.saveSession(base);
    await repo.saveSession({ ...base, trials: 12, correct: 10 });
    const all = await repo.sessions();
    expect(all).toHaveLength(1);
    expect(all[0]?.trials).toBe(12);
  });
});
