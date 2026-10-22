/** Short random IDs for sessions and trials; `crypto.randomUUID` where it exists. */
export function newId(prefix: string, rng: () => number = Math.random): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `${prefix}_${c.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Math.floor(rng() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')}`;
}
