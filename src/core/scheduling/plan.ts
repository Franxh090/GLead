/**
 * Session planning (PRD B7, D2): due reviews first, new items in small
 * blocks, everything interleaved so no item follows itself, and a missed
 * item dealt again a few trials later. Keys rotate per prompt, so the plan
 * only decides *what*, never *in which key*.
 *
 * Simpler than FretFree's lane-based builder on purpose: GLead has few
 * skills, and the measurement plan (R5) wants a schedule it can describe in a
 * sentence. Deterministic given `now` and `rng`.
 */
import type { Scheduler } from '../../vendor/fretfree/engine/scheduler';
import type { CardRecord, Item } from '../types';
import { pick } from '../keys';

export type EntryKind = 'review' | 'new' | 'retry';

export interface PlanEntry {
  item: Item;
  kind: EntryKind;
}

export const PLAN = {
  /** Rough time per trial, used to turn minutes into a trial count. */
  secondsPerTrial: 8,
  /** New items a 10-minute session may introduce. */
  maxNewPer10Min: 6,
  /** New items enter in blocks of this size, each repeated this many times in the block. */
  newBlockSize: 3,
  newBlockReps: 2,
  /** A miss comes back this many trials later. */
  retryGap: 3,
} as const;

export function sessionLength(minutes: number): number {
  return Math.max(6, Math.round((minutes * 60) / PLAN.secondsPerTrial));
}

export function newItemCap(minutes: number): number {
  return Math.max(PLAN.newBlockSize, Math.round((PLAN.maxNewPer10Min * minutes) / 10));
}

export interface PlanInput {
  now: Date;
  minutes: number;
  items: readonly Item[];
  cards: readonly CardRecord[];
  scheduler: Pick<Scheduler, 'isDue'>;
  rng: () => number;
}

/** Shuffle in place (Fisher–Yates) with the given rng. */
export function shuffle<T>(xs: T[], rng: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = pick(i + 1, rng);
    [xs[i], xs[j]] = [xs[j] as T, xs[i] as T];
  }
  return xs;
}

/**
 * Interleave two ordered lists so entries spread evenly, then fix any run of
 * the same item by swapping one of the pair with a later entry.
 */
export function interleave(a: PlanEntry[], b: PlanEntry[]): PlanEntry[] {
  const out: PlanEntry[] = [];
  const total = a.length + b.length;
  let i = 0;
  let j = 0;
  for (let k = 0; k < total; k++) {
    const takeA = j >= b.length || (i < a.length && i * b.length <= j * a.length);
    out.push(takeA ? (a[i++] as PlanEntry) : (b[j++] as PlanEntry));
  }
  return spreadRepeats(out);
}

/** No two consecutive entries share an item, where any arrangement allows it. */
export function spreadRepeats(entries: PlanEntry[]): PlanEntry[] {
  const out = [...entries];
  for (let k = 1; k < out.length; k++) {
    if (out[k]!.item.id !== out[k - 1]!.item.id) continue;
    const swap = out.findIndex(
      (e, idx) =>
        idx > k &&
        e.item.id !== out[k - 1]!.item.id &&
        (idx + 1 >= out.length || out[idx + 1]!.item.id !== out[k]!.item.id) &&
        out[idx - 1]!.item.id !== out[k]!.item.id,
    );
    if (swap > 0) [out[k], out[swap]] = [out[swap] as PlanEntry, out[k] as PlanEntry];
  }
  return out;
}

export function planSession(input: PlanInput): PlanEntry[] {
  const { now, minutes, items, cards, scheduler, rng } = input;
  const length = sessionLength(minutes);
  const byId = new Map(cards.map((c) => [c.itemId, c]));
  const known = new Set(cards.map((c) => c.itemId));

  const due = cards
    .filter((c) => scheduler.isDue(c, now))
    .sort((x, y) => x.fsrs.due.getTime() - y.fsrs.due.getTime())
    .map((c) => items.find((i) => i.id === c.itemId))
    .filter((i): i is Item => Boolean(i));
  const reviews: PlanEntry[] = shuffle(due, rng).map((item) => ({ item, kind: 'review' }));

  const fresh = items.filter((i) => !known.has(i.id));
  const cap = Math.min(newItemCap(minutes), fresh.length);
  const chosen = fresh.slice(0, cap);
  const news: PlanEntry[] = [];
  for (let b = 0; b < chosen.length; b += PLAN.newBlockSize) {
    const block = chosen.slice(b, b + PLAN.newBlockSize);
    for (let r = 0; r < PLAN.newBlockReps; r++) {
      for (const item of block) news.push({ item, kind: 'new' });
    }
  }

  let plan = interleave(reviews, news);
  // Top up a short plan with the items least recently reviewed, so a session
  // is never shorter than its budget while anything is practisable.
  if (plan.length < length) {
    const pool = items.filter((i) => known.has(i.id) || chosen.includes(i));
    const sorted = [...pool].sort(
      (x, y) =>
        (byId.get(x.id)?.lastReviewedAt?.getTime() ?? 0) -
        (byId.get(y.id)?.lastReviewedAt?.getTime() ?? 0),
    );
    const extra: PlanEntry[] = [];
    for (let k = 0; plan.length + extra.length < length && sorted.length > 0; k++) {
      extra.push({ item: sorted[k % sorted.length] as Item, kind: 'review' });
    }
    plan = spreadRepeats([...plan, ...shuffle(extra, rng)]);
  }
  return plan.slice(0, length);
}

/** Where a missed item goes back into the queue: `gap` trials on, or at the end. */
export function retryIndex(
  current: number,
  remaining: number,
  gap: number = PLAN.retryGap,
): number {
  return Math.min(current + gap, current + remaining);
}
