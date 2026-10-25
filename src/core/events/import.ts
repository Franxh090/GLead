/**
 * Reading an export file back (PRD D6: the data is the learner's). JSON has
 * no dates, so the known date fields are revived here; the repository then
 * merges by id, so restoring the same file twice adds nothing twice.
 */
import type { MicLabRun } from '../miclab';
import type { CardRecord, RetestRecord, SessionRecord, TrialEvent } from '../types';
import type { Settings } from './db';

export interface ExportData {
  app: 'glead';
  format: number;
  exportedAt?: string;
  settings?: Settings[];
  cards?: CardRecord[];
  trials?: TrialEvent[];
  sessions?: SessionRecord[];
  retests?: RetestRecord[];
  miclab?: MicLabRun[];
}

export interface ImportReport {
  trials: number;
  sessions: number;
  cards: number;
  retests: number;
  micLabRuns: number;
  /** Settings were taken from the file: only when this device had no data of its own. */
  settings: boolean;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const DATE_KEYS = new Set([
  'at',
  'createdAt',
  'lastReviewedAt',
  'due',
  'last_review',
  'startedAt',
  'endedAt',
  'anchoredAt',
  'dueAt',
  'doneAt',
]);

/** Dates back from their ISO strings, wherever a known date field holds one. */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] =
        DATE_KEYS.has(k) && typeof v === 'string' && ISO.test(v) ? new Date(v) : reviveDates(v);
    }
    return out as T;
  }
  return value;
}

/** Parses an export file; throws on anything that is not one. */
export function parseExportFile(text: string): ExportData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not a GLead export');
  }
  const d = data as Partial<ExportData>;
  if (!d || d.app !== 'glead' || !Array.isArray(d.trials)) throw new Error('Not a GLead export');
  return reviveDates(d) as ExportData;
}
