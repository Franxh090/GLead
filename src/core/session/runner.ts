/**
 * The session runner: the core loop as a state machine.
 *
 *   prompting (the sound plays) → imagining (optional silent beat, PRD B6)
 *   → listening → [confirming, when a play is unsure] → feedback → next
 *
 * Pure apart from the injected `play`, `repo`, clocks and rng, so it is
 * tested with fakes. Every graded answer writes a `TrialEvent` (PRD §6) and
 * reviews the item's FSRS card. A miss puts the item back in the queue a few
 * trials on (`retryIndex`), the FretEcho "keep listening on a miss" idea
 * turned into a retry rather than an open-ended wait.
 *
 * The speaker is never the learner: a note that started before `listenFrom`
 * (while the prompt or the feedback sounded) is ignored, FretEcho's
 * mute-while-prompting protocol by timestamp instead of by pausing detection.
 */
import type { Grade } from 'ts-fsrs';
import { ENGINE_CONFIG } from '../../vendor/fretfree/engine/config';
import { gradeAnswer, speedTargets } from '../../vendor/fretfree/engine/grading';
import type { Scheduler } from '../../vendor/fretfree/engine/scheduler';
import { keyLabel, type MusicalKey } from '../../vendor/fretfree/theory';
import type { Settings } from '../events/db';
import { newId } from '../events/ids';
import type { Repo } from '../events/repo';
import { decodeArms, trialConditions } from '../experiments';
import { isUnseenKey, nextKey } from '../keys';
import { retryIndex, type PlanEntry } from '../scheduling/plan';
import type {
  AnswerMode,
  AnyDrill,
  AudioStep,
  CardRecord,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  RetestKind,
  SessionPurpose,
  TrialEvent,
} from '../types';

export type Phase =
  'idle' | 'prompting' | 'imagining' | 'listening' | 'confirming' | 'feedback' | 'done';

export interface Pending {
  event: InputEvent;
  answer: unknown;
  /** What the mic heard, for the confirm prompt. */
  heard: string;
  confidence: number;
}

export interface KeyTally {
  trials: number;
  correct: number;
}

export interface RunnerState {
  phase: Phase;
  index: number;
  total: number;
  entry: PlanEntry | null;
  drill: AnyDrill | null;
  prompt: unknown;
  key: MusicalKey | null;
  feedback: Feedback<unknown> | null;
  pending: Pending | null;
  /** Events collected so far by a drill that takes a sequence. */
  collected: InputEvent[];
  /** This trial's conditions, drawn from the experiment arms. */
  imagineFirst: boolean;
  feedbackVariant: 'full' | 'faded';
  trials: number;
  correct: number;
  byKey: Record<string, KeyTally>;
  byItem: Record<string, KeyTally>;
}

export interface RunnerDeps {
  sessionId: string;
  plan: PlanEntry[];
  drillFor(item: Item): AnyDrill;
  keyPoolFor(item: Item): readonly MusicalKey[];
  cards: readonly CardRecord[];
  scheduler: Scheduler;
  repo: Pick<Repo, 'saveCard' | 'logTrial'>;
  settings: Settings;
  /** Plays a script and resolves when it has sounded. */
  play(steps: readonly AudioStep[]): Promise<void>;
  /** Waits `ms` (injectable so tests run instantly). */
  wait(ms: number): Promise<void>;
  now(): Date;
  /** The response-time clock, in ms (`performance.now()`). */
  clock(): number;
  rng(): number;
  retest?: RetestKind;
  tuning: DrillContext['tuning'];
  /** Why the session runs; placement and retests measure only (no retries, no card updates). */
  purpose?: SessionPurpose;
  /** This week's practice schedule, recorded on every trial. */
  schedule?: 'interleaved' | 'blocked';
}

export interface SessionRunner {
  readonly state: RunnerState;
  subscribe(listener: (state: RunnerState) => void): () => void;
  start(): Promise<void>;
  input(event: InputEvent): void;
  confirm(accept: boolean): void;
  replay(): Promise<void>;
  /** Leave feedback for the next trial, or finish. */
  advance(): Promise<void>;
  /** End the session early. */
  finish(): void;
}

function tally(map: Record<string, KeyTally>, k: string, correct: boolean): void {
  const t = (map[k] ??= { trials: 0, correct: 0 });
  t.trials += 1;
  if (correct) t.correct += 1;
}

