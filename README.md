# GLead

**Hear the key. Find it on the guitar. Fill the space.**

GLead is a free, local-first ear-to-hand trainer for the stuck intermediate
guitarist: the player who knows chord shapes and a pentatonic box but cannot
hear where a progression is going, and improvises by guessing.

The core loop: **hear it → (imagine it) → play it on your guitar → see how you
did → it comes back later in a new key.**

Four linked skills:

1. **Know the key**: scale, diatonic chords, Roman numerals, where they sit on the neck.
2. **Hear the key**: scale degrees, chord function and chord tones by ear.
3. **Find it**: from sound to the right place on the guitar, through the microphone.
4. **Fill the space**: lines over a progression that land on chord tones at the changes.

Not for sale. Success is measured by learning speed, delayed retention and
transfer to unseen keys, computed from the learner's own trial log.

## Status

Sprint 5 of the plan in `docs/implementation-plan.md` is built: the pilot
build with its kit. What works today:

- **Five ear-to-hand drills** (B1 scale degree, B2 chord function, B3 note
  against chord, B4 melodies by ear, B5 spot the error), each answered on the
  guitar through the microphone or by tapping, with feedback on the neck, a
  confirm prompt when the detector is unsure, misses that come back, and FSRS
  scheduling per item.
- **Sessions with a shape**: the goal up front, reviews first, then new
  material, then a scored play-along over a loop (**Changes**), whose targets
  hide by themselves once two takes land 80%.
- **Keys**: any key's scale by degree and its chords by numeral and job on the
  neck, sound on every tap, and each chord in three places up the neck through
  its CAGED shapes (A1, A2). **Loops** serves the PRD progressions in any key.
- **Measuring**: a placement test; retests at 1, 7 and 30 days in unseen
  keys, with the skill resting until its retest is done; experiment arms dealt
  once per learner (imagine-first and feedback variant per trial, label
  scheme per learner, interleaved and blocked practice alternating by week),
  all recorded on every trial.
- **Progress** leads with delayed retests, transfer and the chord-tone hit
  rate, then a per-skill report and the experiment arms, and can load another
  learner's export file read-only, for the pilot.
- `research/R5-measurement.md` (measures and protocol), `docs/pilot-kit.md`
  (participant and author checklists) and `docs/teacher-interview-guide.md`.
- 672 unit tests and 20 Playwright specs (`pnpm e2e`) pass.

Still provisional until R2 measures real guitars on real phones: the mic
confidence threshold, the scoring window and the anticipation allowance.
Not yet: Spanish and alternate tunings (P1), "why it works" cards (A4).

## Run it locally

Node 22+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # typecheck, lint, format, unit tests, build
pnpm e2e        # Playwright, against a production build
```

Mic drills need HTTPS or `localhost` (browsers only grant the microphone in a
secure context) and a real guitar.

## Built on

GLead reuses FretFree's theory, microphone, audio and fretboard modules (MIT),
and follows OpenEar's exercise designs and FretEcho's mic etiquette. See
`THIRD_PARTY_NOTICES.md` and `research/`.

## Documents

- `docs/prd-concise.md`: the build plan (PRD v1.1)
- `docs/prd-research-appendix.md`: the learning research and evidence ratings (v0.2)
- `docs/research-and-implementation-plan.md`: research workstreams R1–R5
- `research/`: R1 codebase audit, R3 licences
- `docs/implementation-plan.md`: architecture, interfaces, sprints

## Licence

[MIT](LICENSE).
