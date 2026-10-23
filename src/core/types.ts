/**
 * GLead's core contracts (implementation plan §3). Everything here is pure
 * TypeScript; React sees it only through the drills' `render`.
 */
import type { FC } from 'react';
import type { Card as FsrsCard, Grade } from 'ts-fsrs';
import type { GuideLevel, Handedness } from '../vendor/fretfree/engine/model';
import type { AccidentalPref, MusicalKey, Position, Tuning } from '../vendor/fretfree/theory';

// --- Items and cards --------------------------------------------------------

/** A fact the learner practises, e.g. `degree:3@major`. The key varies per prompt. */
export interface Item {
  readonly id: string;
  readonly skillId: string;
}

export interface Skill {
  readonly id: string;
  readonly title: string;
  readonly drillId: string;
  items(): readonly Item[];
}

export interface CardRecord {
  itemId: string;
  skillId: string;
  fsrs: FsrsCard;
  createdAt: Date;
  lastReviewedAt: Date | null;
}

// --- Input ------------------------------------------------------------------

/** How the learner answered: on the guitar, by tapping, or by confirming an unsure play. */
export type AnswerMode = 'play' | 'tap' | 'confirm';

export interface InputEvent {
  kind: 'play' | 'tap';
  /** The pitch played or tapped on the neck, as MIDI. */
  midi?: number;
  /** A tapped scale degree (1–7), when a drill offers degree buttons. */
  degree?: number;
  /** A tapped neck cell. */
  position?: Position;
  /** 0–1. A tap is 1; a played note's comes from the detector (`core/input/confidence.ts`). */
  confidence: number;
  /** Cents off the nearest note, for a played note. */
  cents?: number;
  /** `performance.now()` when the note started or the tap landed. */
  at: number;
}

export type InputState = 'idle' | 'starting' | 'running' | 'error';

export interface InputAdapter {
  readonly id: 'tap' | 'mic';
  readonly state: InputState;
  readonly error: Error | null;
  /** Mic: call from a user gesture. Tap: a no-op. */
  start(): Promise<void>;
  stop(): void;
  onEvent(listener: (event: InputEvent) => void): () => void;
  onStateChange(listener: (state: InputState) => void): () => void;
}

// --- Audio ------------------------------------------------------------------

/** What a drill asks the player to sound, in order. Note names carry octaves (`E2`). */
export type AudioStep =
  | { type: 'notes'; notes: readonly string[]; gapS?: number; durationS?: number }
  | { type: 'strum'; notes: readonly string[]; durationS?: number }
  | {
      type: 'progression';
      chords: readonly (readonly string[])[];
      bpm: number;
      beatsPerChord: number;
    }
  | { type: 'rest'; ms: number };

// --- Drills -----------------------------------------------------------------

export type LabelScheme = 'numbers' | 'moveable-do';

export interface DrillContext {
  key: MusicalKey;
  tuning: Tuning;
  accidentalPref: AccidentalPref;
  labelScheme: LabelScheme;
  /** Drill-specific difficulty level (adaptive band). */
  scopeLevel: number;
  rng: () => number;
}

export interface Check {
  correct: boolean;
  /** Human-readable right answer, e.g. `3 (B)`. */
  expected: string;
  /** Human-readable answer given. */
  given: string;
  /** The concept confused with the expected one, for interleaving later. */
  confusedWith?: string;
}

export interface Feedback<A> {
  answer: A;
  mode: AnswerMode;
  check: Check;
}

export interface DrillRenderProps<P, A> {
  prompt: P;
  feedback: Feedback<A> | null;
  guideLevel: GuideLevel;
  handedness: Handedness;
  tuning: Tuning;
  /** Tap answers (degree buttons, neck taps) go here; the session routes mic events itself. */
  onTap(event: InputEvent): void;
  /** Whether the session is listening for an answer right now. */
  listening: boolean;
  /** A low-confidence play waiting for the learner's yes or no. */
  pending: { heard: string; confidence: number } | null;
  onConfirm(accept: boolean): void;
  onReplay(): void;
}

export interface Drill<P, A> {
  id: string;
  title: string;
  skills: readonly string[];
  inputModes: readonly ('tap' | 'mic')[];
  /** One line on why the drill is built as it is (PRD D5). */
  rationale: string;
  makePrompt(item: Item, ctx: DrillContext): P;
  /** The prompt's sound. */
  audio(prompt: P): AudioStep[];
  /** Turns an input event into an answer, or `null` to ignore it (a note outside the drill's range, say). */
  answerFromInput(prompt: P, event: InputEvent): A | null;
  check(prompt: P, answer: A): Check;
  describeAnswer(answer: A): string;
  /** Neck markers for feedback. */
  feedbackPositions?(prompt: P, feedback: Feedback<A>): { expected: Position[]; given: Position[] };
  /** What to play after a wrong answer: the right sound, then what was played. */
  feedbackAudio?(prompt: P, feedback: Feedback<A>): AudioStep[];
  render: FC<DrillRenderProps<P, A>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDrill = Drill<any, any>;

// --- Scoring (play-along, PRD C2) -------------------------------------------

export interface ChordChangeHit {
  bar: number;
  chord: string;
  /** The chord tone landed on (`1`, `3`, `5`, `7`), or null for a miss or silence. */
  tone: string | null;
  midi: number | null;
}

export interface Scorer {
  start(): void;
  onChord(index: number, at: number): void;
  onNote(midi: number, at: number): void;
  result(): ChordChangeHit[];
}

// --- Backing loop (PRD C3) --------------------------------------------------

export interface BackingLoopSpec {
  key: MusicalKey;
  progressionId: string;
  bpm: number;
  feel: 'once' | 'quarters' | 'eighths' | 'folk';
}

export interface BackingLoop {
  readonly spec: BackingLoopSpec;
  /** Chord symbols in order, one per slot. */
  readonly chords: readonly string[];
  start(opts?: { onChord?: (index: number) => void }): Promise<{ started: boolean }>;
  stop(): void;
}

// --- Trial log (PRD §6, R5) ------------------------------------------------

export type RetestKind = 'none' | '1d' | '7d' | '30d';
export type RetestDelay = Exclude<RetestKind, 'none'>;

/** Why a session ran: practice teaches; placement and retests only measure. */
export type SessionPurpose = 'practice' | 'placement' | 'retest';

export interface TrialEvent {
  id?: number;
  trialId: string;
  sessionId: string;
  at: Date;
  drillId: string;
  itemId: string;
  skillId: string;
  /** `keyLabel`, e.g. `G`, `Am`. */
  key: string;
  mode: AnswerMode;
  correct: boolean;
  expected: string;
  given: string;
  responseMs: number;
  confidence: number;
  rating: Grade;
  imagineFirst: boolean;
  feedbackVariant: 'full' | 'faded';
  experimentArm: string;
  retest: RetestKind;
  unseenKey: boolean;
  /** Absent on rows written before Sprint 3: practice. */
  purpose?: SessionPurpose;
}

export interface SessionRecord {
  id?: number;
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number;
  trials: number;
  correct: number;
  reflection: string;
  /** Absent on rows written before Sprint 3: practice. */
  kind?: SessionPurpose;
}

/** A scheduled retest of a skill in unseen keys (PRD D3). */
export interface RetestRecord {
  id?: number;
  skillId: string;
  delay: RetestDelay;
  /** When the skill first reached criterion; the delays count from here. */
  anchoredAt: Date;
  dueAt: Date;
  doneAt: Date | null;
  /** The session that ran it. */
  sessionId: string | null;
}
