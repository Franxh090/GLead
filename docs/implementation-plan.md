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

- **Sprint 0: foundations.** ✔ Repo, vendored modules, build green, licences recorded. Then: `core/types.ts`; Dexie trial log with export; tap adapter; cadence and backing-loop audio; the session runner skeleton; a Today screen that starts a session.
- **Sprint 1: B1 end to end.** Mic adapter with confidence and tap-to-confirm (threshold provisional until R2); B1 "scale degree in key": cadence → target → play or tap → feedback on the neck → FSRS card per degree × key group; interleaving across keys; imagine-first option (B6). Definition of done: a 10-minute B1 session on a laptop with a real guitar, trials in the log, export works.
- **Sprint 2: hearing the key.** B3 note against chord; B2 chord function; B7 interleaving across skills; C3 backing loops for the five PRD progressions in any key; R2 thresholds applied.
- **Sprint 3: using it.** C1 chord-tone ladder with targets on the neck; C2 scoring per chord change; D1 placement test; D3 retest scheduling in unseen keys.
- **Sprint 4: keeping it.** D4 dashboard (delayed and transfer first); D5 rationale and reflection; D2 session builder (5/10/20); B4, B5; pilot build and R5 protocol.
- **Sprints 5–6: pilot.** 5–10 players, 4 weeks; fixes; A1–A3 screens; teacher interviews on the curriculum.

Definition of done per sprint: `pnpm verify` green; the sprint's drill playable in Chrome and Safari on a laptop and on one phone or tablet; trial events validated against the R5 schema once it exists.

## 5. P1 backlog and carried-over questions

A4, B8, C4, D7 (Spanish, alternate tunings), chord detection, real-song clips, sync. Open from the PRD: moveable-do vs numbers as default (Sprint 1 randomises per learner so the pilot answers it); first pilot group; the FretFree upstream conversation (R1 §7).
