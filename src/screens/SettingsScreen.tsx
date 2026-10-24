import { useState } from 'react';
import { useApp } from '../core/app-context';
import { decodeArms } from '../core/experiments';
import { useSettings } from '../core/settings-store';
import { LANGUAGES, useT } from '../core/i18n';
import { TUNINGS } from '../vendor/fretfree/theory';
import styles from '../styles/app.module.css';

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
    setMicCheck('Asking for the microphone…');
    try {
      await mic.start();
      setMicCheck('Microphone works. Play a note to see it.');
      const off = mic.onEvent((e) => {
        setMicCheck(`Heard MIDI ${e.midi} at ${Math.round(e.confidence * 100)}% confidence.`);
      });
      setTimeout(() => {
        off();
        mic.stop();
      }, 8000);
    } catch (err) {
      setMicCheck(`Microphone failed: ${err instanceof Error ? err.message : String(err)}`);
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
        <span>
          Ask me to confirm when the mic is less than {Math.round(s.confirmBelow * 100)}% sure
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.confirmBelow}
          aria-label="Confirm threshold"
          onChange={(e) => void app.settings.update({ confirmBelow: Number(e.target.value) })}
        />
      </div>
      <Toggle
        label={t('settings.imagine')}
        value={s.imagineFirst}
        onChange={(v) => void app.settings.update({ imagineFirst: v })}
      />
      <div className={styles.field}>
        <span>{t('settings.labels')}</span>
        <div className={styles.row} role="group" aria-label="Degree labels">
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
        <div className={styles.row} role="group" aria-label="Handedness">
          {(['right', 'left'] as const).map((h) => (
            <button
              key={h}
              type="button"
              className={`${styles.button} ${s.handedness === h ? styles.primary : ''}`}
              aria-pressed={s.handedness === h}
              onClick={() => void app.settings.update({ handedness: h })}
            >
              {h}-handed
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <span>{t('settings.accidentals')}</span>
        <div className={styles.row} role="group" aria-label="Accidentals">
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
        <span>Weekly goal: {s.weeklyGoal === 0 ? 'off' : `${s.weeklyGoal} sessions`}</span>
        <input
          type="range"
          min={0}
          max={7}
          step={1}
          value={s.weeklyGoal}
          aria-label="Weekly goal in sessions"
          onChange={(e) => void app.settings.update({ weeklyGoal: Number(e.target.value) })}
        />
      </div>
      <p className={styles.muted}>
        A goal counts sessions; it never changes what the schedule asks you to practise.
      </p>
      <h3>Your experiment arms</h3>
      <p className={styles.muted}>
        Drawn once at first run (PRD §6):{' '}
        {(() => {
          const a = decodeArms(s.experimentArm);
          return `imagine-first ${a.imagine === 'random' ? 'at random per trial' : 'as set above'}; feedback ${a.feedback === 'random' ? 'full or faded at random per trial' : 'always full'}; labels started as ${a.labels}.`;
        })()}{' '}
        Progress compares the arms.
      </p>
      <h3>{t('settings.data')}</h3>
      <p className={styles.muted}>
        Everything stays on this device: results and settings only, never audio. Export it from
        Progress.
      </p>
      <div className={styles.row}>
        {!confirmReset ? (
          <button type="button" className={styles.button} onClick={() => setConfirmReset(true)}>
            Delete all my data…
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
              Yes, delete everything
            </button>
            <button type="button" className={styles.button} onClick={() => setConfirmReset(false)}>
              Keep it
            </button>
          </>
        )}
      </div>
    </div>
  );
}
