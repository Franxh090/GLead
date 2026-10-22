import { Fretboard, type FretMarker } from '../../vendor/fretfree/fretboard/Fretboard';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { noteAt } from '../../vendor/fretfree/theory';
import { DEGREES } from '../../core/keys';
import type { DrillRenderProps } from '../../core/types';
import styles from '../../styles/app.module.css';
import {
  B1_REGION,
  b1FeedbackPositions,
  b1Label,
  b1Question,
  type B1Answer,
  type B1Prompt,
} from './logic';

/**
 * B1's view: the question, the degree buttons as the tap fallback, the neck
 * as a second tap surface, and feedback on the neck. The neck shows nothing
 * that gives the answer away before feedback: string names and fret numbers
 * are kept, since the key is not a secret, but no marker is drawn.
 */
export function B1View({
  prompt,
  feedback,
  guideLevel,
  handedness,
  tuning,
  onTap,
  listening,
  pending,
  onConfirm,
  onReplay,
}: DrillRenderProps<B1Prompt, B1Answer>) {
  const markers: FretMarker[] = [];
  if (feedback) {
    const pos = b1FeedbackPositions(prompt, feedback);
    const label = displayPc(prompt.targetPc);
    markers.push(
      ...pos.expected.map((p) => ({ ...p, style: 'correct' as const, label, forceLabel: true })),
    );
    markers.push(
      ...pos.given.map((p) => ({
        ...p,
        style: 'wrong' as const,
        label: displayPc(noteAt(p, tuning, prompt.accidentalPref).pc),
        forceLabel: true,
      })),
    );
  }
  const canAnswer = listening && !feedback;

  return (
    <div className={styles.card} data-target-midi={prompt.targetMidi}>
      <p>{b1Question(prompt)}</p>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={onReplay}>
          Hear it again
        </button>
        {canAnswer && (
          <span className={styles.status} role="status">
            Listening…
          </span>
        )}
      </div>

      {pending && (
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
      )}

      <div className={styles.choices} role="group" aria-label="Scale degree">
        {DEGREES.map((d) => (
          <button
            key={d}
            type="button"
            className={styles.choice}
            disabled={!canAnswer}
            onClick={() => onTap({ kind: 'tap', degree: d, confidence: 1, at: performance.now() })}
          >
            {b1Label(prompt, d)}
          </button>
        ))}
      </div>

      <div className={styles.neck}>
        <Fretboard
          tuning={tuning}
          fretRange={B1_REGION}
          handedness={handedness}
          markers={markers}
          guideLevel={feedback ? 3 : guideLevel}
          revealNotes={Boolean(feedback)}
          accidentalPref={prompt.accidentalPref}
          onTapCell={
            canAnswer
              ? (position) => onTap({ kind: 'tap', position, confidence: 1, at: performance.now() })
              : undefined
          }
          label="Fretboard: tap the note you heard"
        />
      </div>
    </div>
  );
}
