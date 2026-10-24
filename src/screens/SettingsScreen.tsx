import { useState } from 'react';
import { useApp } from '../core/app-context';
import { decodeArms } from '../core/experiments';
import { useSettings } from '../core/settings-store';
import { LANGUAGES, useT } from '../core/i18n';
import styles from '../styles/app.module.css';
import { TUNINGS } from '../core/tunings';

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange(v: boolean): void;
}) {
  const t = useT();
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`${styles.button} ${value ? styles.primary : ''}`}
        onClick={() => onChange(!value)}
      >
        {value ? t('settings.on') : t('settings.off')}
      </button>
    </div>
  );
}

export function SettingsScreen({ onMicLab }: { onMicLab?(): void }) {
  const t = useT();
  const app = useApp();
  const s = useSettings(app.settings);
  const [micCheck, setMicCheck] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const testMic = async () => {
    const mic = app.mic();
    setMicCheck(t('settings.micAsking'));
    try {
      await mic.start();
      setMicCheck(t('settings.micWorks'));
      const off = mic.onEvent((e) => {
        setMicCheck(
          t('settings.micHeard', { midi: e.midi ?? '?', pct: Math.round(e.confidence * 100) }),
        );
      });
      setTimeout(() => {
        off();
        mic.stop();
      }, 8000);
    } catch (err) {
      setMicCheck(
        t('settings.micFailed', { error: err instanceof Error ? err.message : String(err) }),
      );
    }
  };

  return (
    <div className={styles.card}>
      <h2>{t('settings.title')}</h2>
      <div className={styles.field}>
        <span>{t('settings.language')}</span>
        <div className={styles.row} role="group" aria-label={t('settings.language')}>
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`${styles.button} ${s.language === l.id ? styles.primary : ''}`}
              aria-pressed={s.language === l.id}
              onClick={() => void app.settings.update({ language: l.id })}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('settings.tuning')}</span>
        <select
          aria-label={t('settings.tuning')}
          value={s.tuning}
          onChange={(e) => void app.settings.update({ tuning: e.target.value })}
          className={styles.button}
        >
          {TUNINGS.map((tu) => (
            <option key={tu.id} value={tu.id}>
              {tu.name}
            </option>
          ))}
        </select>
      </div>
      <Toggle
        label={t('settings.mic')}
        value={s.micEnabled}
        onChange={(v) => void app.settings.update({ micEnabled: v })}
      />
      {s.micEnabled && (
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={() => void testMic()}>
            {t('settings.testMic')}
          </button>
          {onMicLab && (
            <button type="button" className={styles.button} onClick={onMicLab}>
              {t('settings.micLab')}
            </button>
          )}
          {micCheck && <span className={styles.muted}>{micCheck}</span>}
        </div>
      )}
      <div className={styles.field}>
        <span>{t('settings.confirm', { pct: Math.round(s.confirmBelow * 100) })}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.confirmBelow}
          aria-label={t('settings.confirmAria')}
          onChange={(e) => void app.settings.update({ confirmBelow: Number(e.target.value) })}
        />
      </div>
      <Toggle
        label={t('settings.imagine')}
        value={s.imagineFirst}
        onChange={(v) => void app.settings.update({ imagineFirst: v })}
      />
      <Toggle
        label={t('settings.callResponse')}
        value={s.callResponse}
        onChange={(v) => void app.settings.update({ callResponse: v })}
      />
      <div className={styles.field}>
        <span>{t('settings.labels')}</span>
        <div className={styles.row} role="group" aria-label={t('settings.labels')}>
          {(['numbers', 'moveable-do'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.button} ${s.labelScheme === l ? styles.primary : ''}`}
              aria-pressed={s.labelScheme === l}
              onClick={() => void app.settings.update({ labelScheme: l })}
            >
              {l === 'numbers' ? '1 2 3' : 'do re mi'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('settings.neck')}</span>
        <div className={styles.row} role="group" aria-label={t('settings.neck')}>
          {(['right', 'left'] as const).map((h) => (
            <button
              key={h}
              type="button"
              className={`${styles.button} ${s.handedness === h ? styles.primary : ''}`}
              aria-pressed={s.handedness === h}
              onClick={() => void app.settings.update({ handedness: h })}
            >
              {t(`settings.${h}Handed`)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('settings.accidentals')}</span>
        <div className={styles.row} role="group" aria-label={t('settings.accidentals')}>
          {(['sharp', 'flat'] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={`${styles.button} ${s.accidentalPref === a ? styles.primary : ''}`}
              aria-pressed={s.accidentalPref === a}
              onClick={() => void app.settings.update({ accidentalPref: a })}
            >
              {a === 'sharp' ? '♯' : '♭'}
            </button>
          ))}
        </div>
      </div>
      <Toggle
        label={t('settings.sound')}
        value={s.soundOn}
        onChange={(v) => void app.settings.update({ soundOn: v })}
      />
      <div className={styles.field}>
        <span>
          {t('settings.goal', {
            goal:
              s.weeklyGoal === 0 ? t('settings.goalOff') : t('settings.goalN', { n: s.weeklyGoal }),
          })}
        </span>
        <input
          type="range"
          min={0}
          max={7}
          step={1}
          value={s.weeklyGoal}
          aria-label={t('settings.goalAria')}
          onChange={(e) => void app.settings.update({ weeklyGoal: Number(e.target.value) })}
        />
      </div>
      <p className={styles.muted}>{t('settings.goalNote')}</p>
      <h3>{t('settings.arms')}</h3>
      <p className={styles.muted}>
        {(() => {
          const a = decodeArms(s.experimentArm);
          return t('settings.armsText', {
            imagine: a.imagine === 'random' ? t('settings.armRandom') : t('settings.armSetting'),
            feedback:
              a.feedback === 'random'
                ? t('settings.armFeedbackRandom')
                : t('settings.armFeedbackFull'),
            labels: a.labels,
          });
        })()}
      </p>
      <h3>{t('settings.data')}</h3>
      <p className={styles.muted}>{t('settings.dataNote')}</p>
      <div className={styles.row}>
        {!confirmReset ? (
          <button type="button" className={styles.button} onClick={() => setConfirmReset(true)}>
            {t('settings.delete')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.bad}`}
              onClick={() =>
                void app.repo
                  .clearAll()
                  .then(() => app.settings.load())
                  .then(() => setConfirmReset(false))
              }
            >
              {t('settings.deleteYes')}
            </button>
            <button type="button" className={styles.button} onClick={() => setConfirmReset(false)}>
              {t('settings.keep')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
