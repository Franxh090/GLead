# PRD (concise): GLead

**Status:** Draft v1.1 · **Date:** 23 Oct 2026 · **Owner:** Frank
**Project name:** GLead (replaces the earlier working title "Fretwise", which is taken by an existing open-source desktop app). A collision check on "GLead" is still to be done (R3).
**Companion document:** `guitar-app-prd.md` (v0.2) holds the full research and evidence ratings. This file is the build plan.

---

## 1. Purpose

Get a guitarist from "knows shapes" to "hears the key and can fill the space" in fewer practice hours. Four linked skills:

1. **Know the key** — scale, diatonic chords, Roman numerals, where they sit on the neck.
2. **Hear the key** — scale degrees, chord function, and "which chord tone is this?" by ear.
3. **Find it** — go from sound to the right place on the guitar.
4. **Fill the space** — play lines over a progression that land on chord tones at the changes.

The core loop: **hear it → (imagine it) → play it on the guitar → see how you did → it comes back later in a new key.**

Not for sale. Success is measured by learning speed, retention and transfer (§6).

## 2. What already exists, and what we take from it

Nothing on GitHub covers the full loop, but the parts are there. Reuse is the plan, not a nice-to-have.

| Project | What it does well | What we reuse | Gap we fill |
|---|---|---|---|
| **FretFree** (pookey/fretfree, MIT) | Guitar PWA built on spaced retrieval (FSRS), interleaving, adaptive difficulty, fading guidance; local-first, no account. Curriculum covers notes, intervals, CAGED, diatonic harmony, Roman numerals, ear skills. Only the first drill is built so far. | Architecture: drill-plugin design, FSRS engine, storage, session builder, fretboard model. Its learning-science notes match ours. **First choice: build on it rather than beside it.** | Mic input, ear-to-hand drills, improvisation, delayed retests. |
| **FretEcho** (dmb1107/fretecho, MIT) | Browser call-and-response: speaks a note or interval, listens through the mic, judges it, keeps a per-position heatmap and weights weak spots. Handles mic/speech deconfliction. | The mic loop (pitchy, McLeod method), round engine, weak-spot weighting, the "keep listening on a miss" behaviour. | Key context (it tests intervals, not scale degrees or chord function), no spacing, no progression. |
| **OpenEar** (ShacharHarshuv/open-ear, MIT) | Mature ear trainer: scale degrees in any mode, chord function by Roman numeral, "notes with chords", common progressions, progressions from real songs. Tone.js audio. | Exercise logic and the harmonic prompt generator (cadence → target). Reference for how to define exercises. | Answers are tapped, not played; no fretboard; no guitar focus. |
| **tonal** (npm) | Music theory library used by FretFree and others. | All note, scale, chord and key maths. | — |
| **ts-fsrs** | Scheduler behind FretFree and modern Anki. | Spaced retrieval. | — |
| **SoloBuddy** (ericelder/BackingTrack), **music-theory-learner** (Anh-08), **Frets** (Tristan578) | Backing loops with chord tones highlighted on the neck; jam rooms; spaced-repetition quizzes. | Design ideas for the backing-track screen; Anh-08's Jam Room is the closest reference for "play into the gaps". | None of them listens to what you play over the track. |
| **BetterChord CNN** (rodriler), chroma-based chord recognisers | Single-strum chord recognition, about 93% test accuracy. | A starting point for chord detection later. Training data has non-commercial / no-derivative terms, so check before using the weights. | Not needed for v1 (single-note detection is enough). |

**Decision:** prototype as a fork or contributor branch of FretFree, adding FretEcho's mic loop as an input adapter and OpenEar-style exercises as drill plugins. If FretFree's maintainer is open to it, contribute upstream; if not, keep the fork. Check licences before copying code (I saw MIT on FretFree, FretEcho and OpenEar; confirm each in the repo).

## 3. Learners and scope

**Primary learner:** the stuck intermediate guitarist. Knows open and barre chords and a pentatonic box, cannot hear where a progression is going, improvises by guessing. Secondary: songwriters who play rhythm and want to know why progressions work.

