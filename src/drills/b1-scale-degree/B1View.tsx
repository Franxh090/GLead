import { DEGREES } from '../../core/keys';
import type { DrillRenderProps } from '../../core/types';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import styles from '../../styles/app.module.css';
import { AnswerNeck, ChoiceGrid, ConfirmPanel, ReplayRow, feedbackMarkers } from '../shared/parts';
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
 * as a second tap surface, and feedback on the neck. Before feedback the
 * neck shows no marker; string names stay, since the key is no secret.
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
  const canAnswer = listening && !feedback;
  const markers = feedbackMarkers(
    feedback ? b1FeedbackPositions(prompt, feedback) : null,
    displayPc(prompt.targetPc),
    tuning,
    prompt.accidentalPref,
    feedback,
  );
  return (
    <div className={styles.card} data-target-midi={prompt.targetMidi}>
      <p>{b1Question(prompt)}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <ConfirmPanel pending={pending} onConfirm={onConfirm} />
      <ChoiceGrid
        label="Scale degree"
        choices={DEGREES.map((d) => ({ id: String(d), label: b1Label(prompt, d) }))}
        disabled={!canAnswer}
        onChoose={(id) =>
          onTap({ kind: 'tap', degree: Number(id), confidence: 1, at: performance.now() })
        }
      />
      <AnswerNeck
        tuning={tuning}
        region={B1_REGION}
        handedness={handedness}
        markers={markers}
        guideLevel={guideLevel}
        answered={Boolean(feedback)}
        canAnswer={canAnswer}
        accidentalPref={prompt.accidentalPref}
        onTap={onTap}
        label="Fretboard: tap the note you heard"
      />
    </div>
  );
}
