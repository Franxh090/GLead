import { useEffect, useState } from 'react';
import { useApp } from '../core/app-context';
import { useT } from '../core/i18n';
import { exportJson } from '../core/events/repo';
import {
  accuracyOf,
  chordToneHitRate,
  confirmShare,
  delayed,
  experimentReport,
  percent,
  placementBaseline,
  practiceOnly,
  skillReport,
  tallyAll,
  tallyBy,
  transfer,
} from '../core/metrics';
import { SKILLS, skillById } from '../drills/registry';
import type { TrialEvent } from '../core/types';
import { parseB1Item } from '../drills/b1-scale-degree/logic';
import styles from '../styles/app.module.css';

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an export file (`exportJson`) into trials with real dates; throws on anything else. */
export function parseExport(text: string): { trials: TrialEvent[]; exportedAt: string } {
  const data = JSON.parse(text) as { app?: string; exportedAt?: string; trials?: unknown[] };
  if (data.app !== 'glead' || !Array.isArray(data.trials)) throw new Error('Not a GLead export');
  const trials = (data.trials as (TrialEvent & { at: string | Date })[]).map((t) => ({
    ...t,
    at: new Date(t.at),
  }));
  return { trials, exportedAt: data.exportedAt ?? 'unknown date' };
}

export function ProgressScreen() {
  const t = useT();
  const app = useApp();
  const [own, setOwn] = useState<TrialEvent[] | null>(null);
  const [loaded, setLoaded] = useState<{ trials: TrialEvent[]; label: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void app.repo.trials().then(setOwn);
  }, [app]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { trials: t, exportedAt } = parseExport(await file.text());
      setLoaded({ trials: t, label: `${file.name} (exported ${exportedAt})` });
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  const trials = loaded ? loaded.trials : own;
  if (!trials) return <p className={styles.muted}>Loading…</p>;

  const practice = practiceOnly(trials);
  const all = tallyAll(practice);
  const d = delayed(trials);
  const tr = transfer(trials);
  const hits = chordToneHitRate(trials);
  const baseline = placementBaseline(trials);
  const reports = SKILLS.filter((sk) => trials.some((t) => t.skillId === sk.id)).map((sk) =>
    skillReport(trials, sk.id),
  );
  const experiments = experimentReport(trials);
  const byKey = tallyBy(practice, (t) => t.key);
  const byDegree = tallyBy(practice, (t) => {
    const r = parseB1Item(t.itemId);
    return r ? `${r.degree} (${r.mode})` : t.itemId;
  });
  const confirm = confirmShare(trials);

  return (
    <div className={styles.card}>
      <h2>{t('progress.title')}</h2>
      {loaded && (
        <div className={styles.status} role="status">
          Viewing <strong>{loaded.label}</strong>, read-only. Nothing from it is saved here.{' '}
          <button type="button" className={styles.button} onClick={() => setLoaded(null)}>
            Back to my data
          </button>
        </div>
      )}
      <p className={styles.muted}>{t('progress.blurb')}</p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <tbody>
            <tr>
              <th>Retest after 1 day</th>
              <td>{percent(accuracyOf(d['1d']))}</td>
              <td className={styles.muted}>{d['1d'].trials} trials</td>
            </tr>
            <tr>
              <th>Retest after 7 days</th>
              <td>{percent(accuracyOf(d['7d']))}</td>
              <td className={styles.muted}>{d['7d'].trials} trials</td>
            </tr>
            <tr>
              <th>Retest after 30 days</th>
              <td>{percent(accuracyOf(d['30d']))}</td>
              <td className={styles.muted}>{d['30d'].trials} trials</td>
            </tr>
            <tr>
              <th>Unseen keys (transfer)</th>
              <td>{percent(accuracyOf(tr))}</td>
              <td className={styles.muted}>{tr.trials} trials</td>
            </tr>
            <tr>
              <th>Chord-tone hit rate (Changes)</th>
              <td>{percent(accuracyOf(hits))}</td>
              <td className={styles.muted}>{hits.trials} changes</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.muted}>
        Retests are scheduled when a skill first reaches 90% over 20 trials; they appear on Today
        when due.
      </p>
      {Object.keys(baseline).length > 0 && (
        <>
          <h3>Placement baseline</h3>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <tbody>
                {Object.entries(baseline).map(([k, t]) => (
                  <tr key={k}>
                    <th>
                      {(() => {
                        try {
                          return skillById(k).title;
                        } catch {
                          return k;
                        }
                      })()}
                    </th>
                    <td>{percent(accuracyOf(t))}</td>
                    <td className={styles.muted}>{t.trials} trials</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {reports.length > 0 && (
        <>
          <h3>By skill</h3>
          <p className={styles.muted}>
            Trials to criterion is the trial at which a skill first hit 90% over 20; the learning
            rate is accuracy gained per 100 trials. Both are n-of-1 numbers.
          </p>
          <div className={styles.neck}>
            <table className={styles.table} aria-label="Skills">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Baseline</th>
                  <th>Trials</th>
                  <th>Recent</th>
                  <th>To criterion</th>
                  <th>Rate</th>
                  <th>1d</th>
                  <th>7d</th>
                  <th>30d</th>
                  <th>Transfer</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.skillId}>
                    <td>{skillById(r.skillId).title}</td>
                    <td>{percent(accuracyOf(r.baseline))}</td>
                    <td>{r.practice.trials}</td>
                    <td>{percent(r.recent)}</td>
                    <td>{r.trialsToCriterion ?? '—'}</td>
                    <td>
                      {r.learningRate === null
                        ? '—'
                        : `${r.learningRate >= 0 ? '+' : ''}${Math.round(r.learningRate)}`}
                    </td>
                    <td>{percent(accuracyOf(r.retests['1d']))}</td>
                    <td>{percent(accuracyOf(r.retests['7d']))}</td>
                    <td>{percent(accuracyOf(r.retests['30d']))}</td>
                    <td>{percent(accuracyOf(r.transfer))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h3>Experiments</h3>
      <p className={styles.muted}>
        Each trial was dealt its conditions at random, so these compare like with like. One learner
        is not a study: treat a gap as a hint, not a finding.
      </p>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label="Experiments">
          <tbody>
            {experiments.map((e) => (
              <tr key={e.question}>
                <th>{e.question}</th>
                {e.arms.map((a) => (
                  <td key={a.label}>
                    {a.label}: {percent(accuracyOf(a.tally))}{' '}
                    <span className={styles.muted}>({a.tally.trials})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>In session</h3>
      <p>
        <span className={styles.big}>{percent(accuracyOf(all))}</span>{' '}
        <span className={styles.muted}>over {all.trials} trials</span>
        {confirm !== null && (
          <span className={styles.muted}>
            {' '}
            · {percent(confirm)} of mic answers needed confirming
          </span>
        )}
      </p>
      {Object.keys(byDegree).length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Degree</th>
                <th>Accuracy</th>
                <th>Trials</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDegree)
                .sort()
                .map(([k, t]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{percent(accuracyOf(t))}</td>
                    <td>{t.trials}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {Object.keys(byKey).length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Key</th>
                <th>Accuracy</th>
                <th>Trials</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byKey).map(([k, t]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{percent(accuracyOf(t))}</td>
                  <td>{t.trials}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => void exportJson(app.repo).then((j) => download('glead-export.json', j))}
        >
          {t('progress.export')}
        </button>
        <label className={styles.button} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {t('progress.view')}
          <input
            type="file"
            accept="application/json,.json"
            aria-label={t('progress.view')}
            style={{ display: 'none' }}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {loadError && <span className={styles.bad}>{loadError}</span>}
      </div>
    </div>
  );
}
