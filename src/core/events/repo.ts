import type { GLeadDB, Settings } from './db';
import { DEFAULT_SETTINGS, TABLE_NAMES } from './db';
import type { CardRecord, RetestRecord, SessionRecord, TrialEvent } from '../types';
import type { MicLabRun } from '../miclab';
import type { ExportData, ImportReport } from './import';

export interface Repo {
  getSettings(): Promise<Settings>;
  /** Whether a settings row exists yet (first run otherwise). */
  hasSettings(): Promise<boolean>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  allCards(): Promise<CardRecord[]>;
  saveCard(card: CardRecord): Promise<void>;
  logTrial(event: TrialEvent): Promise<void>;
  trials(): Promise<TrialEvent[]>;
  saveSession(session: SessionRecord): Promise<void>;
  sessions(): Promise<SessionRecord[]>;
  retests(): Promise<RetestRecord[]>;
  saveRetest(retest: RetestRecord): Promise<void>;
  saveCards(cards: readonly CardRecord[]): Promise<void>;
  saveMicLabRun(run: MicLabRun): Promise<void>;
  micLabRuns(): Promise<MicLabRun[]>;
  /** Everything, as one JSON-able object (PRD D6 export). */
  exportAll(): Promise<Record<string, unknown[]>>;
  /**
   * Merges an export in by id: trials by `trialId`, sessions by `sessionId`,
   * cards by item (the later review wins), retests by skill, delay and anchor,
   * Mic lab runs by time. Settings come in only when this device has no data
   * of its own. Running it twice adds nothing twice.
   */
  importAll(data: ExportData): Promise<ImportReport>;
  counts(): Promise<{ trials: number; sessions: number; cards: number }>;
  clearAll(): Promise<void>;
}

export function createRepo(db: GLeadDB): Repo {
  return {
    async getSettings() {
      const row = await db.settings.get('singleton');
      return { ...DEFAULT_SETTINGS, ...row };
    },
    hasSettings: async () => (await db.settings.get('singleton')) !== undefined,
    async saveSettings(patch) {
      const current = await this.getSettings();
      const next = { ...current, ...patch, key: 'singleton' as const };
      await db.settings.put(next);
      return next;
    },
    allCards: () => db.cards.toArray(),
    async saveCard(card) {
      await db.cards.put(card);
    },
    async logTrial(event) {
      await db.trials.add(event);
    },
    trials: () => db.trials.orderBy('at').toArray(),
    async saveSession(session) {
      const existing = await db.sessions.where('sessionId').equals(session.sessionId).first();
      await db.sessions.put(existing?.id === undefined ? session : { ...session, id: existing.id });
    },
    sessions: () => db.sessions.orderBy('startedAt').toArray(),
    retests: () => db.retests.orderBy('dueAt').toArray(),
    async saveRetest(retest) {
      await db.retests.put(retest);
    },
    async saveCards(cards) {
      await db.cards.bulkPut([...cards]);
    },
    async saveMicLabRun(run) {
      await db.miclab.add(run);
    },
    micLabRuns: () => db.miclab.orderBy('at').toArray(),
    async exportAll() {
      const out: Record<string, unknown[]> = {};
      for (const name of TABLE_NAMES) out[name] = await db.table(name).toArray();
      return out;
    },
    importAll(data) {
      return db.transaction('rw', [...TABLE_NAMES], async () => {
        const report: ImportReport = {
          trials: 0,
          sessions: 0,
          cards: 0,
          retests: 0,
          micLabRuns: 0,
          settings: false,
        };
        const fresh = (await db.trials.count()) === 0 && (await db.sessions.count()) === 0;
        const strip = <T extends { id?: number }>(row: T): Omit<T, 'id'> => {
          const { id: _id, ...rest } = row;
          return rest;
        };
        const trialIds = new Set((await db.trials.toArray()).map((t) => t.trialId));
        for (const t of data.trials ?? []) {
          if (trialIds.has(t.trialId)) continue;
          await db.trials.add(strip(t) as TrialEvent);
          trialIds.add(t.trialId);
          report.trials += 1;
        }
        const sessionIds = new Set((await db.sessions.toArray()).map((s) => s.sessionId));
        for (const s of data.sessions ?? []) {
          if (sessionIds.has(s.sessionId)) continue;
          await db.sessions.add(strip(s) as SessionRecord);
          sessionIds.add(s.sessionId);
          report.sessions += 1;
        }
        const when = (d: Date | null | undefined) => (d ? new Date(d).getTime() : 0);
        for (const c of data.cards ?? []) {
          const local = await db.cards.get(c.itemId);
          if (local && when(local.lastReviewedAt) >= when(c.lastReviewedAt)) continue;
          await db.cards.put(c);
          report.cards += 1;
        }
        const retestKey = (r: RetestRecord) => `${r.skillId}|${r.delay}|${when(r.anchoredAt)}`;
        const retestKeys = new Set((await db.retests.toArray()).map(retestKey));
        for (const r of data.retests ?? []) {
          if (retestKeys.has(retestKey(r))) continue;
          await db.retests.add(strip(r) as RetestRecord);
          retestKeys.add(retestKey(r));
          report.retests += 1;
        }
        const runTimes = new Set((await db.miclab.toArray()).map((r) => when(r.at)));
        for (const r of data.miclab ?? []) {
          if (runTimes.has(when(r.at))) continue;
          await db.miclab.add(strip(r) as MicLabRun);
          runTimes.add(when(r.at));
          report.micLabRuns += 1;
        }
        const incoming = data.settings?.[0];
        if (fresh && incoming) {
          // Over the local row, so a file without experiment arms keeps the ones dealt here.
          const local = await db.settings.get('singleton');
          await db.settings.put({ ...DEFAULT_SETTINGS, ...local, ...incoming, key: 'singleton' });
          report.settings = true;
        }
        return report;
      });
    },
    async counts() {
      return {
        trials: await db.trials.count(),
        sessions: await db.sessions.count(),
        cards: await db.cards.count(),
      };
    },
    async clearAll() {
      await db.transaction('rw', [...TABLE_NAMES], async () => {
        for (const name of TABLE_NAMES) await db.table(name).clear();
      });
    },
  };
}

/** The export file: tables plus a header, so a later version knows what it reads. */
export async function exportJson(repo: Repo, now: Date = new Date()): Promise<string> {
  const data = await repo.exportAll();
  return JSON.stringify(
    { app: 'glead', format: 1, exportedAt: now.toISOString(), ...data },
    null,
    2,
  );
}
