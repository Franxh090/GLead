import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Fretboard, type FretMarker } from '../vendor/fretfree/fretboard/Fretboard';
import { midiToFretNote } from '../vendor/fretfree/theory';
import { displayPc } from '../vendor/fretfree/theory/pitch-display';
import { playScript } from '../audio/player';
import { useApp } from '../core/app-context';
import { useT } from '../core/i18n';
import {
  LATENCY,
  micLabPrompts,
  storableSummary,
  summarise,
  type MicLabRecord,
} from '../core/miclab';
import { useSettings } from '../core/settings-store';
import type { InputAdapter, InputEvent } from '../core/types';
import styles from '../styles/app.module.css';
import { getTuning } from '../core/tunings';

type Phase = 'intro' | 'prompts' | 'latency' | 'done';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

/**
 * The Mic lab (research R2): walks the player through the note set, the
 * wrong-note set and the click-latency run, records what the detector heard,
 * and saves a summary with a suggested confirm threshold. Nothing here is
 * graded or scheduled; it measures the device.
 */
export function MicLabScreen({ onExit }: { onExit(): void }) {
  const t = useT();
  const app = useApp();
  const settings = useSettings(app.settings);
  const tuning = getTuning(settings.tuning);
  const PROMPTS = useMemo(() => micLabPrompts(tuning), [tuning]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [records, setRecords] = useState<MicLabRecord[]>([]);
  const [clicks, setClicks] = useState(0);
  const [saved, setSaved] = useState(false);
  const shownAt = useRef(0);
  const clickAt = useRef<number | null>(null);
  const clickDone = useRef<boolean>(false);
  const mic: InputAdapter | null = settings.micEnabled ? app.mic() : null;
  const micState = useSyncExternalStore(
    (cb) => (mic ? mic.onStateChange(cb) : () => undefined),
    () => mic?.state ?? 'idle',
    () => 'idle',
  );
  const prompt = PROMPTS[step] ?? null;

  const record = (r: MicLabRecord) => setRecords((rs) => [...rs, r]);
  /** The next prompt, or the latency run once the prompts are done. */
  const total = PROMPTS.length;
  const advance = useCallback(
    () =>
      setStep((st) => {
        const next = st + 1;
        if (next >= total) setPhase('latency');
        return next;
      }),
    [total],
  );

  // Prompts: the first stable note after the prompt appeared answers it.
  useEffect(() => {
    if (!mic || phase !== 'prompts' || !prompt) return;
    shownAt.current = performance.now();
    let answered = false;
    const off = mic.onEvent((e: InputEvent) => {
      if (answered || e.midi === undefined || e.at < shownAt.current) return;
      answered = true;
      record({
        part: prompt.part,
        index: prompt.index,
        expectedMidi: prompt.expectedMidi,
        heardMidi: e.midi,
        cents: e.cents ?? null,
        confidence: e.confidence,
        ms: Math.round(e.at - shownAt.current),
      });
      advance();
    });
    return off;
  }, [mic, phase, prompt, advance]);

  // Latency: a click every beat; the first note within the window after a click is its pluck.
  useEffect(() => {
    if (!mic || phase !== 'latency') return;
    let n = 0;
    const beat = 60_000 / LATENCY.bpm;
    const offNote = mic.onEvent((e: InputEvent) => {
      const at = clickAt.current;
      if (at === null || clickDone.current || e.midi === undefined) return;
      if (e.at >= at - 150 && e.at <= at + LATENCY.windowMs) {
        clickDone.current = true;
        record({
          part: 'latency',
          index: n - 1,
          expectedMidi: 0,
          heardMidi: e.midi,
          cents: e.cents ?? null,
          confidence: e.confidence,
          ms: Math.round(e.at - at),
        });
      }
    });
    const timer = setInterval(() => {
      if (n >= LATENCY.clicks) {
        clearInterval(timer);
        setTimeout(() => setPhase('done'), LATENCY.windowMs);
        return;
      }
      n += 1;
      clickAt.current = performance.now();
      clickDone.current = false;
      setClicks(n);
      void playScript([{ type: 'notes', notes: ['E6'], durationS: 0.08 }]);
    }, beat);
    return () => {
      clearInterval(timer);
      offNote();
    };
  }, [mic, phase]);

  const skip = () => {
    if (!prompt) return;
    record({
      part: prompt.part,
      index: prompt.index,
      expectedMidi: prompt.expectedMidi,
      heardMidi: null,
      cents: null,
      confidence: null,
      ms: null,
    });
    advance();
  };

  const summary = summarise(records, settings.confirmBelow);

  const save = async () => {
    await app.repo.saveMicLabRun({
      at: new Date(),
      userAgent: navigator.userAgent,
      confirmBelow: settings.confirmBelow,
      records,
      summary: storableSummary(summary),
    });
    setSaved(true);
  };

  if (!mic) {
    return (
      <div className={styles.card}>
        <h2>{t('miclab.title')}</h2>
        <p>{t('miclab.needMic')}</p>
        <button type="button" className={styles.button} onClick={onExit}>
          {t('miclab.back')}
        </button>
      </div>
    );
  }

  const markers: FretMarker[] = prompt
    ? [
        {
          ...prompt.play,
          style: 'target',
          label: displayPc(midiToFretNote(prompt.expectedMidi).pc),
          forceLabel: prompt.part === 'notes',
        },
      ]
    : [];

  return (
    <div className={styles.card}>
      <h2>{t('miclab.title')}</h2>
      {phase === 'intro' && (
        <>
          <p>{t('miclab.intro')}</p>
          <div className={styles.row}>
            {micState !== 'running' ? (
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={() => void mic.start().catch(() => undefined)}
              >
                {micState === 'error' ? t('session.retryMic') : t('session.startListening')}
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={() => setPhase('prompts')}
              >
                {t('miclab.beginNotes')}
              </button>
            )}
            <button type="button" className={styles.button} onClick={onExit}>
              {t('miclab.back')}
            </button>
          </div>
        </>
      )}
      {phase === 'prompts' && prompt && (
        <>
          <p className={styles.muted}>
            {t('miclab.of', {
              label: t(prompt.part === 'notes' ? 'miclab.note' : 'miclab.wrongNote'),
              n: prompt.index + 1,
              total: prompt.part === 'notes' ? 24 : 8,
            })}
          </p>
          <p>
            {prompt.part === 'notes'
              ? t('miclab.playPrompt', {
                  string: prompt.position.string,
                  fret: prompt.position.fret,
                  note: displayPc(midiToFretNote(prompt.expectedMidi).name),
                })
              : t('miclab.wrongPrompt', {
                  string: prompt.position.string,
                  fret: prompt.position.fret,
                  play: prompt.play.fret,
                })}
          </p>
          <div className={styles.neck}>
            <Fretboard
              tuning={tuning}
              fretRange={{ from: 0, to: 13 }}
              handedness={settings.handedness}
              markers={markers}
              guideLevel={3}
              revealNotes
              accidentalPref={settings.accidentalPref}
              label={t('miclab.neck')}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.status} role="status">
              {t('drill.listening')}
            </span>
            <button type="button" className={styles.button} onClick={skip}>
              {t('miclab.skip')}
            </button>
          </div>
        </>
      )}
      {phase === 'latency' && (
        <>
          <p>{t('miclab.clicks', { n: clicks, total: LATENCY.clicks })}</p>
          <span className={styles.status} role="status">
            {t('miclab.listeningPlucks')}
          </span>
        </>
      )}
      {phase === 'done' && (
        <>
          <h3>{t('miclab.results')}</h3>
          <div className={styles.scroll}>
            <table className={styles.table} aria-label={t('miclab.resultsAria')}>
              <tbody>
                <tr>
                  <th>{t('miclab.rAccepted')}</th>
                  <td>{pct(summary.correctAccepted)}</td>
                </tr>
                <tr>
                  <th>{t('miclab.rExact')}</th>
                  <td>{pct(summary.correctExact)}</td>
                </tr>
                <tr>
                  <th>{t('miclab.rConfirm', { threshold: settings.confirmBelow })}</th>
                  <td>{pct(summary.confirmShare)}</td>
                </tr>
                <tr>
                  <th>{t('miclab.rWrong')}</th>
                  <td>{pct(summary.wrongAccepted)}</td>
                </tr>
                <tr>
                  <th>{t('miclab.rSilent')}</th>
                  <td>{summary.silent}</td>
                </tr>
                <tr>
                  <th>{t('miclab.rLatency')}</th>
                  <td>
                    {summary.medianLatencyMs === null
                      ? '—'
                      : `${Math.round(summary.medianLatencyMs)} ms`}
                    {summary.latencySpreadMs === null
                      ? ''
                      : ` ± ${Math.round(summary.latencySpreadMs / 2)}`}
                  </td>
                </tr>
                <tr>
                  <th>{t('miclab.rSuggested')}</th>
                  <td>{summary.suggestedConfirmBelow ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <details>
            <summary>{t('miclab.every')}</summary>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.part}</td>
                      <td>
                        {r.expectedMidi ? displayPc(midiToFretNote(r.expectedMidi).name) : '—'}
                      </td>
                      <td>
                        {r.heardMidi === null
                          ? t('miclab.nothing')
                          : displayPc(midiToFretNote(r.heardMidi).name)}
                      </td>
                      <td>{r.cents === null ? '' : `${Math.round(r.cents)} c`}</td>
                      <td>{r.confidence === null ? '' : pct(r.confidence)}</td>
                      <td>{r.ms === null ? '' : `${r.ms} ms`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={saved}
              onClick={() => void save()}
            >
              {saved ? t('miclab.saved') : t('miclab.save')}
            </button>
            {summary.suggestedConfirmBelow !== null &&
              summary.suggestedConfirmBelow !== settings.confirmBelow && (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() =>
                    void app.settings.update({
                      confirmBelow: summary.suggestedConfirmBelow as number,
                    })
                  }
                >
                  {t('miclab.use', { n: summary.suggestedConfirmBelow })}
                </button>
              )}
            <button type="button" className={styles.button} onClick={onExit}>
              {t('miclab.backSettings')}
            </button>
          </div>
          <p className={styles.muted}>{t('miclab.footer')}</p>
        </>
      )}
    </div>
  );
}
