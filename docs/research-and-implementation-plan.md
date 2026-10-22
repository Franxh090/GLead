# GLead: Research Delegation and Implementation Planning

**Date:** 23 Oct 2026 · **Owner:** Frank · **Input:** `guitar-app-prd-concise.md` v1.0
**Goal of this document:** split the unknowns in the PRD into research workstreams that can run in parallel (by Claude agents, a developer or Frank), define what each must return, then state how those returns become a coding implementation plan.

---

## 1. Principle

The PRD names a stack (FretFree + FretEcho + OpenEar + tonal + ts-fsrs + Tone.js) and a core loop, but five things are still assumptions. Each gets a workstream with a fixed deliverable. The implementation plan is written **only after R1–R3 return**, because they decide the codebase we start from. R4–R5 can finish later without blocking the first sprint.

| # | Workstream | Blocks | Who can do it |
|---|---|---|---|
| R1 | Codebase audit of FretFree, FretEcho, OpenEar | Sprint 0 | Claude agent (read-only repo study), then Frank or a dev confirms by running them |
| R2 | Mic detection feasibility | Sprint 1 | Dev with a guitar and a phone; Claude agent can prepare the harness |
| R3 | Licence and reuse check | Sprint 0 | Claude agent, Frank reviews |
| R4 | Exercise and curriculum spec (levels 1–3) | Sprint 2 | Claude agent drafts; a guitar teacher reviews |
| R5 | Measurement and pilot design | Sprint 3 (pilot) | Claude agent drafts; Frank decides |

## 2. Workstream briefs

Each brief is written so it can be handed to an agent or a person as-is.

### R1. Codebase audit (FretFree, FretEcho, OpenEar)

**Question:** can we build our drills as plugins on FretFree's engine, with FretEcho's mic loop and OpenEar's exercise logic, or is a fresh repo cheaper?

**Tasks**
1. Clone the three repos. Record: licence file contents, commit count, last commit date, open issues, build and test status, Node version, test coverage.
2. FretFree: document the drill-plugin interface (`app/src/drills/`), the engine API (`src/engine/`: FSRS scheduling, grading, session builder, mastery), the storage schema (`src/storage/`), and the fretboard model (`src/theory/`). Note how a new drill registers, how answers are graded, and how input (tap) reaches a drill.
3. FretEcho: document the mic pipeline (`src/audio/`), the round engines (`src/game/`), and the mute-while-prompting guard. Estimate the work to turn the mic loop into an input adapter that returns `{midi, confidence, onsetTime}` to a drill.
4. OpenEar: document how an exercise is defined (`src/app/exercise/exercises`, factory functions) and how the harmonic prompt (cadence → target) is generated. Note the Angular/Ionic dependency and whether the logic is portable without the UI.
5. Produce a dependency and gap map: which PRD requirement maps to which file or function, and which has no existing code.

**Deliverable:** `research/R1-codebase-audit.md` with: a go / no-go on "build on FretFree"; a table of PRD IDs → reused module or "new"; an effort estimate (S/M/L) per P0 item; a list of upstream questions for FretFree's maintainer.

### R2. Mic detection feasibility

**Question:** is browser-based monophonic detection accurate and fast enough for B1, B3, B4 and C2 on the devices the learner actually has?

**Tasks**
1. Build a 1-page test harness from FretEcho's pipeline (pitchy, Web Audio) that logs detected MIDI note, confidence, and latency from pluck to detection.
2. Record a fixed test set: 60 single notes across the neck, clean and with the other strings ringing, on an acoustic via phone mic and on an electric via interface. Add 20 "wrong" notes.
3. Measure on three devices: a mid-range Android phone, an iPhone or iPad in Safari, and a laptop in Chrome.
4. For C2: play a chord-tone ladder over a loop at 80 and 120 bpm and check whether the detector can attribute a note to the right beat.

**Deliverable:** `research/R2-detection.md` with: accuracy (correct accepted, wrong accepted) and median latency per device; the confidence threshold below which tap-to-confirm should kick in; a decision on whether Safari is supportable in v1; a list of mitigations (palm-mute advice, noise gate, octave-agnostic matching).

### R3. Licence and reuse check

**Question:** what can we copy, link or fork, and under what obligations?

**Tasks**
1. Read the LICENSE file of FretFree, FretEcho, OpenEar, tonal, ts-fsrs, pitchy, Tone.js, Dexie.
2. Note any copyleft, attribution or notice obligations. Flag OpenEar if it is not MIT as the listing suggested.
3. Check the BetterChord CNN data terms (IDMT-SMT-Chords is CC BY-NC-ND) and record that its weights are off-limits for now.
4. Check whether "FretFree" and candidate working titles collide with existing apps or marks (Fretwise is taken).

