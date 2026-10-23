import { useEffect, useState } from 'react';
import { useApp } from '../core/app-context';
import { exportJson } from '../core/events/repo';
import {
  accuracyOf,
  chordToneHitRate,
  confirmShare,
  delayed,
  percent,
  placementBaseline,
  practiceOnly,
  tallyAll,
  tallyBy,
  transfer,
} from '../core/metrics';
import { skillById } from '../drills/registry';
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
