import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../vendor/fretfree/engine/scheduler';
import { STANDARD_TUNING, parseKey } from '../../vendor/fretfree/theory';
import { DEFAULT_SETTINGS } from '../events/db';
import type { AudioStep, CardRecord, Drill, InputEvent, Item, TrialEvent } from '../types';
import { createSessionRunner, type RunnerDeps } from './runner';

/** A drill whose prompt is a MIDI note; play it back (any octave) or tap `degree` 1. */
interface P {
  midi: number;
}
type A = { midi?: number; degree?: number };

const echo: Drill<P, A> = {
  id: 'echo',
  title: 'Echo',
  skills: ['echo'],
  inputModes: ['tap', 'mic'],
  rationale: 'test',
  makePrompt: () => ({ midi: 45 }),
  audio: (p) => [{ type: 'notes', notes: [String(p.midi)] }],
  answerFromInput: (_p, e) => {
    if (e.kind === 'play' && e.midi !== undefined) return { midi: e.midi };
    if (e.kind === 'tap' && e.degree !== undefined) return { degree: e.degree };
    return null;
  },
  check: (p, a) => {
    const correct = a.midi !== undefined ? (a.midi - p.midi) % 12 === 0 : a.degree === 1;
    return { correct, expected: 'A', given: a.midi !== undefined ? `m${a.midi}` : `d${a.degree}` };
  },
  describeAnswer: (a) => (a.midi !== undefined ? `m${a.midi}` : `d${a.degree}`),
  feedbackAudio: () => [{ type: 'rest', ms: 1 }],
  render: () => null,
};

const items: Item[] = ['x', 'y', 'z'].map((id) => ({ id, skillId: 'echo' }));

function harness(overrides: Partial<RunnerDeps> = {}) {
  const played: AudioStep[][] = [];
  const saved: CardRecord[] = [];
  const logged: TrialEvent[] = [];
  let t = 1000;
  const deps: RunnerDeps = {
    sessionId: 's1',
    plan: items.map((item) => ({ item, kind: 'new' as const })),
    drillFor: () => echo,
    keyPoolFor: () => [parseKey('G'), parseKey('C')],
    cards: [],
    scheduler: createScheduler({ enableFuzz: false }),
    repo: {
      saveCard: async (c) => void saved.push(c),
      logTrial: async (e) => void logged.push(e),
    },
    settings: { ...DEFAULT_SETTINGS },
    play: async (steps) => void played.push([...steps]),
    wait: async () => undefined,
    now: () => new Date('2026-10-22T10:00:00Z'),
    clock: () => t,
    rng: () => 0.3,
    tuning: STANDARD_TUNING,
    ...overrides,
  };
  const runner = createSessionRunner(deps);
  const tick = (ms: number) => (t += ms);
  const play = (midi: number, confidence = 1): InputEvent => ({
    kind: 'play',
    midi,
    confidence,
    at: t,
  });
  return { runner, played, saved, logged, tick, play, deps };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('session runner', () => {
  it('plays the prompt, then listens, grades a correct play and schedules the card', async () => {
    const h = harness();
    await h.runner.start();
    expect(h.runner.state.phase).toBe('listening');
    expect(h.played).toHaveLength(1);
    h.tick(1500);
    h.runner.input(h.play(57));
    expect(h.runner.state.phase).toBe('feedback');
    expect(h.runner.state.feedback?.check.correct).toBe(true);
    await flush();
    expect(h.saved).toHaveLength(1);
    expect(h.logged).toHaveLength(1);
    expect(h.logged[0]).toMatchObject({
      itemId: 'x',
      mode: 'play',
      correct: true,
      responseMs: 1500,
      key: expect.stringMatching(/^(G|C)$/),
      unseenKey: false,
    });
    // 1500 ms raw − 150 latency − 1000 allowance = 350 ms: fluent → Easy.
    expect(h.logged[0]?.rating).toBe(Rating.Easy);
  });

  it('ignores notes that started before listening began (the speaker)', async () => {
    const h = harness();
    await h.runner.start();
    h.runner.input({ ...h.play(45), at: 999 });
    expect(h.runner.state.phase).toBe('listening');
  });

  it('asks to confirm a low-confidence play, then grades it as confirmed', async () => {
    const h = harness();
    await h.runner.start();
    h.tick(800);
    h.runner.input(h.play(45, 0.4));
    expect(h.runner.state.phase).toBe('confirming');
    expect(h.runner.state.pending?.heard).toBe('m45');
    h.runner.confirm(true);
    expect(h.runner.state.phase).toBe('feedback');
    await flush();
    expect(h.logged[0]?.mode).toBe('confirm');
    expect(h.logged[0]?.confidence).toBe(1);
  });

  it('goes back to listening when the learner rejects what was heard', async () => {
    const h = harness();
    await h.runner.start();
    h.runner.input(h.play(45, 0.1));
    h.runner.confirm(false);
    expect(h.runner.state.phase).toBe('listening');
    expect(h.runner.state.pending).toBeNull();
  });

  it('puts a missed item back in the queue and plays the feedback sound', async () => {
    const h = harness();
    await h.runner.start();
    h.tick(500);
    h.runner.input(h.play(46));
    expect(h.runner.state.feedback?.check.correct).toBe(false);
    expect(h.runner.state.total).toBe(4);
    await flush();
    expect(h.played).toHaveLength(2); // prompt, then the feedback sound
    await h.runner.advance();
    expect(h.runner.state.entry?.item.id).toBe('y');
    h.runner.input(h.play(45));
    await h.runner.advance();
    expect(h.runner.state.entry?.item.id).toBe('z');
    h.runner.input(h.play(45));
    await h.runner.advance();
    expect(h.runner.state.entry?.kind).toBe('retry');
    expect(h.runner.state.entry?.item.id).toBe('x');
  });

  it('rotates keys between trials and finishes after the last entry', async () => {
    let n = 0;
    const h = harness({ rng: () => (n += 0.37) % 1 });
    await h.runner.start();
    const keys: string[] = [];
    for (let i = 0; i < 3; i++) {
      keys.push(h.runner.state.key!.tonic);
      h.runner.input(h.play(45));
      await h.runner.advance();
    }
    expect(h.runner.state.phase).toBe('done');
    for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
    expect(h.runner.state.trials).toBe(3);
    expect(h.runner.state.correct).toBe(3);
  });

  it('adds a silent beat when imagine-first is on', async () => {
    const phases: string[] = [];
    const h = harness({ settings: { ...DEFAULT_SETTINGS, imagineFirst: true } });
    h.runner.subscribe((s) => phases.push(s.phase));
    await h.runner.start();
    expect(phases).toContain('imagining');
    expect(h.runner.state.phase).toBe('listening');
    h.runner.input(h.play(45));
    await flush();
    expect(h.logged[0]?.imagineFirst).toBe(true);
  });

  it('replays the prompt and resets the response clock', async () => {
    const h = harness();
    await h.runner.start();
    h.tick(5000);
    await h.runner.replay();
    expect(h.played).toHaveLength(2);
    h.tick(300);
    h.runner.input(h.play(45));
    await flush();
    expect(h.logged[0]?.responseMs).toBe(300);
  });
});
