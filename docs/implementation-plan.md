# GLead implementation plan

**Date:** 22 Oct 2026 · **Inputs:** `prd-concise.md` v1.1, `research/R1-codebase-audit.md`, `research/R3-licences.md`. R2 (mic feasibility on real devices) and R4/R5 are still open and are scheduled below; nothing in Sprints 0–1 waits on them.

## 1. Starting point

**A new repository, `franxh090/GLead`, with FretFree's pure modules vendored in.** Not a fork. R1 §1 gives the reasons: FretFree is now a 70k-line app moving at 16 work packages a day, GLead's P0 drills are all new, and the modules GLead needs (theory, mic, audio, fretboard, FSRS grading/scheduler/adaptive) import nothing else and pass their tests inside GLead unchanged. The copy is pinned to commit `f523388` and documented in `src/vendor/fretfree/UPSTREAM.md`; MIT notices are in `THIRD_PARTY_NOTICES.md` (R3). OpenEar's exercise designs and cadence recipe, and FretEcho's mute-while-prompting protocol and weak-spot weighting, are re-implemented rather than copied.

## 2. Architecture

```
src/
  vendor/fretfree/     reused (MIT): theory, mic, audio, fretboard, engine core
  core/                GLead's engine (pure TS, no React)
    types.ts           InputAdapter, Drill, Scorer, BackingLoop, TrialEvent, Item, Card
    input/             tap adapter; mic adapter over PitchSource with confidence + confirm
    events/            Dexie trial log, JSON export, metric queries
    scheduling/        cards (FSRS via vendored scheduler), interleaving across skills
                       and keys, retest schedule (1/7/30 days, unseen keys), key rotation
    session/           runner: plan → prompt → listen → grade → log → feedback
  audio/               cadence, backing loop (key, progression, tempo, feel) on vendored audio
  drills/              one folder per drill; logic.ts pure + tested, view .tsx
  screens/             Today, Session, Progress, Settings
```

| Module | Origin |
|---|---|
| theory | reused (FretFree, tonal) |
| mic pipeline | reused (FretFree); adapter is new |
| audio engine | reused (FretFree, Tone.js); cadence and loop generator are new |
| fretboard SVG | reused (FretFree) |
| FSRS grading, scheduler, adaptive band | reused (FretFree, ts-fsrs) |
| interleaving, retests, key rotation | new (FretFree `session.ts` as reference) |
| drills B1–B7, C1–C3 | new (OpenEar designs, FretFree D14–D17 as reference) |
| event log, metrics, experiments | new |
| storage | new Dexie schema (FretFree's as reference) |
| screens | new |

## 3. Interfaces to define first (Sprint 0)

- **`InputAdapter`**: `start()`, `stop()`, `onAnswer(listener)`, `state`. Emits `InputEvent { kind: 'play' | 'tap'; midi?: number; degree?: number; position?: Position; confidence: number; at: number }`. The tap adapter has confidence 1. The mic adapter wraps `PitchSource`: a stable note becomes a `play` event with confidence from clarity and cents; below `confirmBelow` the session asks the learner to confirm by tap.
- **`Drill<P, A>`**: `id`, `title`, `skills`, `inputModes`, `requiresMic`, `makePrompt(item, ctx)`, `prompt(p): AudioScript` (what to play, in order), `check(p, a): Check`, `describeAnswer(a)`, `feedbackPositions(p, fb)`, `rationale` (one line, D5), `render`. Same shape as FretFree's `DrillType` so drills can move either way.
- **`Scorer`**: for play-along (C2): `start(loop)`, `onNote(note)`, `result(): BarHits[]` (per chord change: on a chord tone within the window, which tone, or miss).
- **`BackingLoop`**: `{ key, progression, bpm, feel, bars }` → `start({ onChord })`, `stop()`; built on `playProgression(loop: true)`.
- **`TrialEvent`**: `trialId, sessionId, at, drillId, itemId, skillId, key, mode (play|tap|confirm), correct, expected, given, responseMs, confidence, imagineFirst, feedbackVariant, experimentArm, retest (none|1d|7d|30d), unseenKey`. Append-only; everything on the dashboard is a query over it (R5 will refine the formulas).

## 4. Sprint plan (two-week sprints)

- **Sprint 0: foundations.** ✔ Done 2026-10-22: repo, vendored modules, build green, licences recorded; `core/types.ts`; Dexie trial log with export; tap adapter; cadence, script player and backing-loop generator; the session runner; Today, Session, Progress and Settings screens.
- **Sprint 1: B1 end to end.** ✔ Built 2026-10-22, pending the human check: mic adapter with confidence and tap-to-confirm (threshold 0.6, provisional until R2); B1 "scale degree in key": cadence → target → play or tap → feedback on the neck → FSRS card per degree and mode; keys rotate every trial; imagine-first option (B6); five Playwright specs through the fake mic. **Still to do by a person:** a 10-minute B1 session on a laptop with a real guitar, then on a phone, and the R2 harness (`Settings → Test the microphone` shows the confidence per note).
- **Sprint 2: hearing the key.** ✔ Built 2026-10-23: B3 note against chord (triads, then sevenths); B2 chord function (I IV V vi, then ii iii vii°, then minor), answered by numeral or by playing the root; B7 interleaving across skills (new items dealt by turns, runs of one skill broken up); C3 backing loops for the five PRD progressions in any key, with the sounding chord's tones on the neck (the Loops screen). **Not done:** R2 thresholds, which need a person with a guitar and a phone; the confirm threshold stays at 0.6.
- **Sprint 3: using it.** ✔ Built 2026-10-23: C1 chord-tone ladder (roots → 3rds → 5ths and 7ths → any) with targets on the neck and a switch to hide them; C2 scoring of the first note in a one-beat window after each change, through the mic or by neck tap, with a hit map and every change logged as a trial; D1 placement test (22 trials over B1 major, B2 primary, B3 triads, B1 minor; no retries or card updates; skills at 75% seeded as known); D3 retests scheduled at 1, 7 and 30 days when a skill first reaches 90% over 20 practice trials, run in unseen keys from Today. **Still provisional:** the one-beat scoring window and 150 ms anticipation allowance, until R2 measures mic latency on real devices; targets fade by a switch, not yet by accuracy.
- **Sprint 4: keeping it.** ✔ Built 2026-10-23: D4 dashboard (per-skill report with baseline, trials, recent accuracy, trials to criterion, learning rate, retests and transfer; experiment arms compared); the §6 experiment harness (arms dealt once per learner, imagine-first and feedback variant drawn per trial and logged); D2 session shape (goal stated up front, reviews first, then new items, then a play-along handed to Changes with the rung chosen from the session's skills); D5 (rationale on every drill, reflection prompt, last reflection shown on Today); B4 melodies by ear (sequence answers through the runner); B5 spot the error (wrong chord or wrong note); `research/R5-measurement.md` (schema, formulas, pilot protocol, consent note). **Decisions waiting on Frank:** R5 §6.
- **Sprints 5–6: pilot.** 5–10 players, 4 weeks; fixes; A1–A3 screens; teacher interviews on the curriculum.

Definition of done per sprint: `pnpm verify` green; the sprint's drill playable in Chrome and Safari on a laptop and on one phone or tablet; trial events validated against the R5 schema once it exists.

## 5. P1 backlog and carried-over questions

A4, B8, C4, D7 (Spanish, alternate tunings), chord detection, real-song clips, sync. Open from the PRD: moveable-do vs numbers as default (Sprint 1 randomises per learner so the pilot answers it); first pilot group; the FretFree upstream conversation (R1 §7).
