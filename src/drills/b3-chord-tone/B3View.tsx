import { useT } from '../../core/i18n';
import type { DrillRenderProps } from '../../core/types';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import styles from '../../styles/app.module.css';
import { AnswerNeck, ChoiceGrid, ConfirmPanel, ReplayRow, feedbackMarkers } from '../shared/parts';
import { B3_REGION, TONE_NAMES, b3FeedbackPositions, type B3Answer, type B3Prompt } from './logic';

export function B3View({
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
}: DrillRenderProps<B3Prompt, B3Answer>) {
  const t = useT();
  const canAnswer = listening && !feedback;
  const markers = feedbackMarkers(
    feedback ? b3FeedbackPositions(prompt, feedback) : null,
    displayPc(prompt.targetPc),
    tuning,
    prompt.accidentalPref,
    feedback,
  );
  return (
    <div className={styles.card} data-target-midi={prompt.targetMidi}>
      <p>{t('b3.question', { quality: t(`quality.${prompt.quality}`) })}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <ConfirmPanel pending={pending} onConfirm={onConfirm} />
      <ChoiceGrid
        label={t('b3.group')}
        columns={prompt.tones.length}
        choices={prompt.tones.map((tone) => ({ id: tone, label: t(`tone.${TONE_NAMES[tone]}`) }))}
        disabled={!canAnswer}
        onChoose={(id) =>
          onTap({ kind: 'tap', degree: Number(id), confidence: 1, at: performance.now() })
        }
      />
      <AnswerNeck
        tuning={tuning}
        region={B3_REGION}
        handedness={handedness}
        markers={markers}
        guideLevel={guideLevel}
        answered={Boolean(feedback)}
        canAnswer={canAnswer}
        accidentalPref={prompt.accidentalPref}
        onTap={onTap}
        label={t('neck.b1')}
      />
    </div>
  );
}