**Out of scope for v1:** beginners, notation reading, bass and ukulele, video lessons, song-tab library, chord (polyphonic) detection, accounts and sync.

## 4. Principles (from the learning research, see v0.2 §2)

1. **Hear first, label second.** Every concept starts as sound.
2. **Ear to hand.** The main answer is played on the guitar. Tapping is the fallback.
3. **Many short trials.** Perceptual skill needs volume; a 10-minute session holds 100+ trials.
4. **Mixed, spaced, retested.** Interleave skills and keys, bring misses back, judge by delayed tests.
5. **Fading, honest feedback.** Full feedback at first, less as accuracy rises. Say when detection is unsure.
6. **Teach the practice.** One line on why a drill is built the way it is, and a short end-of-session reflection.

## 5. Requirements

**P0** = first build. **P1** = next. Each row names its source.

### A. Key map (knowing)
| ID | Requirement | Pri | Source |
|---|---|---|---|
| A1 | Any major or natural-minor key: scale, diatonic triads and 7ths, Roman numerals on an interactive neck, sound on tap. | P0 | FretFree model + tonal |
| A2 | Each diatonic chord in three neck zones, linked to CAGED. | P0 | FretFree CAGED content |
| A3 | Common progressions (I–V–vi–IV, ii–V–I, 12-bar, I–vi–IV–V, i–VI–III–VII) in any key with a backing loop. | P0 | New (Tone.js) |
| A4 | Circle of Fifths, capo and transposition helper; "why it works" cards. | P1 | New |

### B. Ear training (hearing)
| ID | Requirement | Pri | Source |
|---|---|---|---|
| B1 | **Scale degree in key.** Cadence sets the key, a note plays, learner plays it on the guitar (or taps number / moveable-do). | P0 | OpenEar logic + FretEcho mic |
| B2 | **Chord function.** Hear a progression, name chords by Roman numeral (I, IV, V, vi first). | P0 | OpenEar logic |
| B3 | **Note against chord.** Chord sounds, then a note: root, 3rd, 5th or 7th? Play it back. | P0 | OpenEar "notes with chords" + mic |
| B4 | **Find it on the neck.** 3–4 chord progression or short melody plays; learner finds it by ear in a rotating key. No tab. | P0 | New, on FretEcho round engine |
| B5 | **Spot the error.** One wrong note or chord in a short passage; where? | P0 | New |
| B6 | **Imagine first.** Optional silent beat (and optional hum) between hearing and playing. | P0 | New |
| B7 | Scheduler: interleave skills and keys, spaced return of misses (FSRS), difficulty held at about 80–90% accuracy. | P0 | FretFree engine |
| B8 | Interval drills with song hints; key-finding from a played snippet. | P1 | FretEcho / new |

### C. Play into the gaps (using)
| ID | Requirement | Pri | Source |
|---|---|---|---|
| C1 | **Chord-tone ladder** over a loop: roots → 3rds → 5ths/7ths at each change → add passing notes. Targets shown on the neck, hidden as accuracy rises. | P0 | SoloBuddy / Anh-08 for display; new scoring |
| C2 | **Live scoring.** Mic detects the note at each chord change; per-bar hit map shown after the take. | P0 | FretEcho mic loop + new |
| C3 | Backing-track generator: key, progression, tempo, feel. Always able to serve an unseen key for transfer tests. | P0 | New (Tone.js) |
| C4 | Call-and-response phrases; pentatonic-to-full-scale bridge. | P1 | New |

### D. Practice system (keeping it)
| ID | Requirement | Pri | Source |
|---|---|---|---|
| D1 | Placement test (5–8 min) that sets the baseline. | P0 | New |
| D2 | 10-minute session (5/10/20): ear warm-up, one concept, one play-along; goal stated up front. | P0 | FretFree session builder |
| D3 | Automatic retests at 1, 7 and 30 days in unseen keys. | P0 | New, on FSRS |
| D4 | Dashboard that leads with delayed and transfer results, not today's score. | P0 | New |
| D5 | One-line drill rationale and 30-second end-of-session reflection. | P0 | New |
| D6 | Local-first, no account, JSON export of results. Left-handed neck. Standard tuning first. | P0 | FretFree |
| D7 | English and Spanish; alternate tunings; optional weekly goal that never overrides the schedule. | P1 | New |

