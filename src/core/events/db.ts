/**
 * Local storage (PRD D6): results and settings only, never audio. The trial
 * log is append-only; everything the dashboard shows is computed from it.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { GuideLevel, Handedness } from '../../vendor/fretfree/engine/model';
import type { AccidentalPref } from '../../vendor/fretfree/theory';
import type { CardRecord, LabelScheme, SessionRecord, TrialEvent } from '../types';

export interface Settings {
  key: 'singleton';
  handedness: Handedness;
  accidentalPref: AccidentalPref;
  labelScheme: LabelScheme;
  /** Mic answers below this confidence ask the learner to confirm by tap. Provisional until R2. */
  confirmBelow: number;
  /** A silent beat between hearing and playing (PRD B6). */
  imagineFirst: boolean;
  imagineMs: number;
  guideLevel: GuideLevel;
  micEnabled: boolean;
  soundOn: boolean;
  volume: number;
  /** The learner's experiment arm, drawn once at first run (PRD §6). */
  experimentArm: string;
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'singleton',
  handedness: 'right',
  accidentalPref: 'sharp',
  labelScheme: 'numbers',
  confirmBelow: 0.6,
  imagineFirst: false,
  imagineMs: 1200,
  guideLevel: 3,
  micEnabled: false,
  soundOn: true,
  volume: 0.8,
  experimentArm: 'default',
};

export const DB_NAME = 'glead';

/** Append a version to change the schema; never edit a released one. */
export const SCHEMA_VERSIONS: readonly { version: number; stores: Record<string, string> }[] = [
  {
    version: 1,
    stores: {
      settings: 'key',
      cards: 'itemId, skillId, fsrs.due',
      trials: '++id, trialId, sessionId, at, drillId, itemId, skillId, key, retest',
      sessions: '++id, sessionId, startedAt',
    },
  },
];

export class GLeadDB extends Dexie {
  settings!: EntityTable<Settings, 'key'>;
  cards!: EntityTable<CardRecord, 'itemId'>;
  trials!: EntityTable<TrialEvent, 'id'>;
  sessions!: EntityTable<SessionRecord, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    for (const v of SCHEMA_VERSIONS) this.version(v.version).stores(v.stores);
  }
}

export const TABLE_NAMES = ['settings', 'cards', 'trials', 'sessions'] as const;

let instance: GLeadDB | null = null;

export function getDb(): GLeadDB {
  return (instance ??= new GLeadDB());
}
