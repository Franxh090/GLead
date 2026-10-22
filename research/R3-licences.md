# R3 — Licence and reuse check (GLead)

Date: 2026-10-22. Method: LICENSE files read from the local clones under `scratchpad/upstream/`; npm registry queried with `npm view`; GitHub LICENSE files fetched raw; web search for datasets, stores, trademarks and domains. Anything marked **unverified** could not be confirmed from a primary source in this session (the egress proxy blocked huggingface.co, zenodo.org, idmt.fraunhofer.de, apps.apple.com, play.google.com, justia.com, rdap.org and the glead.* domains; GitHub search API and `gh api` for non-session repos were refused).

## Part A — Licences

### A1. Upstream repos (actual LICENSE text, not badges)

| Project | Licence (source) | Can we fork | Can we copy code into an MIT repo | Notice / attribution required | Notes |
|---|---|---|---|---|---|
| **pookey/fretfree** (last commit 2026-10-21) | MIT. `LICENSE`: "Copyright (c) 2026 pookey and Fretwork contributors" (the repo's package name is still `fretwork`). | Yes | Yes | Keep the MIT copyright + permission notice with any substantial copied portion (e.g. a `THIRD_PARTY_NOTICES.md` entry or header comment). | No NOTICE file. No non-standard clause. Vendored third-party: **Clear Sans** fonts in `app/public/fonts/` under **Apache-2.0** (`ClearSans-LICENSE.txt` is present; if we copy the fonts, copy that file too). `brand/options/index.html` previews Google Fonts under SIL OFL 1.1 but none are shipped. No audio samples bundled (synthesis via Tone.js). Repo's own dependency rule (`docs/handoff/01-foundations-brief.md`): MIT/ISC/BSD/Apache/0BSD only, no GPL/AGPL — all runtime deps checked below comply. |
| **dmb1107/fretecho** (last commit 2026-04-12) | MIT. `LICENSE`: "Copyright (c) 2026 Dave". | Yes | Yes | Same MIT notice requirement. | No NOTICE file, no non-standard clause, no vendored fonts/samples (only `favicon.svg`, `icon.svg`). Runtime deps: pitchy, react, react-dom, zustand (all permissive). |
| **ShacharHarshuv/open-ear** (last commit 2026-09-24, 184 stars) | MIT **text** in `README.md` §License ("Copyright 2021 Shachar Har-Shuv" + verbatim MIT grant/disclaimer), and `PRIVACY_POLICY.md` says "available on GitHub under the MIT license". **No `LICENSE` file** — never existed in git history; `package.json` has no `license` field (author field is Ionic boilerplate); GitHub does not detect a licence. | Yes, in practice (the README grant is a valid MIT licence from the copyright holder), but weaker evidence than a LICENSE file. | Yes, with the README copyright line reproduced. Consider asking the author to add a LICENSE file (low-cost goodwill issue/PR). | Reproduce "Copyright 2021 Shachar Har-Shuv" + MIT notice for any copied code. | Vendored third-party **audio samples**: `src/samples/` has 20 instrument folders (piano, guitar-acoustic/electric/nylon, bass-electric, cello, flute, etc.). README credits only the piano samples (`@audio-samples/piano-mp3-*`, darosh/samples-piano-mp3). **Provenance and licence of the other 19 instrument sets is not stated anywhere in the repo — unverified; do not copy those samples.** No NOTICE file. |

Fork/copy conclusions: all three are MIT-compatible with an MIT GLead repo. The only real care points are (a) carrying the MIT notices, (b) the Apache-2.0 font licence file in fretfree, (c) open-ear's unattributed instrument samples.

### A2. npm libraries (`npm view <pkg> license version`, 2026-10-22)

| Package | Licence (npm) | Current version | Cross-check | Notes |
|---|---|---|---|---|
| tonal | MIT | 6.5.1 | github.com/tonaljs/tonal | OK. |
| **ts-fsrs** | MIT | 5.4.2 | GitHub `LICENSE`: "MIT License, Copyright (c) 2026 Open Spaced Repetition" | OK. (FSRS algorithm itself is unencumbered; the reference implementation is MIT.) |
| **pitchy** | MIT (as published in the 4.1.0 tarball: `package/LICENSE` = MIT, "Copyright 2018-2021 Ian Johnson") | 4.1.0 | Repo `main` now says **0BSD** (`package.json` `"license": "0BSD"`, LICENSE = zero-clause BSD text, "Copyright Ian Johnson") | Both permissive and MIT-compatible. The published artefact we would depend on is MIT; a future release will be 0BSD (no attribution requirement at all). Keep the MIT notice for 4.x. |
| tone (Tone.js) | MIT | 15.1.22 | github.com/Tonejs/Tone.js | OK. |
| **dexie** | **Apache-2.0** | 4.4.6 | GitHub `LICENSE` = Apache 2.0 | Apache-2.0 is compatible with an MIT project (one-way: Apache code inside an MIT-licensed app is fine). Requirement: keep the Apache licence text/notices for redistributed Dexie code (normal for a bundled dep; add to third-party notices). Includes an express patent grant, no copyleft. |
| react | MIT | 19.3.1 | npm repo field now points to `github.com/react/react` | OK. |
| vite | MIT | 8.3.5 | github.com/vitejs/vite | OK. |

Also checked because fretfree ships them: `@tombatossals/chords-db` MIT, `vexflow` MIT, `zustand` MIT, `react-router` MIT.

Nothing GPL/LGPL/AGPL/SSPL in the set. The only non-MIT item is Dexie (Apache-2.0), which the fretfree dependency policy already allows.

### A3. IDMT-SMT-Chords dataset and the BetterChord CNN weights

- **IDMT-SMT-Chords** (Fraunhofer IDMT, Jakob Abeßer; 16 MIDI-rendered WAVs, ~4.1 h, 7,398 chord segments): **CC BY-NC-ND 4.0**, "provided for evaluation purpose", per the Fraunhofer dataset page and the Zenodo record 7544213 (as reported in search snippets; the pages themselves could not be fetched — *primary text unverified*). One Zenodo OAI listing reportedly says BY-NC-SA 4.0 instead; either way it is **non-commercial**, and ND additionally bars distributing adapted material. The sibling IDMT-SMT-CHORD-SEQUENCES (2021) is also CC BY-NC-ND 4.0.
  - Fraunhofer page: https://www.idmt.fraunhofer.de/en/publications/datasets/chords.html
  - Zenodo: https://zenodo.org/records/7544213
- **rodriler/betterchord-chord-cnn** (Hugging Face): the model card (per search snippets, *not fetched directly*) lists IDMT-SMT-Chords (CC BY-NC-ND 4.0) as training data and itself flags that the ND term "may be argued to cover a model trained on it"; other training sources listed: isolated-guitar-chords (CC-BY-4.0) and GADA (no stated licence). The companion GitHub repo **andresrodriler/BetterChord_Public** README (fetched) states: code is MIT, but the trained weights `chord_cnn.pth` / `chord_cnn.onnx` "are licensed separately, under CC BY-NC 4.0 (Attribution-NonCommercial), NOT MIT", and that some underlying sources are "more restrictively licensed than the code or the model weights".
  - https://huggingface.co/rodriler/betterchord-chord-cnn
  - https://huggingface.co/datasets/rodriler/betterchord-public-data
  - https://github.com/andresrodriler/BetterChord_Public
- **Implication for GLead:** treat the BetterChord weights as **off-limits for now**. Even ignoring the ND question, the weights are explicitly NonCommercial, which conflicts with shipping them inside an MIT-licensed app that may be distributed or monetised, and the NC/ND training-data taint cannot be removed by re-licensing. The BetterChord *code* (MIT) is reusable; the IDMT audio could at most be used locally for private evaluation, never redistributed, fine-tuned-and-shipped, or used to generate training material. If a learned chord recogniser is wanted later, train on CC-BY / CC0 / self-recorded data (e.g. the CC-BY-4.0 isolated-guitar-chords set named on the model card, licence to be verified first) or use the rule-based pitch/chroma approach already in fretfree/fretecho.

## Part B — Name collision check: "GLead"

Searched: "GLead", "G-Lead", "GLead app", "GLead guitar", store-restricted search, GitHub, npm, trademark aggregators, domains. Tools used: WebSearch (standard + extended), WebFetch (github.com only reachable), `npm view`.

| Channel | Finding | Evidence | Severity |
|---|---|---|---|
| **App Store (iOS)** | An app named **"GLEAD-基立科技"** (GLEAD – Jili/Chi-Li Technology) exists: developer "yang cheng-ru", category Utilities, described as an internal system app for viewing company data; v1.0.33 (2025-07-10), requires iOS 26. Different domain (enterprise utility, Chinese-language), but it is the exact string "GLEAD". | https://apps.apple.com/vn/app/glead-%E5%9F%BA%E7%AB%8B%E7%A7%91%E6%8A%80/id6453687908 | Minor. App Store Connect requires a unique app *name*; "GLEAD-基立科技" is not identical to "GLead", and a subtitle-style name ("GLead – Guitar Ear Trainer") would be safe. *Whether the bare name "GLead" is accepted is unverified.* |
| **Google Play** | Developer account **"GLEAD_system"** publishing the same 基立科技 app. No guitar/music app named GLead found. | https://play.google.com/store/apps/dev?id=4956693938870940295 | Minor (same enterprise app). Google Play does not enforce unique titles. |
| **GitHub** | Username **`glead`** is taken (user page exists, 0 public repos); `github.com/glead/glead` is 404. No notable repository named "glead" surfaced via web search. (GitHub repo search API not available in this session — *not exhaustive*.) | https://github.com/glead | Minor: we cannot own the `glead` org/user handle; a repo `<ourname>/glead` is fine. |
| **npm** | `glead` and `g-lead` are **not** in the registry (404). | `npm view glead` → E404 (2026-10-22) | Clear. |
| **Trademarks** | Web searches of Justia / TrademarkElite / CIPO surfaced **no GLEAD or G-LEAD word mark**. Near marks: GLADE (S.C. Johnson, air care), GLAAD (media org), GILEAD (pharma), eLEAD GLOBAL (CIPO) — all different classes/sectors. USPTO and EUIPO/TMview databases could not be queried directly; **this is not a clearance search**. | https://www.trademarkelite.com/trademark/trademark-detail/77451741/GLADE ; https://trademark.justia.com/778/06/glaad-77806400.html | Unverified / low apparent risk. Recommend a 10-minute manual check on USPTO Trademark Search and EUIPO eSearch plus (Class 9 and 41) before public launch. |
| **Other uses of the name** | **GLEAD** = Esade Business School's Leadership Development Research Centre (academic, Barcelona). "glead" is also an archaic English word (kite/bird of prey; live coal) in Merriam-Webster/Wordnik. | https://www.esade.edu/en/faculty-and-research/research/knowledge-units/leadership-development-research-centre/about ; https://www.merriam-webster.com/dictionary/glead | Negligible; no software or music overlap. |
| **Domains glead.app / glead.io** | Could not resolve or RDAP-query (proxy blocked). Web search finds **no indexed site** at glead.app, glead.io or glead.com. glead.com is a 5-letter .com and is almost certainly registered (*unverified*); .app/.io availability **unknown**. | search for "glead.io" OR "glead.app" OR "glead.com" returned only gleap.io / gleam.io / gleen.app | Unverified; check a registrar manually. |

**Verdict: minor collisions.** The exact string "GLEAD" is already an app name on both stores, but for an unrelated Chinese-language enterprise utility; the GitHub handle `glead` is taken; npm is free; no trademark surfaced in the aggregators searched; no guitar/music product uses the name. Proceed with "GLead", use a descriptive store title (e.g. "GLead – Guitar Ear Trainer"), and do the manual USPTO/EUIPO and registrar checks before launch. No fallback names are proposed because the collision is not significant.

### "Fretwise" is taken — confirmed

- GitHub **Subterfugus/fretwise** exists: "Music theory for guitarists, taught on the fretboard: 102 lessons, ear training, a tuner and practice tools. Runs in the browser or as a Windows app." Electron/React/TypeScript/Tone.js/VexFlow; MIT code, CC-BY 3.0 samples; 0 stars, 7 commits; homepage fretwise.eidsonbrady.com. https://github.com/Subterfugus/fretwise
- iOS/iPad app **"Fretwise"** (tuner, metronome, chord library, scales, CAGED/triads; free with IAP; also on Google Play, v1.5; developer Sebastian Bolling per AppBrain — *developer unverified*). https://apps.apple.com/us/app/fretwise/id6757199291
- Chrome extension **"Fretwise — Guitar Chords, Scales & Fretboard"** (Extension Factory). https://chromewebstore.google.com/detail/ceeahmhaghkjafgoiakjbmkkcknaphli
- (The Microsoft Store ID 9ntdtqlrt5xc that appeared in results is "FretWorx", a different product.)

Three independent guitar products already use "Fretwise" — a **significant collision** for that name; avoid it.

## Sources

- Local: `scratchpad/upstream/fretfree/LICENSE`, `fretfree/app/public/fonts/ClearSans-LICENSE.txt`, `fretfree/brand/README.md`, `fretfree/docs/handoff/01-foundations-brief.md`; `fretecho/LICENSE`; `open-ear/README.md` §License/§Credits, `open-ear/PRIVACY_POLICY.md`, `open-ear/package.json`, `open-ear/src/samples/`.
- https://raw.githubusercontent.com/open-spaced-repetition/ts-fsrs/main/LICENSE
- https://raw.githubusercontent.com/ianprime0509/pitchy/main/LICENSE and `/package.json`; npm tarball pitchy-4.1.0 `package/LICENSE`
- https://raw.githubusercontent.com/dexie/Dexie.js/master/LICENSE
- https://www.idmt.fraunhofer.de/en/publications/datasets/chords.html ; https://zenodo.org/records/7544213 ; https://www.idmt.fraunhofer.de/en/publications/datasets/chord-sequences.html
- https://huggingface.co/rodriler/betterchord-chord-cnn ; https://github.com/andresrodriler/BetterChord_Public
- https://apps.apple.com/vn/app/glead-%E5%9F%BA%E7%AB%8B%E7%A7%91%E6%8A%80/id6453687908 ; https://play.google.com/store/apps/dev?id=4956693938870940295
- https://github.com/glead ; https://github.com/Subterfugus/fretwise ; https://apps.apple.com/us/app/fretwise/id6757199291 ; https://chromewebstore.google.com/detail/ceeahmhaghkjafgoiakjbmkkcknaphli ; https://www.appbrain.com/appstore/fretwise/ios-6757199291
- https://www.esade.edu/en/faculty-and-research/research/knowledge-units/leadership-development-research-centre/about ; https://www.merriam-webster.com/dictionary/glead
