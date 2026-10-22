/**
 * How sure the detector is of a played note. The tracker already requires a
 * clarity of 0.9 and an 80 ms hold, so what is left to doubt is the tuning:
 * a note 40 cents off is as likely the neighbour played flat as the target
 * played sharp. Confidence falls linearly from 1 at 0 cents to 0 at
 * `zeroAtCents`. Provisional until R2 measures real guitars (R2 deliverable).
 */
export const CONFIDENCE = {
  zeroAtCents: 60,
} as const;

export function confidenceFromCents(
  cents: number,
  zeroAt: number = CONFIDENCE.zeroAtCents,
): number {
  const c = Math.abs(cents);
  return Math.max(0, Math.min(1, 1 - c / zeroAt));
}
