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

Sprints 0–10 of the plan in `docs/implementation-plan.md` are built, apart from
the parts only people can do: the four-week pilot, the teacher interviews and
the device measurement (R2), for which the app carries its own Mic lab. What
works today:

- **Seven ear drills**: B1 scale degree, B2 chord function, B3 note against
  chord, B4 melodies by ear and B5 spot the error, each answered on the guitar
  through the microphone or by tapping; B8 intervals by ear with song hints;
  and B9 progressions by ear, three or four chords named by numeral in order
  or by playing their roots. Feedback on the neck, a confirm prompt when the detector is unsure,
  misses that come back, FSRS scheduling per item. After a copied melody, **call
  and response** (C4): answer with a phrase of your own, see which notes stayed
  in key and whether you left the pentatonic box, logged as a take and never
  graded.
- **Sessions with a shape**: the goal up front, reviews first, then new
  material, then a scored play-along over a loop (**Changes**) whose targets
  hide once two takes land 80%; every landing records how it was reached and
  the passing notes before the next change, and the **Phrases** rung counts a
  chord tone only when a step leads into it.
- **Songs**: traditional and public-domain tunes (and one original study)
  learned by ear phrase by phrase in a key the app picks: hear the melody and
  play it back, hear the chords and name them. Learned phrases are read back
  from the log.
- **Keys**: any key's scale and chords on the neck with sound on every tap,
  each chord in three CAGED zones, circle neighbours, a capo helper, six "why
  it works" cards heard before read, and **Find my key**: play a phrase and
  see which keys fit it. **Loops** serves the PRD progressions in any key.
- **English and Spanish** on every screen, chosen from the browser on first run
  and switchable in Settings; **eight tunings** (standard, drop D, half and
  whole step down, drop C, DADGAD, open G, open D) on every neck and in every
  drill.
- **Measuring**: a placement test; retests at 1, 7 and 30 days in unseen keys
  with the skill resting until its retest; experiment arms per learner
  (imagine-first and feedback variant per trial, label scheme per learner,
  interleaved and blocked weeks), all on every trial; a weekly goal that only
  counts; the **Mic lab** (R2 in five minutes, with a suggested confirm
  threshold).
- **Progress** leads with delayed retests, transfer and the chord-tone hit
  rate, then a per-skill report and the experiment arms, and loads another
  learner's export read-only, or several at once as a cohort with the
  experiment arms pooled. `research/R5-measurement.md`,
  `docs/pilot-kit.md` and `docs/teacher-interview-guide.md` carry the pilot.
- 714 unit tests and 39 Playwright specs (`pnpm e2e`) pass.

Not yet: chord detection, real-song clips, sync.

## Install it on an iPhone

The app is published to GitHub Pages from `main` by `.github/workflows/pages.yml`
(the repository's Pages source must be set to **GitHub Actions** once, under
Settings → Pages). It then lives at `https://franxh090.github.io/GLead/`.

1. Open that address in **Safari** on the iPhone (not from inside another app's
   browser).
2. Tap **Share → Add to Home Screen**. GLead opens full-screen from its icon and
   works offline from then on.
3. In the app: **Settings → Answer on the guitar (microphone): On**, then **Run
   the Mic lab** with your guitar. Safari asks for the microphone once; allow it.
   The lab suggests a confirm threshold measured on your phone.
4. Use headphones, or keep the volume low: the phone's speaker playing the
   cadence can be heard by its own microphone.

Other hosts work too: point Netlify or Cloudflare Pages at the repo with the
build command `pnpm build` and the output folder `dist`; at a root domain no
base path is needed.

## Run it locally

Node 22+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm verify     # typecheck, lint, format, unit tests, build
pnpm e2e        # Playwright, against a production build
```

Mic drills need HTTPS or `localhost` (browsers only grant the microphone in a
secure context) and a real guitar. To test on a phone from a laptop, use
`pnpm dev --host` and open the network address; the mic needs HTTPS, so for
the mic on a phone use the published site.

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
