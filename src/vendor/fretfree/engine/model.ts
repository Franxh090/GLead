/**
 * The slice of FretFree's engine model that the vendored modules need
 * (`scheduler.ts`, `fretboard/`). GLead's own item and card types live in
 * `src/core`; these stay as FretFree wrote them so the copied code is unchanged.
 */
import type { Card as FsrsCard } from 'ts-fsrs';

export type GuideLevel = 0 | 1 | 2 | 3;
export type Handedness = 'right' | 'left';

export interface Item {
  /** Stable ID, e.g. `degree:3@G`. */
  readonly id: string;
  readonly skillId: string;
}

export interface CardRecord {
  itemId: string;
  skillId: string;
  fsrs: FsrsCard;
  createdAt: Date;
  lastReviewedAt: Date | null;
}
