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

Sprint 3 of the plan in `docs/implementation-plan.md` is built. What works today:

- **Three ear-to-hand drills**, each answered on the guitar through the
  microphone or by tapping, with feedback on the neck, a confirm prompt when
  the detector is unsure, misses that come back a few trials later, and FSRS
  scheduling per item:
  - **B1 "Scale degree in key"**: a cadence sets the key, one note sounds, play it back or tap its degree. Major and minor keys.
  - **B2 "Chord function"**: a cadence, then one diatonic chord; tap its Roman numeral or play its root. I IV V vi first, then ii iii vii°, then the minor key.
  - **B3 "Note against chord"**: a chord strums, then one of its notes; play it back or tap root, 3rd, 5th or 7th. Major and minor triads, then 7, maj7 and m7.
- **Changes**: play into the gaps. A loop runs and the first note at each
  change is judged against the ladder rung (roots, 3rds, 5ths and 7ths, any
  chord tone), through the mic or by tapping the neck. Targets show on the
  neck until you turn them off; a hit map follows the take; a "surprise key"
  draws one you have not practised, for transfer.
- **Placement test**: about six minutes over the first four skills, no
  retries, no scheduling; skills at 75% or better start in review rotation.
- **Retests**: when a skill first reaches 90% over 20 practice trials, retests
  are scheduled at 1, 7 and 30 days in keys you have not practised. They
  appear on Today when due and only measure.
- Keys rotate every trial from six practised keys per mode; six more are held
  out. A session mixes whichever skills you pick. **Loops** serves the PRD
  progressions in any key with the sounding chord's tones on the neck.
- Progress leads with the delayed retests, transfer and the chord-tone hit
  rate, then the placement baseline, then today's numbers. Everything exports
  as JSON.
- 649 unit tests and 13 Playwright specs (`pnpm e2e`) pass.

Not yet: the dashboard proper and the experiment harness (D4, §6
randomisation), the session builder's warm-up/concept/play-along shape (D2),
B4 find-it-on-the-neck and B5 spot-the-error, fading targets by accuracy.
The mic confidence threshold is provisional until R2 measures real guitars on
real phones.

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
