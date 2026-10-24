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
  passingNotes,
  practiceOnly,
  responseInKeyRate,
  stepApproachRate,
  skillReport,
  songPhraseRate,
  tallyAll,
  tallyBy,
  transfer,
} from '../core/metrics';
import { SKILLS, skillById, skillTitle } from '../drills/registry';
import { pooledExperiments, summariseParticipant, type ParticipantSummary } from '../core/cohort';
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
  const [cohort, setCohort] = useState<{ trials: TrialEvent[]; label: string }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void app.repo.trials().then(setOwn);
  }, [app]);

  /** One file opens read-only in place of your own data; several open the cohort view. */
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const parsed = await Promise.all(
        Array.from(files).map(async (file) => {
          const { trials: tr, exportedAt } = parseExport(await file.text());
          return {
            trials: tr,
            label: t('progress.exported', { name: file.name, date: exportedAt }),
          };
        }),
      );
      if (parsed.length === 1) {
        setLoaded(parsed[0] ?? null);
        setCohort(null);
      } else {
        setCohort(parsed);
        setLoaded(null);
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  const trials = loaded ? loaded.trials : own;
  if (!trials) return <p className={styles.muted}>{t('progress.loading')}</p>;
  if (cohort) return <CohortView cohort={cohort} onBack={() => setCohort(null)} />;

  const practice = practiceOnly(trials);
  const all = tallyAll(practice);
  const d = delayed(trials);
  const tr = transfer(trials);
  const hits = chordToneHitRate(trials);
  const responses = responseInKeyRate(trials);
  const steps = stepApproachRate(trials);
  const passing = passingNotes(trials);
  const songs = songPhraseRate(trials);
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
          {t('progress.viewing')} <strong>{loaded.label}</strong>
          {t('progress.readOnly')}{' '}
          <button type="button" className={styles.button} onClick={() => setLoaded(null)}>
            {t('progress.backMine')}
          </button>
        </div>
      )}
      <p className={styles.muted}>{t('progress.blurb')}</p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <tbody>
            <tr>
              <th>{t('progress.retest1')}</th>
              <td>{percent(accuracyOf(d['1d']))}</td>
              <td className={styles.muted}>{t('progress.nTrials', { n: d['1d'].trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.retest7')}</th>
              <td>{percent(accuracyOf(d['7d']))}</td>
              <td className={styles.muted}>{t('progress.nTrials', { n: d['7d'].trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.retest30')}</th>
              <td>{percent(accuracyOf(d['30d']))}</td>
              <td className={styles.muted}>{t('progress.nTrials', { n: d['30d'].trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.transfer')}</th>
              <td>{percent(accuracyOf(tr))}</td>
              <td className={styles.muted}>{t('progress.nTrials', { n: tr.trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.hits')}</th>
              <td>{percent(accuracyOf(hits))}</td>
              <td className={styles.muted}>{t('progress.nChanges', { n: hits.trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.responses')}</th>
              <td>{percent(accuracyOf(responses))}</td>
              <td className={styles.muted}>{t('progress.nTakes', { n: responses.trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.stepApproach')}</th>
              <td>{percent(accuracyOf(steps))}</td>
              <td className={styles.muted}>{t('progress.nLandings', { n: steps.trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.passing')}</th>
              <td>{percent(accuracyOf(passing))}</td>
              <td className={styles.muted}>{t('progress.nNotes', { n: passing.trials })}</td>
            </tr>
            <tr>
              <th>{t('progress.songs')}</th>
              <td>{percent(accuracyOf(songs))}</td>
              <td className={styles.muted}>{t('progress.nTrials', { n: songs.trials })}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.muted}>{t('progress.retestNote')}</p>
      {Object.keys(baseline).length > 0 && (
        <>
          <h3>{t('progress.baseline')}</h3>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <tbody>
                {Object.entries(baseline).map(([k, tally]) => (
                  <tr key={k}>
                    <th>
                      {(() => {
                        try {
                          skillById(k);
                          return skillTitle(k);
                        } catch {
                          return k;
                        }
                      })()}
                    </th>
                    <td>{percent(accuracyOf(tally))}</td>
                    <td className={styles.muted}>{t('progress.nTrials', { n: tally.trials })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {reports.length > 0 && (
        <>
          <h3>{t('progress.bySkill')}</h3>
          <p className={styles.muted}>{t('progress.bySkillNote')}</p>
          <div className={styles.neck}>
            <table className={styles.table} aria-label={t('progress.skillsAria')}>
              <thead>
                <tr>
                  <th>{t('progress.colSkill')}</th>
                  <th>{t('progress.colBaseline')}</th>
                  <th>{t('progress.colTrials')}</th>
                  <th>{t('progress.colRecent')}</th>
                  <th>{t('progress.colCriterion')}</th>
                  <th>{t('progress.colRate')}</th>
                  <th>1d</th>
                  <th>7d</th>
                  <th>30d</th>
                  <th>{t('progress.colTransfer')}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.skillId}>
                    <td>{skillTitle(r.skillId)}</td>
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
      <h3>{t('progress.experiments')}</h3>
      <p className={styles.muted}>{t('progress.experimentsNote')}</p>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={t('progress.experiments')}>
          <tbody>
            {experiments.map((e) => (
              <tr key={e.id}>
                <th>{t(`exp.${e.id}`)}</th>
                {e.arms.map((a) => (
                  <td key={a.id}>
                    {t(`exp.${e.id}.${a.id}`)}: {percent(accuracyOf(a.tally))}{' '}
                    <span className={styles.muted}>({a.tally.trials})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{t('progress.inSession')}</h3>
      <p>
        <span className={styles.big}>{percent(accuracyOf(all))}</span>{' '}
        <span className={styles.muted}>{t('progress.over', { n: all.trials })}</span>
        {confirm !== null && (
          <span className={styles.muted}> {t('progress.confirm', { pct: percent(confirm) })}</span>
        )}
      </p>
      {Object.keys(byDegree).length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('progress.colDegree')}</th>
                <th>{t('progress.colAccuracy')}</th>
                <th>{t('progress.colTrials')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDegree)
                .sort()
                .map(([k, tally]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{percent(accuracyOf(tally))}</td>
                    <td>{tally.trials}</td>
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
                <th>{t('progress.colKey')}</th>
                <th>{t('progress.colAccuracy')}</th>
                <th>{t('progress.colTrials')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byKey).map(([k, tally]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{percent(accuracyOf(tally))}</td>
                  <td>{tally.trials}</td>
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
            multiple
            onChange={(e) => void onFiles(e.target.files)}
          />
        </label>
        {loadError && <span className={styles.bad}>{loadError}</span>}
      </div>
    </div>
  );
}

/** Several exports at once (pilot kit §4): one row per participant, then the experiments pooled. */
function CohortView({
  cohort,
  onBack,
}: {
  cohort: { trials: TrialEvent[]; label: string }[];
  onBack(): void;
}) {
  const t = useT();
  const skillIds = SKILLS.map((s) => s.id);
  const rows: ParticipantSummary[] = cohort.map((c) =>
    summariseParticipant(c.label, c.trials, skillIds),
  );
  const pooled = pooledExperiments(cohort);
  return (
    <div className={styles.card}>
      <h2>{t('progress.cohortTitle', { n: cohort.length })}</h2>
      <div className={styles.status} role="status">
        {t('progress.cohortNote')}{' '}
        <button type="button" className={styles.button} onClick={onBack}>
          {t('progress.backMine')}
        </button>
      </div>
      <div className={styles.scroll}>
        <table
          className={styles.table}
          aria-label={t('progress.cohortTitle', { n: cohort.length })}
        >
          <thead>
            <tr>
              <th>{t('progress.colParticipant')}</th>
              <th>{t('progress.colTrials')}</th>
              <th>{t('progress.colSessions')}</th>
              <th>{t('progress.colPlacement')}</th>
              <th>{t('progress.colAtCriterion')}</th>
              <th>7d</th>
              <th>30d</th>
              <th>{t('progress.colTransfer')}</th>
              <th>{t('progress.colHits')}</th>
              <th>{t('progress.colConfirm')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{r.trials}</td>
                <td>{r.sessions}</td>
                <td>{percent(accuracyOf(r.placement))}</td>
                <td>{r.skillsAtCriterion.map(skillTitle).join(', ') || '—'}</td>
                <td>{percent(accuracyOf(r.retest7))}</td>
                <td>{percent(accuracyOf(r.retest30))}</td>
                <td>{percent(accuracyOf(r.transfer))}</td>
                <td>{percent(accuracyOf(r.hits))}</td>
                <td>{percent(r.confirmShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{t('progress.pooled')}</h3>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={t('progress.pooled')}>
          <tbody>
            {pooled.map((e) => (
              <tr key={e.id}>
                <th>{t(`exp.${e.id}`)}</th>
                {e.arms.map((a) => (
                  <td key={a.id}>
                    {t(`exp.${e.id}.${a.id}`)}:{' '}
                    {t('progress.pooledCell', {
                      pct: percent(accuracyOf(a.tally)),
                      trials: a.tally.trials,
                      participants: a.participants,
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
