# GLead: agent guide

An ear-to-hand guitar trainer (installable PWA, local-first, no account). The
product definition is `docs/prd-concise.md`; the evidence behind it is
`docs/prd-research-appendix.md`; the build order is `docs/implementation-plan.md`.

## Non-negotiables

- **The core loop is the product**: hear it → (imagine it) → play it on the guitar → see how you did → it comes back later in a new key. Every drill is built around it.
- **Measure, don't assume.** Every trial writes a `TrialEvent` (`src/core/events`). Dashboard numbers are computed from the log, never stored separately.
- **Honest detection.** The mic reports confidence; below the threshold the learner confirms by tap. Never silently accept or reject a play.
- **Vendored code stays vendored.** `src/vendor/fretfree` is FretFree's (MIT). Don't edit it beyond keeping it compiling; see `src/vendor/fretfree/UPSTREAM.md`.
- Dependencies must be MIT/ISC/BSD/Apache-2.0/0BSD. Record every reused project in `THIRD_PARTY_NOTICES.md`.
- No audio is ever stored or uploaded. Results and settings only.

## Commands

| Command | What |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm verify` | typecheck, lint, format check, unit tests, build |
| `pnpm test` | unit tests (Vitest; `.test.tsx` in jsdom, `.test.ts` in node) |
| `pnpm e2e` | Playwright against a production build; the fake mic is `window.__gleadFakeMic` (see `e2e/helpers.ts`) |

## Layout (`src/`)

- `vendor/fretfree/`: theory (tonal), mic (pitchy in an AudioWorklet), audio (Tone.js guitar, strums, progressions), fretboard SVG, FSRS grading/scheduler/adaptive band.
- `core/`: GLead's own engine. `types.ts` (InputAdapter, Drill, Scorer, BackingLoop, TrialEvent), `input/` (tap, mic adapters), `events/` (Dexie log + export), `scheduling/` (session plan, placement, retests), `scoring/` (play-along change scorer), `session/` (runner; a session's `purpose` is practice, placement or retest; a drill that `accumulate`s collects a sequence of notes), `experiments.ts` (arms dealt once, conditions drawn per trial, the weekly schedule), `keymap.ts` and `whycards.ts` (the Keys screen's pure helpers), `miclab.ts` (the R2 protocol and its summary), `keyfinder.ts` (key from a played phrase), `tunings.ts` (GLead's tuning list over FretFree's two; screens read tunings from here, not from the vendor), `i18n.ts` (`t()` and `useT()`; English and Spanish, English fallback; the test keeps Spanish complete), `metrics.ts` (every dashboard number).
- `audio/`: cadences and backing loops built on the vendored audio engine.
- `drills/`: one folder per drill, `logic.ts` pure and tested, view in `.tsx`. `registry.ts` lists skills in curriculum order and has `skillTitle` and `rationaleOf` for the translated text. `c4-response/` is not a drill: a panel the Session screen shows after a B4 melody, logging an ungraded take.
- `screens/`: Today, Session, Keys (A1/A2 reference), Changes (play-along), Loops, Progress (also views another learner's export read-only), Settings, Mic lab (from Settings).

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`. Pure modules take `now` and `rng` as arguments.
- Pure logic gets unit tests. UI gets RTL tests and, later, Playwright.
- User-facing text goes through `t('key')` with the string in both dictionaries in `core/i18n.ts`; musical names and the trial log stay in English. Data shown by id (skills, rationales, why cards, rungs, loops, feels) is keyed `skill.<id>`, `rationale.<drillId>`, `why.<id>.title`… and `drills/i18n-coverage.test.ts` checks every id has text.
- CSS Modules plus `styles/tokens.css`. Dark first. Okabe–Ito colours on the neck; distinguish markers by shape as well as colour.
- Commit messages: imperative subject, body says why.
