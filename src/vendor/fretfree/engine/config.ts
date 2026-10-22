/**
 * The engine tunables the vendored FretFree modules read. FretFree collects
 * one file per area with `import.meta.glob`; GLead keeps the same values in
 * one object. Values are FretFree's (engine/config/*.ts at f523388).
 */
export const ENGINE_CONFIG = {
  fsrs: {
    requestRetention: 0.9,
    maximumIntervalDays: 365,
    /** Placement-test "already known" items are seeded at this stability. */
    seededStabilityDays: 10,
  },
  grading: {
    /** Correct answers slower than baseline + targetDeltaMs are graded Hard. */
    targetDeltaMs: 2000,
    /** Correct answers at or under baseline + fluentDeltaMs are graded Easy. */
    fluentDeltaMs: 1000,
    /** Used until a latency calibration has run. */
    defaultBaselineMs: 700,
  },
  adaptive: {
    window: 20,
    /** Decisions need at least this many answers in the window. */
    minAnswers: 10,
    widenAbove: 0.92,
    narrowBelow: 0.75,
  },
  playNote: {
    /** Detector latency taken off a mic answer's response time (~45ms window + 80ms hold). */
    micLatencyMs: 150,
    /** Extra time a guitar takes over a tap, allowed before grading speed. */
    playAllowanceMs: 1000,
    takeoverGapMs: 100,
    playbackGapMs: 450,
    playbackTailMs: 2000,
  },
} as const;
