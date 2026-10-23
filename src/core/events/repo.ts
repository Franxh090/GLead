import type { GLeadDB, Settings } from './db';
import { DEFAULT_SETTINGS, TABLE_NAMES } from './db';
import type { CardRecord, RetestRecord, SessionRecord, TrialEvent } from '../types';

export interface Repo {
  getSettings(): Promise<Settings>;
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
  /** Everything, as one JSON-able object (PRD D6 export). */
  exportAll(): Promise<Record<string, unknown[]>>;
  clearAll(): Promise<void>;
}

export function createRepo(db: GLeadDB): Repo {
  return {
    async getSettings() {
      const row = await db.settings.get('singleton');
      return { ...DEFAULT_SETTINGS, ...row };
    },
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
    async exportAll() {
      const out: Record<string, unknown[]> = {};
      for (const name of TABLE_NAMES) out[name] = await db.table(name).toArray();
      return out;
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
