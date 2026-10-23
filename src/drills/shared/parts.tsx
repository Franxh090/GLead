/** View pieces every drill shares: the confirm panel, a choice grid and the feedback neck. */
import { Fretboard, type FretMarker } from '../../vendor/fretfree/fretboard/Fretboard';
import type { GuideLevel, Handedness } from '../../vendor/fretfree/engine/model';
import {
  noteAt,
  type AccidentalPref,
  type FretRange,
  type Position,
  type Tuning,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import type { InputEvent } from '../../core/types';
import styles from '../../styles/app.module.css';

export function ConfirmPanel({
  pending,
  onConfirm,
}: {
  pending: { heard: string; confidence: number } | null;
  onConfirm(accept: boolean): void;
}) {
  if (!pending) return null;
  return (
    <div className={styles.status} role="alertdialog" aria-label="Confirm what you played">
      <p>
        I heard <strong>{pending.heard}</strong>, but I am only{' '}
        {Math.round(pending.confidence * 100)}% sure. Is that what you played?
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          onClick={() => onConfirm(true)}
        >
          Yes, that was it
        </button>
        <button type="button" className={styles.button} onClick={() => onConfirm(false)}>
          No, let me play again
        </button>
      </div>
    </div>
  );
}

export interface Choice {
  id: string;
  label: string;
  spoken?: string;
}

export function ChoiceGrid({
  label,
  choices,
  disabled,
  onChoose,
  columns,
}: {
  label: string;
  choices: readonly Choice[];
  disabled: boolean;
  onChoose(id: string): void;
  columns?: number;
}) {
  return (
    <div
      className={styles.choices}
      role="group"
      aria-label={label}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          className={styles.choice}
          disabled={disabled}
          aria-label={c.spoken}
          onClick={() => onChoose(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function ReplayRow({ listening, onReplay }: { listening: boolean; onReplay(): void }) {
  return (
    <div className={styles.row}>
      <button type="button" className={styles.button} onClick={onReplay}>
        Hear it again
      </button>
      {listening && (
        <span className={styles.status} role="status">
          Listening…
        </span>
      )}
    </div>
  );
}

/** Feedback markers: every right cell labelled with its note, wrong cells labelled with theirs. */
export function feedbackMarkers(
  positions: { expected: Position[]; given: Position[] } | null,
  expectedLabel: string,
  tuning: Tuning,
  pref: AccidentalPref,
  feedback?: { variant: 'full' | 'faded'; check: { correct: boolean } } | null,
): FretMarker[] {
  if (!positions) return [];
  // Faded feedback (PRD §6): a right answer gets a tick, not a map.
  if (feedback && feedback.variant === 'faded' && feedback.check.correct) return [];
  return [
    ...positions.expected.map((p) => ({
      ...p,
      style: 'correct' as const,
      label: expectedLabel,
      forceLabel: true,
    })),
    ...positions.given.map((p) => ({
      ...p,
      style: 'wrong' as const,
      label: displayPc(noteAt(p, tuning, pref).pc),
      forceLabel: true,
    })),
  ];
}

export function AnswerNeck({
  tuning,
  region,
  handedness,
  markers,
  guideLevel,
  answered,
  canAnswer,
  accidentalPref,
  onTap,
  label,
}: {
  tuning: Tuning;
  region: FretRange;
  handedness: Handedness;
  markers: FretMarker[];
  guideLevel: GuideLevel;
  answered: boolean;
  canAnswer: boolean;
  accidentalPref: AccidentalPref;
  onTap(event: InputEvent): void;
  label: string;
}) {
  return (
    <div className={styles.neck}>
      <Fretboard
        tuning={tuning}
        fretRange={region}
        handedness={handedness}
        markers={markers}
        guideLevel={answered ? 3 : guideLevel}
        revealNotes={answered}
        accidentalPref={accidentalPref}
        onTapCell={
          canAnswer
            ? (position) => onTap({ kind: 'tap', position, confidence: 1, at: performance.now() })
            : undefined
        }
        label={label}
      />
    </div>
  );
}
