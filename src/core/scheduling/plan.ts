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
  /** Blocked practice (the control arm): skills one after another, not interleaved. */
  blocked?: boolean;
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
  const { now, minutes, items, cards, scheduler, rng, blocked = false } = input;
  const length = sessionLength(minutes);
  const byId = new Map(cards.map((c) => [c.itemId, c]));
  const known = new Set(cards.map((c) => c.itemId));

  const due = cards
    .filter((c) => scheduler.isDue(c, now))
    .sort((x, y) => x.fsrs.due.getTime() - y.fsrs.due.getTime())
    .map((c) => items.find((i) => i.id === c.itemId))
    .filter((i): i is Item => Boolean(i));
  const reviews: PlanEntry[] = (blocked ? groupBySkill(due) : shuffle(due, rng)).map((item) => ({
    item,
    kind: 'review',
  }));

  const unknown = items.filter((i) => !known.has(i.id));
  const fresh = blocked ? groupBySkill(unknown) : roundRobinBySkill(unknown);
  const cap = Math.min(newItemCap(minutes), fresh.length);
  const chosen = fresh.slice(0, cap);
  const news: PlanEntry[] = [];
  for (let b = 0; b < chosen.length; b += PLAN.newBlockSize) {
    const block = chosen.slice(b, b + PLAN.newBlockSize);
    for (let r = 0; r < PLAN.newBlockReps; r++) {
      for (const item of block) news.push({ item, kind: 'new' });
    }
  }

  let plan = blocked
    ? spreadRepeats([...reviews, ...news])
    : spreadSkills(interleave(reviews, news));
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
    plan = blocked
      ? spreadRepeats([
          ...plan,
          ...groupBySkill(extra.map((e) => e.item)).map((item) => ({
            item,
            kind: 'review' as const,
          })),
        ])
      : spreadSkills(spreadRepeats([...plan, ...shuffle(extra, rng)]));
  }
  return plan.slice(0, length);
}

/** Items in skill order, each skill's items together (blocked practice). */
export function groupBySkill(items: readonly Item[]): Item[] {
  const order: string[] = [];
  for (const i of items) if (!order.includes(i.skillId)) order.push(i.skillId);
  return order.flatMap((skillId) => items.filter((i) => i.skillId === skillId));
}

/**
 * Items of several skills dealt in turns (PRD B7: interleave skills), so a
 * session that opens two skills introduces one item of each by turns rather
 * than all of one skill first.
 */
export function roundRobinBySkill(items: readonly Item[]): Item[] {
  const bySkill = new Map<string, Item[]>();
  for (const i of items) bySkill.set(i.skillId, [...(bySkill.get(i.skillId) ?? []), i]);
  const queues = [...bySkill.values()];
  const out: Item[] = [];
  for (let k = 0; out.length < items.length; k++) {
    const q = queues[k % queues.length];
    const next = q?.shift();
    if (next) out.push(next);
  }
  return out;
}

/**
 * Where two skills are in play, avoid long runs of one: an entry that
 * continues a run of its skill swaps with the next entry of another skill,
 * unless that would put the same item twice in a row.
 */
export function spreadSkills(entries: PlanEntry[]): PlanEntry[] {
  const out = [...entries];
  const skills = new Set(out.map((e) => e.item.skillId));
  if (skills.size < 2) return out;
  for (let k = 2; k < out.length; k++) {
    const a = out[k - 2]!.item.skillId;
    const b = out[k - 1]!.item.skillId;
    if (a !== b || out[k]!.item.skillId !== b) continue;
    const swap = out.findIndex(
      (e, idx) =>
        idx > k &&
        e.item.skillId !== b &&
        e.item.id !== out[k - 1]!.item.id &&
        (idx + 1 >= out.length || out[idx + 1]!.item.id !== out[k]!.item.id) &&
        out[idx - 1]!.item.id !== out[k]!.item.id,
    );
    if (swap > 0) [out[k], out[swap]] = [out[swap] as PlanEntry, out[k] as PlanEntry];
  }
  return out;
}

/** Where a missed item goes back into the queue: `gap` trials on, or at the end. */
export function retryIndex(
  current: number,
  remaining: number,
  gap: number = PLAN.retryGap,
): number {
  return Math.min(current + gap, current + remaining);
}

// --- The session's shape (PRD D2) ------------------------------------------

export interface SessionShape {
  /** One line, stated up front. */
  goal: string;
  /** How many trials warm the ear up with reviews before new material. */
  warmUp: number;
  /** The skills that bring new items this session. */
  concepts: string[];
  /** A play-along to finish on, when the session is long enough. */
  playAlong: { minutes: number } | null;
}

/**
 * Warm-up, one concept, one play-along (research findings 1 and 4): the
 * plan's reviews come first; new items follow; a session of ten minutes or
 * more ends on a short take over a loop.
 */
export function sessionShape(
  plan: readonly PlanEntry[],
  minutes: number,
  titleOf: (skillId: string) => string,
): SessionShape {
  const reviews = plan.filter((e) => e.kind === 'review').length;
  const concepts = [...new Set(plan.filter((e) => e.kind === 'new').map((e) => e.item.skillId))];
  const playAlong = minutes >= 10 ? { minutes: minutes >= 20 ? 4 : 2 } : null;
  const parts: string[] = [];
  if (reviews > 0) parts.push(`${reviews} review${reviews === 1 ? '' : 's'} to warm up`);
  if (concepts.length > 0) parts.push(`new: ${concepts.map(titleOf).join(' and ')}`);
  if (playAlong) parts.push(`then ${playAlong.minutes} minutes over a loop`);
  return {
    goal: parts.length ? parts.join(', ') + '.' : 'A short pass over what you know.',
    warmUp: reviews,
    concepts,
    playAlong,
  };
}

/** Reviews first, then the rest, keeping the no-repeat rule. */
export function warmUpFirst(plan: readonly PlanEntry[]): PlanEntry[] {
  const reviews = plan.filter((e) => e.kind === 'review');
  const rest = plan.filter((e) => e.kind !== 'review');
  return spreadRepeats([...reviews, ...rest]);
}
