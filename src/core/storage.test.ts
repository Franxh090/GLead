import { describe, expect, it } from 'vitest';
import { persistenceStatus, requestPersistence } from './storage';

describe('storage persistence', () => {
  it('reports what the browser says, or unknown without the API', async () => {
    expect(await persistenceStatus(undefined)).toBe('unknown');
    expect(await persistenceStatus({})).toBe('unknown');
    expect(await persistenceStatus({ storage: { persisted: async () => true } })).toBe(
      'persistent',
    );
    expect(await persistenceStatus({ storage: { persisted: async () => false } })).toBe(
      'best-effort',
    );
    expect(await requestPersistence({ storage: { persist: async () => true } })).toBe('persistent');
    expect(await requestPersistence({ storage: { persist: async () => false } })).toBe(
      'best-effort',
    );
    expect(
      await requestPersistence({
        storage: {
          persist: async () => {
            throw new Error('no');
          },
        },
      }),
    ).toBe('unknown');
  });
});
