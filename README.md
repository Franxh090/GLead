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

Sprint 4 of the plan in `docs/implementation-plan.md` is built: the first
full build for a pilot. What works today:

- **Five ear-to-hand drills**, each answered on the guitar through the
  microphone or by tapping, with feedback on the neck, a confirm prompt when
  the detector is unsure, misses that come back a few trials later, and FSRS
  scheduling per item:
  - **B1 "Scale degree in key"**: a cadence sets the key, one note sounds, play it back or tap its degree.
  - **B2 "Chord function"**: a cadence, then one diatonic chord; tap its Roman numeral or play its root.
  - **B3 "Note against chord"**: a chord strums, then one of its notes; play it back or tap root, 3rd, 5th or 7th.
  - **B4 "Find it on the neck"**: a cadence, then a three- or four-note melody; play it back in order.
  - **B5 "Spot the error"**: four chords with one outside the key, or five scale notes with one a half step off; which?
- **Sessions with a shape**: the goal is stated up front; reviews warm the
  ear up, then new material, and a session of ten minutes or more hands over
  to **Changes** for a play-along scored at every chord change. Keys rotate
  every trial; six keys per mode are held out for transfer.
- **Placement test** and **retests** at 1, 7 and 30 days in unseen keys, both
  measuring only.
- **Built-in experiments**: each learner is dealt arms at first run;
  imagine-first and full-or-faded feedback are drawn per trial and recorded on
  every trial, so Progress can compare like with like.
- **Progress** leads with delayed retests, transfer and the chord-tone hit
  rate, then a per-skill report (baseline, trials, recent accuracy, trials to
  criterion, learning rate, retests, transfer) and the experiment arms.
  Everything exports as JSON. `research/R5-measurement.md` defines the
  measures and the pilot protocol.
- 665 unit tests and 17 Playwright specs (`pnpm e2e`) pass.

Not yet: the mic confidence threshold and the scoring window are provisional
until R2 measures real guitars on real phones; targets on the neck fade by a
switch, not by accuracy; interleaved-vs-blocked weeks are designed in R5 but
not built; Spanish and alternate tunings (P1).

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