**Deliverable:** `research/R3-licences.md` with a table: project, licence, can we fork, can we copy code into our repo, notice required. Plus three candidate titles with a quick collision check.

### R4. Exercise and curriculum spec, levels 1–3

**Question:** what exactly does each P0 drill ask, accept and score?

**Tasks**
1. For each P0 drill (B1–B7, C1–C3, A1–A3) write: prompt format, audio prompt (what plays, in what order), accepted answer modes (play / tap / sing), grading rule, hint ladder, difficulty parameters, and what FSRS card it creates.
2. Write the level 1–3 content: keys used, progressions, scale degrees introduced per level, chord tones targeted per level, pass criteria per level.
3. Define the placement test items.
4. Define the "imagine first" and feedback-fading variants so they can be randomised (PRD §6).

**Deliverable:** `research/R4-exercise-spec.md` plus a `content/levels.json` draft. Review with one or two working guitar teachers (30-minute call each) and record their changes.

### R5. Measurement and pilot design

**Question:** how do we compute the PRD §6 metrics from logged events, and how is the pilot run?

**Tasks**
1. Define the event log schema: trial id, drill, item, key, answer mode, correct, latency, confidence, feedback variant, session id, timestamp.
2. Write the formulas for trials-to-criterion, delayed retention, transfer, chord-tone hit rate, play-by-ear time, detection reliability.
3. Design the pilot: 5–10 players, 4 weeks, baseline week, retest schedule, consent text, what is exported (JSON only, no audio).
4. Decide the within-person experiment assignments (interleaved vs blocked, imagine-first on/off, fading feedback).

**Deliverable:** `research/R5-measurement.md` with the schema, metric definitions, a pilot protocol and a one-page consent note.

## 3. How to run the research

**With Claude agents (recommended for R1, R3, R4, R5):**
- Give each agent the brief above plus the PRD, and ask for the deliverable file. R1 and R3 should run first and in parallel; R4 and R5 can run at the same time but their outputs are not needed until later.
- Agents can read public repos and docs. They cannot plug in a guitar, so R2 stays with a human; an agent can write the harness and the test protocol.

**Human checks that must not be skipped:**
- Run the three apps locally (R1 confirmation).
- Record the test set and measure latency on real devices (R2).
- Read the actual LICENSE files (R3), not the listing badges.
- Teacher review of the curriculum (R4).

**Timeline:** R1 and R3 within one week. R2 within two weeks (needs the devices). R4 and R5 within three weeks.

## 4. From research to an implementation plan

When R1, R2 and R3 are in, write `implementation-plan.md` with the sections below. The content depends on their findings; the structure does not.

1. **Starting point.** Fork FretFree at a named commit, or new repo. State the reason from R1.
2. **Architecture.** Module map: theory (tonal), engine (ts-fsrs, session builder), input adapters (tap, mic, later MIDI), audio engine (Tone.js prompts and loops), drills (plugins), storage (Dexie), metrics (event log + export), UI. Each with its origin: reused, adapted, or new.
3. **Interfaces to define first.** `InputAdapter`, `Drill`, `Scorer`, `BackingLoop`, `TrialEvent`. These let drills be written in parallel.
4. **Sprint plan** (2-week sprints):
   - Sprint 0: fork, build green, licences recorded, `InputAdapter` with tap only, event log.
   - Sprint 1: mic adapter from FretEcho with confidence and tap-to-confirm (R2 thresholds); B1 drill end to end.
   - Sprint 2: B3, B4, B7 scheduling with interleaved keys; backing loop C3 for three progressions.
   - Sprint 3: C1 and C2 chord-tone ladder with scoring; placement test D1; retest scheduling D3.
   - Sprint 4: dashboard D4, rationale and reflection D5, session builder D2; pilot build.
   - Sprint 5–6: pilot runs (R5 protocol); fixes; A1–A3 content polish; B5, B6.
5. **Definition of done per sprint:** tests green, drill playable on iPad and Android, event log validated against R5 schema.
6. **Backlog for P1** and the open questions carried over from the PRD.

## 5. Decisions needed from Frank before starting

1. Who does R2 (needs a guitar, a phone and about half a day)?
2. Run R1, R3, R4, R5 as Claude agents now, or hand them to a developer?
3. Name: GLead is set. R3 still checks it for collisions before any repo or domain is created.
4. Pilot group: Frank alone first, or recruit 5–10 players for week 6?
