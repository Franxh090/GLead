# GLead handoff

**Written:** 24 Oct 2026, end of the first build session (Sprints 0–7 plus the iPhone pass). **Read this first in a new session**, then `CLAUDE.md`, then `docs/implementation-plan.md`. Everything is on `main` at `github.com/Franxh090/GLead`; nothing is uncommitted.

## 1. Where things stand

- **Built:** every PRD P0 item and the P1 list except C4 call-and-response (B4 already covers imitation) and chord detection. Six drills (B1–B5, B8), Changes (play-along scoring), Keys (A1, A2, A4, Find my key), Loops, placement, retests, experiment arms, dashboard, Mic lab, Spanish, standard and drop D tuning. `README.md` §Status lists it all.
- **Quality gate:** `pnpm verify` (typecheck, lint, prettier, 686 unit tests, build) is green on `main` and on GitHub's runner. `pnpm e2e` runs 30 Playwright specs (27 desktop, 3 at iPhone 15 width) in about two minutes; all pass.
- **Deployment:** `.github/workflows/pages.yml` builds `main` and publishes `dist` to GitHub Pages with base path `/GLead/`. Runs 1–2 failed on a pnpm version clash (fixed in `db1af21`). **Run 3 passed every build step and failed only at `actions/configure-pages`, because Pages is not enabled and the workflow token may not enable it.**

## 2. The one thing Frank must do next

Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then either push anything to `main` or open **Actions → Deploy to GitHub Pages → Run workflow**. The site will be at `https://franxh090.github.io/GLead/`. On the iPhone: Safari → Share → Add to Home Screen → Settings → mic on → Run the Mic lab. `README.md` §Install it on an iPhone has the steps.

If Pages is not wanted, Netlify or Cloudflare Pages work with build command `pnpm build` and output `dist`, with no base path at a root domain (`GLEAD_BASE` unset).

## 3. Decisions already made (do not reopen without a reason)

| Decision | Where recorded |
|---|---|
| New repo that vendors FretFree's pure modules (theory, mic, audio, fretboard, FSRS core) instead of forking the 70k-line app | `research/R1-codebase-audit.md` §1 |
| FretEcho's mic loop not copied (weaker); its mute-while-prompting is done by timestamp in the runner; weak-spot weighting via FSRS | R1 §4 |
| OpenEar's exercise designs and cadence recipe re-implemented on tonal, not ported | R1 §5 |
| Licences: all MIT/Apache-2.0; BetterChord weights off-limits; "GLead" has only minor collisions | `research/R3-licences.md` |
| Cards are one per fact (degree, numeral, chord tone); the key rotates per prompt; six practised and six held-out keys per mode | `src/core/keys.ts` |
| Placement and retest sessions measure only (no retries, no card updates); a skill rests while a retest is pending | `src/core/session/runner.ts`, `src/core/scheduling/retests.ts` |
| Experiment arms dealt once per learner; imagine-first and feedback variant per trial; schedule alternates by week; all on every trial | `src/core/experiments.ts`, `research/R5-measurement.md` |
| Trial log fields and musical names stay in English; UI goes through `t()` | `src/core/i18n.ts`, `CLAUDE.md` |
| iPhone first: Pages deploy, phone-width spec, every mic start inside a tap | `docs/implementation-plan.md` §6 |

## 4. Open decisions for Frank

1. R5 §6: the proposed proxies (play-by-ear time, detection reliability until R2), the baseline week, the first pilot group.
2. R2: run the Mic lab on a real iPhone and laptop with a guitar; adopt the suggested confirm threshold or not. Until then `confirmBelow` 0.6, the one-beat scoring window and the 150 ms anticipation allowance in `src/core/scoring/changes.ts` are guesses.
3. Whether to open the FretFree upstream conversation (R1 §7).
4. What the next sprint is. The plan is built out; the next work should come from the Mic lab numbers, the pilot exports and the teacher interviews, not from the plan.

## 5. Things a new session will trip over

- **Prettier reformats every file**, so exact-string edits written from memory miss. Read the file (or grep the lines) before editing, and match with whitespace-tolerant regexes when scripting edits. Many failed edits in this session were only that.
- **`pkill -f <pattern>` can kill the shell running it** when the command line itself contains the pattern. Use a bracketed first character (`[v]ite`) and never echo the pattern in the same command.
- **Playwright's web server is Vite launched directly** (`playwright.config.ts`), not via `pnpm preview`; through pnpm the teardown hung forever. If a run "hangs" with all tests started, that is the cause. Chromium is at `/opt/pw-browsers/chromium-1194/...` and WebKit is not installed; the iPhone project runs in Chromium at phone size.
- **Test hooks the specs rely on:** `window.__gleadFakeMic = true` before load installs the fake pitch source (`e2e/helpers.ts` `useFakeMic`); `window.__gleadArms` pins the experiment arms (`fixArms`), without which a learner dealt moveable-do labels breaks any spec that taps "1". Drill cards expose `data-target-midi` (and `data-target-midis`, `data-wrong-at`).
- **Headless audio:** an AudioContext does advance in headless Chromium with `--autoplay-policy=no-user-gesture-required`; the script player still races Tone's `done` against the step length so a stalled clock never blocks a session.
- **IndexedDB cannot store functions:** `MicLabRun.summary` is the storable summary. Schema versions: 1 base, 2 retests, 3 miclab; append, never edit.
- `pnpm verify` does **not** run e2e; run `pnpm e2e` separately (about two minutes) before pushing anything that touches screens.
- Commit as Frank with `-c user.name="Frank" -c user.email="zomewho@gmail.com"`; `gh` is not authenticated, but the public GitHub API and the GitHub MCP tools read workflow runs.

## 6. Where the code is

See `CLAUDE.md` §Layout. The pure cores to read first: `src/core/session/runner.ts` (the loop), `src/core/scheduling/plan.ts` (what a session contains), `src/core/metrics.ts` (every number on Progress), `src/core/scoring/changes.ts` (play-along scoring). Each drill is `src/drills/<id>/logic.ts` plus a view; `src/drills/registry.ts` lists skills in curriculum order. `src/vendor/fretfree/UPSTREAM.md` says what was copied from where.

## 7. Candidate next steps, in the order I would take them

1. Confirm the deploy, then do the Mic lab on the iPhone (Frank). Fix whatever iOS Safari shows; nothing has run on a real device yet.
2. Translate what is still English only: the Mic lab, the why-it-works cards, the Progress table labels, the Changes and Loops controls.
3. Interleaved-vs-blocked results will take weeks; nothing to build there yet.
4. C4 call and response: an ungraded "answer with a phrase of your own" after a B4 imitation, logged as a take.
5. More tunings need entries in FretFree's `TUNINGS` (vendored; add GLead's own list rather than editing the vendor file).
6. After the pilot: fixes from exports and interviews, then levels 4–6 of the curriculum (ii–V–I and 7ths are partly there in B2/B3; passing notes and phrase building are not).
