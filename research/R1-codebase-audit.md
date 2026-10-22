# R1 — Codebase audit: FretFree, FretEcho, OpenEar

**Date:** 22 Oct 2026 · **Input:** `docs/research-and-implementation-plan.md` §R1 · **Clones:** pookey/fretfree `f523388` (2026-10-21), dmb1107/fretecho `e86aa94` (2026-04-12), ShacharHarshuv/open-ear `e17c6f7` (2026-09-24). Read-only study; FretFree's vendored modules were then compiled and tested inside GLead (558 tests pass). The FretEcho and OpenEar detail reports are `R1b-fretecho-audit.md` and `R1c-openear-audit.md`.

## 1. Verdict: build *with* FretFree's modules, not *on* FretFree's app

**Go** on reusing FretFree. **No-go** on forking the whole app or contributing GLead's drills upstream as the first move. Reasons:

1. **The PRD's premise is out of date.** The PRD (§2) says FretFree has "only the first drill built so far". At `f523388` it has 40 drills, a placement test, gamification, email sign-in and multi-device sync (AWS Cognito, Lambda, DynamoDB), an AWS CDK stack, 303 Playwright tests across a four-device matrix, and about 70k lines of TypeScript. It ships about 16 work packages a day from a multi-agent pipeline (`docs/progress.md`). A fork would diverge within days, and the product would be "FretFree plus extras", not GLead's loop.
2. **The parts GLead needs are clean and small.** Theory (4.2k lines, depends only on tonal), the mic pipeline (1.1k, pitchy in an AudioWorklet, with a fake source for tests), the audio engine (0.9k, Karplus–Strong guitar, strums, progressions on the Tone Transport), the fretboard SVG (0.5k) and the FSRS grading/scheduler/adaptive band each import nothing from the rest of the app beyond two type aliases. Copied into GLead with attribution, they compile, lint and pass their own tests unchanged.
3. **GLead's P0 drills are all new anyway.** FretFree's ear drills (D14, D15) tap answers and have no key context; its mic drills (D16, D17) ask for a named note, not a heard one. Nothing in FretFree plays over a loop and scores chord tones, schedules fixed delayed retests in unseen keys, or logs trials for the §6 metrics. The session runner, dashboard and experiment harness therefore have to be GLead's own.
4. **Upstream later, not first.** FretFree's maintainer may well want ear-to-hand drills; once GLead's drills exist as self-contained plugins on a near-identical interface, offering them upstream costs little. Opening that conversation now would block Sprint 0 on a reply.

## 2. Repo facts

| | FretFree | FretEcho | OpenEar |
|---|---|---|---|
| Licence | MIT, `LICENSE` present | MIT, `LICENSE` present | MIT text in README only; no `LICENSE` file (see R3) |
| Last commit | 2026-10-21 | 2026-04-12 | 2026-09-24 |
| Size | ~70k LOC TS (app), 40 drills, 303 e2e tests | ~2k LOC, 23 commits | Angular 17 / Ionic 7 / Capacitor 7; 51 Karma specs |
| Stack | Vite 8, React 19, TS 6, tonal 6.5, ts-fsrs 5.4, Tone 15, pitchy 4.1, Dexie 4.4, Zustand, vexflow | Vite 5, React 18, TS 5.6, pitchy 4.1, Zustand 4; no Tone, no tests | Tone 14.7, hand-written theory (no tonal), ts-fsrs only in the real-songs exercise |
| Node | ≥22, pnpm 12 | ≥18 | per Angular 17 |
| Quality gate | typecheck, lint, prettier, Vitest (90% line coverage on pure modules), Playwright, bundle budget | none | Karma smoke test per exercise |

## 3. FretFree in detail

**Drill plugin interface** (`app/src/drills/types.ts`, design §6): `DrillType<P, A>` with eager `meta` (id, skills, inputModes, `requiresMic`, scope, `canTest`, `conceptOf`) and lazy `logic` (`makePrompt`, `check`, `describeAnswer`, `sounds`, `feedbackPositions`, `gradedResponseMs`, `rating`) plus a React `render`. Drills register by adding a folder. Input reaches a drill through its view: a mic drill subscribes to the shared `PitchSource` (`mic/source.ts`) and calls `onAnswer` when a stable note arrives (`d16-play-note/D16View.tsx`, `useMicAnswer`). GLead's `Drill` interface keeps this shape so drills could move either way.

