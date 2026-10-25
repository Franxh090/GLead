# R5 — Measurement and pilot design

**Date:** 23 Oct 2026 · **Input:** `docs/prd-concise.md` §6, `docs/research-and-implementation-plan.md` §R5 · **Status:** draft for Frank's decision. Everything here is implemented in `src/core/metrics.ts` and `src/core/experiments.ts` unless marked *proposed*.

## 1. The event log

Every answer writes one `TrialEvent` (`src/core/types.ts`), append-only, in the browser's IndexedDB. Nothing else on the dashboard is stored; every number is a query over this table.

| Field | Type | Meaning |
|---|---|---|
| `trialId`, `sessionId` | string | Unique per trial; per session or take |
| `at` | Date | When the answer was graded |
| `drillId`, `itemId`, `skillId` | string | `b1-scale-degree` / `degree:3@major` / `B1.major`; a Changes take uses `c1-changes` / `changes:<rung>@<progression>` / `C1.ladder` |
| `key` | string | `keyLabel`: `G`, `Am`; for B3, the chord root |
| `mode` | `play` \| `tap` \| `confirm` | On the guitar, by tap, or an unsure play the learner confirmed |
| `correct` | boolean | |
| `expected`, `given` | string | Human-readable, e.g. `3 (B)` and `C4 (4)` |
| `responseMs` | number | From listening start to the answer; for a Changes trial, the offset from the change (negative when anticipated) |
| `confidence` | 0–1 | The detector's confidence (tap = 1; a confirmed play = 1) |
| `rating` | FSRS grade | What the scheduler saw |
| `imagineFirst` | boolean | This trial had the silent beat |
| `feedbackVariant` | `full` \| `faded` | What the learner saw after answering |
| `experimentArm` | string | The learner's arms, e.g. `imagine=random;feedback=random;labels=numbers` |
| `retest` | `none` \| `1d` \| `7d` \| `30d` | A retest trial and its delay |
| `unseenKey` | boolean | The key is in the held-out set |
| `purpose` | `practice` \| `placement` \| `retest` | Practice teaches; the others only measure |

Sessions (`SessionRecord`) add start and end times, minutes, trials, correct, the reflection text and `kind`. Retests (`RetestRecord`) hold skill, delay, the anchoring date, due and done dates.

**What is never stored:** audio, pitch frames, or anything from the microphone beyond the graded note.

## 2. The measures (PRD §6)

All per learner, per skill, computed in `src/core/metrics.ts`.

| Measure | Definition | Function |
|---|---|---|
| **Trials-to-criterion** | The practice trial at which the skill's rolling accuracy over the last 20 trials first reaches 90% | `trialsToCriterion(trials, skillId, {window: 20, threshold: 0.9})` |
| **Delayed retention** | Accuracy on the retest trials at 1, 7 and 30 days after criterion, with no practice of that skill in between (not enforced yet, *proposed*: the Today screen hides the skill while a retest is pending) | `delayed(trials)` |
| **Transfer** | Accuracy on trials in held-out keys (`unseenKey`), which only retests and "surprise key" takes produce | `transfer(trials)` |
| **Chord-tone hit rate** | Share of chord changes landed on a wanted tone within one beat of the change (a note up to 150 ms early counts) | `chordToneHitRate(trials)` |
| **Learning rate** | Least-squares slope of the 10-trial rolling accuracy against trial index, per 100 trials | `learningRate(trials)` |
| **Detection reliability** | *Proxy until R2:* share of mic answers the learner had to confirm | `confirmShare(trials)`; R2 supplies the fixed-set numbers |
| **Play-by-ear time** | *Proposed:* from B4's first note heard to the sequence complete; `responseMs` already holds it for B4 trials |
| **Step approach** | Share of play-along landings reached by step (one or two semitones from the note before), over landings that had a note before them (Sprint 9; PRD C1 passing notes) | `stepApproachRate(trials)` |
| **Mic latency** | The Mic lab's median click-to-note offset, adoptable as this device's latency; the runner and the Changes scorer then use it instead of the vendored 150 ms (Sprint 13) | `Settings.micLatencyMs` |
| **Passing notes in key** | Of the notes played between one landing and the next change, the share that sat in the key (Sprint 9) | `passingNotes(trials)` |

Baselines: the placement session (`purpose = placement`) gives per-skill accuracy before any practice (`placementBaseline`).

## 3. The experiments (PRD §6, appendix §9)

Arms are drawn once per learner at first run (`assignArms`) and recorded on every trial. Per-trial conditions are drawn by `trialConditions`.

| Question | Design | Outcome |
|---|---|---|
| Imagine-first on vs off | Randomised **per trial** (coin flip) | Accuracy and `responseMs` by `imagineFirst`; later, retest accuracy by the share of imagine-first trials in practice |
| Full vs faded feedback | Randomised **per trial** | Retest and transfer accuracy by `feedbackVariant` (in-session accuracy is confounded: faded feedback changes nothing before the answer) |
| Numbers vs moveable-do | Drawn **per learner** at first run; the learner may change it in Settings, and each trial records what it showed | Trials-to-criterion for B1 and B2; preference |
| Interleaved vs blocked | *Proposed, not built:* alternate weeks per learner, with the week recorded on the trial | Delayed retention and transfer at 7 and 30 days |

`experimentReport(trials)` shows accuracy by arm for the first three. With one learner these are n-of-1 comparisons and the dashboard says so.

## 4. The pilot

**Who:** 5–10 stuck-intermediate guitarists (1–8 years, know open and barre chords and a pentatonic box). Frank first, for one week, to shake out the mic on his own devices.

**How long:** 4 weeks, plus a baseline week.

**Protocol**

1. **Day 0:** install the PWA; Settings → turn the mic on and run "Test the microphone"; take the placement test (6 minutes).
2. **Baseline week (week 0):** practise as you normally would, without GLead, and log minutes per day on paper. *Rationale:* a self-directed control period for the "fewer hours" claim (G4).
3. **Weeks 1–4:** one 10-minute session a day, at least five days a week, from Today. Keep the skills Today suggests; add Changes takes when the session offers them. Run retests on the day they appear.
4. **Weekly:** export the JSON from Progress and send it (results and settings only; no audio exists to send).
5. **End:** a 20-minute call: what was hard, what you would change, whether you kept going and why.

**What we report:** per participant, the §2 measures per skill with the baseline; trials-to-criterion against minutes practised; delayed and transfer accuracy; chord-tone hit rate over the four weeks; confirm share as the detection proxy. Within-person comparisons for the experiments, with trial counts beside every percentage.

**Stopping rules:** a participant who reports the mic accepting wrong notes or rejecting right ones more than a few times a session stops using mic mode and switches to tap until R2 is done; that is itself a finding.

## 5. Consent note (one page, *proposed*)

> GLead is a free practice tool being tested by its author. If you take part, the app keeps a log on your own device of every exercise you answer: which exercise, in which key, what you answered, whether it was right, how long it took and how sure the microphone was. It never records or sends audio. Once a week you export that log as a file and send it to me; I use it only to see whether the practice design works, and I report results without your name. You can stop at any time and delete everything from Settings. Taking part costs about ten minutes a day for four weeks. Questions: [contact].

## 6. Decisions needed

1. Approve the proxies and proposals marked *proposed* in §2 and §3, or name the ones to build before the pilot.
2. Baseline week: keep it, or start on GLead at once and use the placement as the only baseline?
3. The pilot group: Frank alone first, then friends, or a teacher's students from the start?
