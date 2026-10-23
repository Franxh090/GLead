import { useEffect, useState } from 'react';
import { useApp } from '../core/app-context';
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

export function ProgressScreen() {
  const app = useApp();
  const [trials, setTrials] = useState<TrialEvent[] | null>(null);

  useEffect(() => {
    void app.repo.trials().then(setTrials);
  }, [app]);

  if (!trials) return <p className={styles.muted}>Loading…</p>;

  const practice = practiceOnly(trials);
  const all = tallyAll(practice);
  const d = delayed(trials);
  const tr = transfer(trials);
  const hits = chordToneHitRate(trials);
  const baseline = placementBaseline(trials);
  const reports = SKILLS.map((sk) => skillReport(trials, sk.id)).filter(
    (r) => r.practice.trials > 0 || r.baseline.trials > 0,
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
      <h2>Progress</h2>
      <p className={styles.muted}>
        Delayed and transfer results first: they show what stuck, not what felt fluent today.
      </p>
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
      <p className={styles.muted}>
        Retests are scheduled when a skill first reaches 90% over 20 trials; they appear on Today
        when due.
      </p>
      {Object.keys(baseline).length > 0 && (
        <>
          <h3>Placement baseline</h3>
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
      )}
      {Object.keys(byKey).length > 0 && (
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
      )}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => void exportJson(app.repo).then((j) => download('glead-export.json', j))}
        >
          Export my data (JSON)
        </button>
      </div>
    </div>
  );
}
