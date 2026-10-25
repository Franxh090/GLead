import { useT } from '../../core/i18n';
import type { DrillRenderProps } from '../../core/types';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { keyName } from '../../vendor/fretfree/theory';
import styles from '../../styles/app.module.css';
import { AnswerNeck, ChoiceGrid, ConfirmPanel, ReplayRow, feedbackMarkers } from '../shared/parts';
import { B2_REGION, b2FeedbackPositions, type B2Answer, type B2Prompt } from './logic';

export function B2View({
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
}: DrillRenderProps<B2Prompt, B2Answer>) {
  const t = useT();
  const canAnswer = listening && !feedback;
  const markers = feedbackMarkers(
    feedback ? b2FeedbackPositions(prompt, feedback) : null,
    displayPc(prompt.rootPc),
    tuning,
    prompt.accidentalPref,
    feedback,
  );
  return (
    <div
      className={styles.card}
      data-target-midi={prompt.rootMidi}
      data-target-chord={prompt.chord.symbol}
    >
      <p>{t('b2.question', { key: keyName(prompt.key) })}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <ConfirmPanel pending={pending} onConfirm={onConfirm} />
      <ChoiceGrid
        label={t('b2.group')}
        choices={prompt.choices.map((n) => ({ id: n, label: n }))}
        disabled={!canAnswer}
        onChoose={(id) =>
          onTap({
            kind: 'tap',
            confidence: 1,
            at: performance.now(),
            degree: prompt.choices.indexOf(id) + 1,
          })
        }
      />
      <AnswerNeck
        tuning={tuning}
        region={B2_REGION}
        handedness={handedness}
        markers={markers}
        guideLevel={guideLevel}
        answered={Boolean(feedback)}
        canAnswer={canAnswer}
        accidentalPref={prompt.accidentalPref}
        onTap={onTap}
        label={t('neck.b2')}
      />
    </div>
  );
}
