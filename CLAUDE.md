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
- `core/`: GLead's own engine. `types.ts` (InputAdapter, Drill, Scorer, BackingLoop, TrialEvent), `input/` (tap, mic adapters), `events/` (Dexie log + export), `scheduling/` (session plan, placement, retests), `scoring/` (play-along change scorer), `session/` (runner; a session's `purpose` is practice, placement or retest), `metrics.ts` (every dashboard number).
- `audio/`: cadences and backing loops built on the vendored audio engine.
- `drills/`: one folder per drill, `logic.ts` pure and tested, view in `.tsx`.
- `screens/`: Today, Session, Changes (play-along), Loops, Progress, Settings.

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`. Pure modules take `now` and `rng` as arguments.
- Pure logic gets unit tests. UI gets RTL tests and, later, Playwright.
- CSS Modules plus `styles/tokens.css`. Dark first. Okabe–Ito colours on the neck; distinguish markers by shape as well as colour.
- Commit messages: imperative subject, body says why.
