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

Sprints 0–7 of the plan in `docs/implementation-plan.md` are built, apart from
the parts only people can do: the four-week pilot, the teacher interviews and
the device measurement (R2), for which the app carries its own Mic lab. What
works today:

- **Six ear drills**: B1 scale degree, B2 chord function, B3 note against
  chord, B4 melodies by ear and B5 spot the error, each answered on the guitar
  through the microphone or by tapping; and B8 intervals by ear with song
  hints. Feedback on the neck, a confirm prompt when the detector is unsure,
  misses that come back, FSRS scheduling per item.
- **Sessions with a shape**: the goal up front, reviews first, then new
  material, then a scored play-along over a loop (**Changes**) whose targets
  hide once two takes land 80%.
- **Keys**: any key's scale and chords on the neck with sound on every tap,
  each chord in three CAGED zones, circle neighbours, a capo helper, six "why
  it works" cards heard before read, and **Find my key**: play a phrase and
  see which keys fit it. **Loops** serves the PRD progressions in any key.
- **English and Spanish**, chosen from the browser on first run and switchable
  in Settings; **standard and drop D tuning** on every neck and in every drill.
- **Measuring**: a placement test; retests at 1, 7 and 30 days in unseen keys
  with the skill resting until its retest; experiment arms per learner
  (imagine-first and feedback variant per trial, label scheme per learner,
  interleaved and blocked weeks), all on every trial; a weekly goal that only
  counts; the **Mic lab** (R2 in five minutes, with a suggested confirm
  threshold).
- **Progress** leads with delayed retests, transfer and the chord-tone hit
  rate, then a per-skill report and the experiment arms, and loads another
  learner's export read-only. `research/R5-measurement.md`,
  `docs/pilot-kit.md` and `docs/teacher-interview-guide.md` carry the pilot.
- 686 unit tests and 27 Playwright specs (`pnpm e2e`) pass.

Not yet: more tunings than FretFree's two, call and response (C4), chord
detection, real-song clips, sync. The Mic lab's text, the why-it-works cards
and the Progress tables are still English only.

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