export function createSessionRunner(deps: RunnerDeps): SessionRunner {
  const listeners = new Set<(s: RunnerState) => void>();
  const cards = new Map(deps.cards.map((c) => [c.itemId, c]));
  const plan = [...deps.plan];
  let previousKey: MusicalKey | null = null;
  let listenFrom = 0;
  let generation = 0;
  const scopeLevel = 0; // Adaptive scope arrives with B7's band per drill.

  const state: RunnerState = {
    phase: 'idle',
    index: -1,
    total: plan.length,
    entry: null,
    drill: null,
    prompt: null,
    key: null,
    feedback: null,
    pending: null,
    collected: [],
    imagineFirst: deps.settings.imagineFirst,
    feedbackVariant: 'full',
    trials: 0,
    correct: 0,
    byKey: {},
    byItem: {},
  };

  const emit = () => listeners.forEach((l) => l(state));
  const set = (patch: Partial<RunnerState>) => {
    Object.assign(state, patch);
    emit();
  };

  const audioOf = (): AudioStep[] =>
    state.drill && state.prompt ? state.drill.audio(state.prompt) : [];

  /** Play the prompt, then the imagining beat, then listen. */
  const present = async (gen: number): Promise<void> => {
    set({ phase: 'prompting', pending: null });
    await deps.play(audioOf());
    if (gen !== generation) return;
    if (state.imagineFirst) {
      set({ phase: 'imagining' });
      await deps.wait(deps.settings.imagineMs);
      if (gen !== generation) return;
    }
    listenFrom = deps.clock();
    set({ phase: 'listening' });
  };

  const beginTrial = async (): Promise<void> => {
    const index = state.index + 1;
    const entry = plan[index];
    if (!entry) {
      set({ phase: 'done', entry: null, drill: null, prompt: null, feedback: null, pending: null });
      return;
    }
    const drill = deps.drillFor(entry.item);
    const key = nextKey(deps.keyPoolFor(entry.item), previousKey, deps.rng);
    previousKey = key;
    const ctx: DrillContext = {
      key,
      tuning: deps.tuning,
      accidentalPref: deps.settings.accidentalPref,
      labelScheme: deps.settings.labelScheme,
      scopeLevel,
      rng: deps.rng,
    };
    const prompt = drill.makePrompt(entry.item, ctx);
    const gen = ++generation;
    const conditions = trialConditions(
      decodeArms(deps.settings.experimentArm),
      deps.settings,
      deps.rng,
    );
    set({
      index,
      total: plan.length,
      entry,
      drill,
      prompt,
      key,
      feedback: null,
      pending: null,
      collected: [],
      ...conditions,
    });
    await present(gen);
  };

  const grade = (answer: unknown, event: InputEvent, mode: AnswerMode): void => {
    const { drill, entry, prompt, key } = state;
    if (!drill || !entry || !key) return;
    const check = drill.check(prompt, answer);
    const raw = Math.max(0, event.at - listenFrom);
    const { micLatencyMs, playAllowanceMs } = ENGINE_CONFIG.playNote;
    const responseMs = mode === 'tap' ? raw : Math.max(0, raw - micLatencyMs - playAllowanceMs);
    const rating: Grade = gradeAnswer(
      { correct: check.correct, responseMs, hintUsed: false },
      speedTargets(null),
    );
    const now = deps.now();
    const purpose = deps.purpose ?? 'practice';
    if (purpose === 'practice') {
      const card = deps.scheduler.review(
        cards.get(entry.item.id) ?? deps.scheduler.newCard(entry.item, now),
        rating,
        now,
      );
      cards.set(entry.item.id, card);
      void deps.repo.saveCard(card);
    }

    const trial: TrialEvent = {
      trialId: newId('t', deps.rng),
      sessionId: deps.sessionId,
      at: now,
      drillId: drill.id,
      itemId: entry.item.id,
      skillId: entry.item.skillId,
      key: keyLabel(key),
      mode,
      correct: check.correct,
      expected: check.expected,
      given: check.given,
      responseMs: raw,
      confidence: event.confidence,
      rating,
      imagineFirst: state.imagineFirst,
      feedbackVariant: state.feedbackVariant,
      experimentArm: deps.settings.experimentArm,
      retest: deps.retest ?? 'none',
      unseenKey: isUnseenKey(key),
      purpose,
      schedule: deps.schedule ?? 'interleaved',
    };
    void deps.repo.logTrial(trial);

    if (!check.correct && entry.kind !== 'retry' && purpose === 'practice') {
      const at = retryIndex(state.index + 1, plan.length - state.index - 1);
      plan.splice(at, 0, { item: entry.item, kind: 'retry' });
    }
    tally(state.byKey, keyLabel(key), check.correct);
    tally(state.byItem, entry.item.id, check.correct);
    const feedback: Feedback<unknown> = { answer, mode, check, variant: state.feedbackVariant };
    set({
      phase: 'feedback',
      feedback,
      pending: null,
      trials: state.trials + 1,
      correct: state.correct + (check.correct ? 1 : 0),
      total: plan.length,
    });
    if (!check.correct && drill.feedbackAudio) {
      const gen = generation;
      void deps.wait(250).then(() => {
        if (gen === generation && state.phase === 'feedback') {
          void deps.play(drill.feedbackAudio!(prompt, feedback));
        }
      });
    }
  };

  return {
    state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      if (state.phase !== 'idle') return;
      await beginTrial();
    },
    input(event) {
      if (state.phase !== 'listening' || !state.drill) return;
      if (event.at < listenFrom) return; // the speaker, or a note already ringing
      const answer = state.drill.answerFromInput(state.prompt, event, state.collected);
      if (answer === null) {
        // A sequence drill keeps what it heard; a one-note drill ignored the event.
        if (state.drill.accumulate) set({ collected: [...state.collected, event] });
        return;
      }
      if (
        event.kind === 'play' &&
        !state.drill.accumulate &&
        event.confidence < deps.settings.confirmBelow
      ) {
        set({
          phase: 'confirming',
          pending: {
            event,
            answer,
            heard: state.drill.describeAnswer(answer),
            confidence: event.confidence,
          },
        });
        return;
      }
      grade(answer, event, event.kind);
    },
    confirm(accept) {
      const pending = state.pending;
      if (state.phase !== 'confirming' || !pending) return;
      if (accept) {
        grade(pending.answer, { ...pending.event, confidence: 1 }, 'confirm');
      } else {
        listenFrom = deps.clock();
        set({ phase: 'listening', pending: null });
      }
    },
    async replay() {
      if (!['listening', 'confirming', 'prompting', 'imagining'].includes(state.phase)) return;
      const gen = ++generation;
      await present(gen);
    },
    async advance() {
      if (state.phase === 'done') return;
      if (state.phase !== 'feedback') return;
      await beginTrial();
    },
    finish() {
      generation++;
      set({ phase: 'done', pending: null });
    },
  };
}

/** The adaptive band is per drill scope; a session reports accuracy for it. */
export function accuracy(state: Pick<RunnerState, 'trials' | 'correct'>): number | null {
  return state.trials === 0 ? null : state.correct / state.trials;
}