## 6. Measures of a steeper curve

Per learner, per skill:

- **Trials-to-criterion**: trials and minutes to 90% on 20 consecutive items in a key.
- **Delayed retention**: accuracy at 1, 7 and 30 days with no practice between.
- **Transfer**: accuracy in an unseen key, timbre, tempo or progression.
- **Chord-tone hit rate**: share of chord changes landed on a chord tone over a new progression.
- **Play-by-ear time**: time to find a 4-chord progression of an unfamiliar loop on the neck.
- **Detection reliability**: correct plays accepted, wrong plays accepted, on a fixed test set.

Built-in experiments (randomised per item or per week): interleaved vs blocked; imagine-first on vs off; full vs faded feedback; moveable-do vs numbers. Early results are n-of-1 and are reported as such.

## 7. Technical plan

- **Stack:** follow FretFree: Vite + React + TypeScript PWA, tonal, ts-fsrs, Dexie (IndexedDB), Tone.js for prompts and backing loops. Runs on iPad, phone and desktop browser, works offline, no backend.
- **Mic input:** Web Audio + pitchy (McLeod) as in FretEcho, monophonic only, with FretEcho's mute-while-prompting guard. Add a confidence readout and tap-to-confirm below a threshold. Target under about 150 ms visual latency; measure on a mid-range Android phone and on Safari, where FretEcho reports higher latency.
- **Audio:** synthesised timbres for prompts and loops; no licensed recordings in v1.
- **Data:** results and settings only, stored locally, exportable. No audio retained.
- **Later:** chord detection (chroma or a small CNN), real-song clips, sync.

## 8. Roadmap

- **Week 0–2: scout and set up.** Run FretFree and FretEcho locally. Confirm licences. Open an issue or discussion with FretFree's maintainer about contributing ear-to-hand drills. Decide fork vs upstream.
- **Week 2–6: core loop prototype.** B1, B3, B4 and C1/C2 as drill plugins on FretFree's engine, with FretEcho's mic adapter. Backing loop for three progressions in any key. Placement test and the 7-day retest.
- **Week 6–10: pilot.** 5–10 intermediate players, 4 weeks, with baseline and retests. Collect §6 metrics and detection reliability. Interview 3–5 guitar teachers on the curriculum sketch (v0.2 §12).
- **Week 10–16: first build.** All P0 items, levels 1–3 of the curriculum, English only.
- **After:** P1 items, Spanish, levels 4–6, chord detection.

## 9. Risks

| Risk | Response |
|---|---|
| FretFree stays early-stage or diverges from our needs | Its architecture is small enough to fork; keep drill plugins self-contained so they can move. |
| Detection errors teach wrong things | Monophonic only, confidence shown, tap-to-confirm, reliability tracked as a metric. |
| Interleaving and delayed tests feel harder, so people stop | Explain in-app, offer an easier mode, watch continuation in the pilot. |
| Evidence base is mostly classical, wind and lab studies | Treat every principle as a hypothesis; the §6 experiments are the test. |
| Licence or data terms on reused code or chord-model weights | Check each repo's LICENSE before copying; skip the BetterChord weights unless terms allow. |

## 10. Open questions

1. Fork FretFree or contribute upstream? Depends on the maintainer's response.
2. Moveable-do or numbers as the default label?
3. First pilot group: Frank alone, a few friends, or a local teacher's intermediate students?
4. Confirm "GLead" has no collision with an existing app, repo or mark (R3).

## 11. Sources

GitHub: pookey/fretfree · dmb1107/fretecho · ShacharHarshuv/open-ear · Anh-08/music-theory-learner · Tristan578/frets · ericelder/BackingTrack · Subterfugus/fretwise · huggingface.co/rodriler/betterchord-chord-cnn. Learning research and the plateau literature are cited in `guitar-app-prd.md` v0.2, §2 and §14.
