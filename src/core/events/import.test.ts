import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { TrialEvent } from '../types';
import { GLeadDB } from './db';
import { parseExportFile, reviveDates } from './import';
import { createRepo, exportJson } from './repo';

const trial = (o: Partial<TrialEvent>): TrialEvent => ({
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
  purpose: 'practice',
  ...o,
});

describe('export and restore', () => {
  it('revives the date fields and rejects what is not an export', () => {
    const r = reviveDates({
      at: '2026-10-22T10:00:00.000Z',
      name: '2026-10-22T10:00:00.000Z',
      n: 1,
    });
    expect(r.at).toBeInstanceOf(Date);
    expect(r.name).toBe('2026-10-22T10:00:00.000Z');
    expect(() => parseExportFile('nope')).toThrow('Not a GLead export');
    expect(() => parseExportFile('{"app":"other","trials":[]}')).toThrow('Not a GLead export');
  });

  it('restores an export into another device by id, keeps that device’s settings, and is idempotent', async () => {
    const a = createRepo(new GLeadDB(`a-${Math.random()}`));
    await a.saveSettings({ labelScheme: 'moveable-do', experimentArm: 'x' });
    await a.logTrial(trial({ trialId: 't1' }));
    await a.logTrial(trial({ trialId: 't2', sessionId: 's2' }));
    await a.saveSession({
      sessionId: 's1',
      startedAt: new Date('2026-10-22T10:00:00Z'),
      endedAt: new Date('2026-10-22T10:10:00Z'),
      minutes: 10,
      trials: 1,
      correct: 1,
      reflection: 'ok',
      kind: 'practice',
    });
    await a.saveRetest({
      skillId: 'B1.major',
      delay: '7d',
      anchoredAt: new Date('2026-10-22T10:00:00Z'),
      dueAt: new Date('2026-10-29T10:00:00Z'),
      doneAt: null,
      sessionId: null,
    });
    const file = await exportJson(a, new Date('2026-10-23T00:00:00Z'));

    // A device that already has data of its own keeps its settings and gains only what it lacked.
    const b = createRepo(new GLeadDB(`b-${Math.random()}`));
    await b.saveSettings({ labelScheme: 'numbers' });
    await b.logTrial(trial({ trialId: 't2', sessionId: 's2' }));
    const first = await b.importAll(parseExportFile(file));
    expect(first).toEqual({
      trials: 1,
      sessions: 1,
      cards: 0,
      retests: 1,
      micLabRuns: 0,
      settings: false,
    });
    expect((await b.trials()).map((t) => t.trialId).sort()).toEqual(['t1', 't2']);
    expect((await b.trials())[0]!.at).toBeInstanceOf(Date);
    expect((await b.getSettings()).labelScheme).toBe('numbers');
    const again = await b.importAll(parseExportFile(file));
    expect(again).toEqual({
      trials: 0,
      sessions: 0,
      cards: 0,
      retests: 0,
      micLabRuns: 0,
      settings: false,
    });
    expect(await b.counts()).toEqual({ trials: 2, sessions: 1, cards: 0 });

    // A fresh device takes the settings too.
    const c = createRepo(new GLeadDB(`c-${Math.random()}`));
    const fresh = await c.importAll(parseExportFile(file));
    expect(fresh.settings).toBe(true);
    expect(fresh.trials).toBe(2);
    expect((await c.getSettings()).labelScheme).toBe('moveable-do');
    expect((await c.retests())[0]!.dueAt).toBeInstanceOf(Date);
  });
});
