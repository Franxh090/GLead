/**
 * Whether the browser has promised to keep the site's data (the Storage
 * API's persistence). Browsers may evict best-effort storage when space runs
 * low or a site goes unused; an installed PWA is usually safe, a tab is not.
 * The app asks once real data exists and tells the learner the answer.
 */
export type Persistence = 'persistent' | 'best-effort' | 'unknown';

type StorageNav = { storage?: { persisted?(): Promise<boolean>; persist?(): Promise<boolean> } };

export async function persistenceStatus(
  nav: StorageNav | undefined = globalThis.navigator as StorageNav | undefined,
): Promise<Persistence> {
  try {
    if (!nav?.storage?.persisted) return 'unknown';
    return (await nav.storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unknown';
  }
}

export async function requestPersistence(
  nav: StorageNav | undefined = globalThis.navigator as StorageNav | undefined,
): Promise<Persistence> {
  try {
    if (!nav?.storage?.persist) return 'unknown';
    return (await nav.storage.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unknown';
  }
}
