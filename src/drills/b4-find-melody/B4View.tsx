import type { DrillRenderProps } from '../../core/types';
import styles from '../../styles/app.module.css';
import { AnswerNeck, ConfirmPanel, ReplayRow, feedbackMarkers } from '../shared/parts';
import { B4_REGION, b4FeedbackPositions, b4Question, type B4Answer, type B4Prompt } from './logic';

export function B4View({
  prompt,
  feedback,
  guideLevel,
  handedness,
  tuning,
  onTap,
  listening,
  pending,
  collected,
  onConfirm,
  onReplay,
}: DrillRenderProps<B4Prompt, B4Answer>) {
  const canAnswer = listening && !feedback;
  const markers = feedbackMarkers(
    feedback ? b4FeedbackPositions(prompt, feedback) : null,
    '',
    tuning,
    prompt.accidentalPref,
    feedback,
  ).map((m) => (m.style === 'correct' ? { ...m, label: undefined, forceLabel: false } : m));
  return (
    <div
      className={styles.card}
      data-target-midi={prompt.midis[0]}
      data-target-midis={prompt.midis.join(',')}
    >
      <p>{b4Question(prompt)}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      {canAnswer && (
        <p className={styles.muted} aria-live="polite">
          Heard {collected.length} of {prompt.midis.length}.
        </p>
      )}
      <ConfirmPanel pending={pending} onConfirm={onConfirm} />
      <AnswerNeck
        tuning={tuning}
        region={B4_REGION}
        handedness={handedness}
        markers={markers}
        guideLevel={guideLevel}
        answered={Boolean(feedback)}
        canAnswer={canAnswer}
        accidentalPref={prompt.accidentalPref}
        onTap={onTap}
        label="Fretboard: play or tap the notes you heard, in order"
      />
    </div>
  );
}
