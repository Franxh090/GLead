import { useT } from '../../core/i18n';
import type { DrillRenderProps } from '../../core/types';
import { keyName } from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import styles from '../../styles/app.module.css';
import { AnswerNeck, ChoiceGrid, ConfirmPanel, ReplayRow } from '../shared/parts';
import { B9_REGION, b9Collected, type B9Answer, type B9Prompt } from './logic';

export function B9View({
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
}: DrillRenderProps<B9Prompt, B9Answer>) {
  const t = useT();
  const canAnswer = listening && !feedback;
  const named = feedback ? feedback.answer.numerals : b9Collected(prompt, collected);
  return (
    <div className={styles.card} data-target-numerals={prompt.numerals.join(',')}>
      <p>{t('b9.question', { key: keyName(prompt.key), n: prompt.numerals.length })}</p>
      <ReplayRow listening={canAnswer} onReplay={onReplay} />
      <div className={styles.row} role="list" aria-label={t('b9.slots')}>
        {prompt.numerals.map((n, i) => {
          const given = named[i];
          const state = !feedback ? 'pending' : given === n ? 'right' : 'wrong';
          return (
            <span
              key={i}
              role="listitem"
              className={`${styles.status} ${state === 'right' ? styles.ok : state === 'wrong' ? styles.bad : ''}`}
            >
              {feedback ? (
                <>
                  <strong>{n}</strong>{' '}
                  <span className={styles.muted}>{displayPc(prompt.chords[i]!.symbol)}</span>
                  {state === 'wrong' && <span> ≠ {given ?? '—'}</span>}
                </>
              ) : (
                <strong>{given ?? '·'}</strong>
              )}
            </span>
          );
        })}
      </div>
      {canAnswer && (
        <p className={styles.muted} aria-live="polite">
          {t('drill.heard', { n: named.length, total: prompt.numerals.length })}
        </p>
      )}
      <ConfirmPanel pending={pending} onConfirm={onConfirm} />
      <ChoiceGrid
        label={t('b2.group')}
        columns={prompt.choices.length}
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
        region={B9_REGION}
        handedness={handedness}
        markers={[]}
        guideLevel={guideLevel}
        answered={Boolean(feedback)}
        canAnswer={canAnswer}
        accidentalPref={prompt.accidentalPref}
        onTap={onTap}
        label={t('neck.b9')}
      />
    </div>
  );
}