**Engine** (`engine/`): `grading.ts` turns correctness and response time into an FSRS rating with speed targets; `scheduler.ts` wraps ts-fsrs (FSRS-6, refit weights, seeded known cards); `adaptive.ts` holds the 80–90% band (widen above 0.92, narrow below 0.75, window 20); `session.ts` builds interleaved sessions from due reviews, new blocks, retries and lanes; `confusions.ts` decays a confusion matrix; `mastery.ts` fades guides. Every tunable lives in `engine/config/*.ts`. Items are string IDs parsed by one file per item family.

**Storage** (`storage/db.ts`): Dexie, five schema versions, tables `cards`, `reviewLogs`, `skillStates`, `confusions`, `sessionLogs`, gamification and sync bookkeeping. `reviewLogs` holds itemId, skillId, drillType, correct, responseMs, rating, hintUsed, answerGiven, at. That is close to GLead's `TrialEvent` but lacks key, answer mode, confidence, feedback variant and experiment arm.

**Mic** (`mic/`): `detector.ts` opens getUserMedia with echo cancellation, noise suppression and AGC off, inside the gesture (iOS), and runs pitchy's McLeod detector in an AudioWorklet (`worklet/analyzer.ts`: 2048-sample window, 20 ms hop, RMS gate 0.002, clarity threshold 0.9). `tracker.ts` turns frames into stable notes (80 ms hold, 65 cents hysteresis, 100 ms dropout) with median frequency and cents. `source.ts` adds state, listeners and a `createFakePitchSource` for tests and Playwright. Expected latency about 125–150 ms after the pluck (`engine/config/playNote.ts`). `pitchMatches` offers exact, octave-tolerant and pitch-class matching. Lost-input, denied and unsupported states are handled.

**Audio** (`audio/`): `voice.ts` renders Karplus–Strong plucks into buffers (no worklet in the output path, which iOS Safari needed); `strum.ts` and `progression.ts` are pure timing; `audio.ts` exposes `playNotes`, `strum`, `playProgression` (looping, `onChord` cues, tempo, strum patterns) and `unlockAudio` for the first tap. `transport.ts` leases the Tone Transport to one owner.

**Theory** (`theory/`): fretboard model (strings 1–6 high to low, `midiAt`, `positionsOfPitchClass`), intervals, harmony (`diatonicChords`, `romanNumeral`, `PROGRESSIONS` catalogue with the five progressions the PRD names plus three more, capo, circle of fifths), scales, chords and voicings, pentatonic boxes, arpeggios, chord function and borrowed chords, staff and tab helpers. Built on tonal and exhaustively tested.

**Fretboard** (`components/fretboard/`): SVG neck with guide levels, marker styles by shape and colour (root square, 3rd circle, 5th triangle, 7th hexagon, wrong diamond), left-handed mirroring, tap targets with accessible names, and a contrast test against the tokens.

**What FretFree does not have** (and GLead builds): key-context ear drills answered on the guitar; note-against-chord by ear; find-the-progression by ear; spot-the-error; imagine-first; play-along with chord-tone scoring; a backing-loop generator that serves unseen keys for transfer tests; fixed 1/7/30-day retests in unseen keys; a dashboard led by delayed and transfer results; per-trial logging with experiment arms; drill rationale and reflection.

## 4. FretEcho in detail (summary of R1b)

Pitch via pitchy on an `AnalyserNode` (fftSize 8192, about 186 ms window) polled from `requestAnimationFrame`, bass-tuned (25–600 Hz), three stable frames, no worklet, no tests, no iOS handling (hard-coded 44.1 kHz context, no resume in a gesture). Latency about 150–240 ms, unmeasured. **Its mic loop is strictly weaker than FretFree's**, so GLead does not copy it. Two ideas carry over: the **mute-while-prompting protocol** (pause detection, speak or play the prompt, wait 300 ms, resume and arm for the next note; feedback tones wrapped the same way) and the **weak-spot weighting** (per-position stats, weight `0.25 + (1 − score) × 3`, previous target zeroed). Both are a few dozen lines to write fresh in GLead's session runner and scheduler.

## 5. OpenEar in detail (summary of R1c)

Exercises are object literals built from factory functions (`useTonalExercise`, `useMelodicExercise`, `useChordProgression`, …): `Exercise { id, name, settingsConfig, logic(settings) → { answerList, getQuestion() } }`, with `Question.segments[{ rightAnswer, partToPlay }]`, an optional `cadence`, a key and a drone. Everything is authored in C and transposed. The four exercises GLead cares about:

- **Notes in key** (`NotesInKeyExercise/notesInKeyExercise.ts`): answer is a solfège degree; range presets, melodic and harmonic constraints, 1–3 voices, 1–8 notes; cadence types `I IV V I`, `i iv V i`, `vi ii III vi`.
- **Chords in key** (`ChordInKeyExercise/chordsInKeyExercise.ts`): Roman-numeral answers, progression grammar (no repeats, dominant resolution), voice leading, a 540-line resolution table.
- **Notes with chords** (`NotesWithChords/notesWithChordsExercise.ts`): answer is degree plus chord root, triads or sevenths, soprano or bass voice.
- **Common progressions** (`CommonChordProgressionExercise/commonProgressions.ts`): 44 named progressions across modes.

