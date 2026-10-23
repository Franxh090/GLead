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

Sprint 2 of the plan in `docs/implementation-plan.md` is built. What works today:

- **Three ear-to-hand drills**, each answered on the guitar through the
  microphone or by tapping, with feedback on the neck, a confirm prompt when
  the detector is unsure, misses that come back a few trials later, and FSRS
  scheduling per item:
  - **B1 "Scale degree in key"**: a cadence sets the key, one note sounds, play it back or tap its degree. Major and minor keys.
  - **B2 "Chord function"**: a cadence, then one diatonic chord; tap its Roman numeral or play its root. I IV V vi first, then ii iii vii°, then the minor key.
  - **B3 "Note against chord"**: a chord strums, then one of its notes; play it back or tap root, 3rd, 5th or 7th. Major and minor triads, then 7, maj7 and m7.
- Keys rotate every trial from six practised keys per mode; six more are held
  out for the transfer tests. A session mixes whichever skills you pick, and
  deals new items of several skills in turns.
- **Loops**: the five PRD progressions (plus two more) in any key, at four
  tempos and four strum feels, with the sounding chord's tones on the neck.
- Sessions of 5, 10 or 20 minutes; an end-of-session reflection; a Progress
  screen that leads with delayed and transfer results (empty until retests
  arrive in Sprint 3) and exports everything as JSON.
- 640 unit tests and 10 Playwright specs (`pnpm e2e`) pass.

Not yet: scoring what you play over a loop (C1, C2), placement, retests,
B4–B6 beyond the imagine-first option, the dashboard proper. The mic
confidence threshold is provisional until R2 measures real guitars on real
phones.

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
