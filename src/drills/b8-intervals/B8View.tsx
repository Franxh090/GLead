import { intervalInfo } from '../../vendor/fretfree/theory';
import { useT } from '../../core/i18n';
import type { DrillRenderProps } from '../../core/types';
import styles from '../../styles/app.module.css';
import { ChoiceGrid, ReplayRow } from '../shared/parts';
import { b8Hint, type B8Answer, type B8Prompt } from './logic';

export function B8View({
  prompt,
  feedback,
  onTap,
  listening,
  onReplay,
}: DrillRenderProps<B8Prompt, B8Answer>) {
  const t = useT();
  const canAnswer = listening && !feedback;
  return (
    <div className={styles.card}>
      <p>{t('b8.question')}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <ChoiceGrid
        label={t('b8.group')}
        columns={Math.min(prompt.choices.length, 7)}
        choices={prompt.choices.map((i, n) => ({
          id: String(n + 1),
          label: i,
          spoken: intervalInfo(i).long,
        }))}
        disabled={!canAnswer}
        onChoose={(id) =>
          onTap({ kind: 'tap', degree: Number(id), confidence: 1, at: performance.now() })
        }
      />
      {feedback && (
        <p className={styles.muted}>
          {intervalInfo(prompt.interval).long}: {t('b8.hint', { song: b8Hint(prompt.interval) })}
        </p>
      )}
    </div>
  );
}
