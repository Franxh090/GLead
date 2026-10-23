import type { DrillRenderProps } from '../../core/types';
import styles from '../../styles/app.module.css';
import { ChoiceGrid, ReplayRow } from '../shared/parts';
import { b5Explain, b5Question, type B5Answer, type B5Prompt } from './logic';

export function B5View({
  prompt,
  feedback,
  onTap,
  listening,
  onReplay,
}: DrillRenderProps<B5Prompt, B5Answer>) {
  const canAnswer = listening && !feedback;
  return (
    <div className={styles.card} data-wrong-at={prompt.wrongAt}>
      <p>{b5Question(prompt)}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <ChoiceGrid
        label={prompt.kind === 'chord' ? 'Which chord' : 'Which note'}
        columns={prompt.labels.length}
        choices={prompt.labels.map((l, i) => ({ id: String(i + 1), label: l }))}
        disabled={!canAnswer}
        onChoose={(id) =>
          onTap({ kind: 'tap', degree: Number(id), confidence: 1, at: performance.now() })
        }
      />
      {feedback && <p className={styles.muted}>{b5Explain(prompt)}</p>}
    </div>
  );
}