The **cadence voicings** (`utility/music/chords/chordProgressions.ts`): IV–V–I in C as F (3rd on top), G7 (3rd on top), C (octave on top), each with bass in octaves 2 and 3, velocity 0.3, played at 120 bpm with a 100 ms gap before the question. Minor: Fm, G7, Cm.

Porting all of it is about 60 files and 1–2 days (M). The logic has almost no RxJS and only a few Angular touches, but it carries its own theory library. **GLead's choice:** adopt the exercise designs and cadence recipe, implement them on FretFree's theory and tonal (S per exercise), and port OpenEar's progression grammar and resolution table later if B2 needs them.

## 6. PRD requirement → source

| PRD ID | Requirement | Source | Effort |
|---|---|---|---|
| A1 | Key map on an interactive neck with sound | FretFree theory (`diatonicChords`, `positionsOfPitchClass`), Fretboard, `playNotes`; screen is new | M |
| A2 | Diatonic chords in three neck zones, CAGED | FretFree `voicings.ts`, `cagedShape`; screen is new | M |
| A3 | Common progressions with a backing loop in any key | FretFree `PROGRESSIONS`, `progressionChords`, `playProgression(loop)`; GLead `BackingLoop` wrapper | S |
| A4 | Circle of fifths, capo, "why it works" | FretFree `CIRCLE_OF_FIFTHS`, `capoFret`; cards are new | S (P1) |
| B1 | Scale degree in key, answered on the guitar | New drill on FretFree mic + audio; OpenEar cadence recipe | M |
| B2 | Chord function by Roman numeral | New drill; FretFree `romanNumeral`, `playProgression`; OpenEar design | M |
| B3 | Note against chord, played back | New drill; FretFree `chordTones`, `strum`, mic; OpenEar design | M |
| B4 | Find a progression or melody on the neck by ear | New drill; FretFree mic, `playProgression`, `positionsOfMidi` | L |
| B5 | Spot the error | New drill; FretFree audio | M |
| B6 | Imagine first (silent beat, optional hum) | New session option; FretEcho mute protocol | S |
| B7 | Scheduler: interleave, spaced return, 80–90% band | FretFree `scheduler.ts`, `adaptive.ts`, `grading.ts` (vendored); GLead interleaving across skills and keys | M |
| B8 | Intervals with song hints; key-finding from a snippet | FretFree D14 logic as reference | M (P1) |
| C1 | Chord-tone ladder over a loop | New; FretFree `chordTones`, Fretboard markers, `playProgression` | L |
| C2 | Live scoring from the mic per chord change | New `Scorer` on FretFree mic (`onNote` with `startedAt`) and Transport `onChord` cues | L |
| C3 | Backing-track generator: key, progression, tempo, feel | FretFree `playProgression` + `STRUM_PATTERNS`; GLead adds key/tempo/feel options | S |
| C4 | Call and response; pentatonic bridge | New; FretFree `pentatonicBox` | M (P1) |
| D1 | Placement test | New; FretFree `placement/` as reference | M |
| D2 | 10-minute session builder | New on vendored scheduler; FretFree `session.ts` as reference | M |
| D3 | Retests at 1, 7, 30 days in unseen keys | New (scheduling table + key rotation) | M |
| D4 | Dashboard led by delayed and transfer results | New, computed from the event log | M |
| D5 | Rationale and reflection | New (copy + one screen) | S |
| D6 | Local-first, JSON export, left-handed, standard tuning | Dexie (as FretFree), Fretboard `handedness`, `STANDARD_TUNING` | S |
| D7 | English and Spanish; alternate tunings | New i18n; FretFree `TUNINGS` | M (P1) |
| — | Mic input adapter with confidence and tap-to-confirm | FretFree `PitchSource` + GLead wrapper | S |
| — | Trial event log and §6 metrics | New | M |

## 7. Open questions for FretFree's maintainer (to raise once GLead's drills exist)

1. Would ear-to-hand drills with key context (B1, B3) be welcome as plugins? GLead's `Drill` interface is deliberately close to `DrillType`.
2. Is the `reviewLogs` schema open to extra fields (key, answer mode, confidence, experiment arm)?
3. Would a `PitchSource` confidence threshold with tap-to-confirm fit D16/D17?
4. Any measured mic latency on iPad and Android to compare with GLead's R2 numbers?
