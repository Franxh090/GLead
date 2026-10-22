# R1 audit — FretEcho (upstream: dmb1107/fretecho)

Read-only audit of `/tmp/claude-0/-home-user-GLead/f36d5a2c-390d-589b-9bc6-1f29c1cf8967/scratchpad/upstream/fretecho`.
All paths below are relative to that root. No files were modified, no deps installed, nothing run.

---

## 1. Repo facts

| Item | Value |
|---|---|
| License | MIT. `LICENSE` opens: `MIT License` / `Copyright (c) 2026 Dave` / standard MIT grant text. |
| Commits | `git rev-list --count HEAD` = **23**. Clone is shallow-to-50 but the root "Initial commit: FretEcho bass fretboard trainer" is present, so 23 is the full history. |
| First / last commit | 2026-04-08 → **2026-04-12** (`e86aa94` "Rework ear training into interval training"). Whole project is a 5-day burst. |
| Runtime deps (`package.json`) | `pitchy ^4.1.0` (lock: **4.1.0**), `react ^18.3.1`, `react-dom ^18.3.1`, `zustand ^4.5.5`. **No `tone` / Tone.js** — all synthesis is raw Web Audio `OscillatorNode`. |
| Dev deps | `vite ^5.4.10`, `typescript ^5.6.3`, `@vitejs/plugin-react ^4.3.3`, `vite-plugin-pwa ^1.2.0`, `tailwindcss ^3.4.14`, `postcss`, `autoprefixer`, `@types/react*`. |
| Node | README says "Node 18+"; CI (`.github/workflows/deploy.yml`) uses `node-version: 20`. No `.nvmrc`, no `engines` field. |
| TypeScript config | `tsconfig.json`: `strict: true`, `target ES2022`, `moduleResolution: bundler`, `noUnusedLocals/Parameters`. Build = `tsc -b && vite build`. |
| Tests | **None.** No test files, no vitest/jest in deps, no `test` script. |
| Deploy | GitHub Pages via Actions; PWA (`vite-plugin-pwa`, autoUpdate). |
| Source size | ~2.3k lines TS/TSX across `src/audio` (5 files), `src/game` (4), `src/music` (4), `src/stats` (1), `src/settings` (1), `src/ui` (9). |

---

## 2. Mic pipeline (`src/audio/`)

### 2a. `src/audio/micInput.ts` — `openMic(deviceId?) → MicStream`
```ts
getUserMedia({ audio: { deviceId: {exact} | undefined,
                        echoCancellation: false, noiseSuppression: false,
                        autoGainControl: false, channelCount: 1 }, video: false })
const context = new AudioContext({ sampleRate: 44100 });
const source  = context.createMediaStreamSource(stream);
```
- Returns `{ context, source, stream, stop() }`; `stop()` stops tracks and `context.close()`.
- All three browser DSP flags are **off** (important for guitar: AGC/NS mangle sustained tones).
- `listInputDevices()` wraps `enumerateDevices()` filtered to `audioinput`.
- No `context.resume()` on user gesture here — relies on `openMic` being called from a click/effect after permission; this is a Safari/iOS risk (see §6).

### 2b. `src/audio/pitchDetector.ts` — `class PitchLoop`
Algorithm: **pitchy 4.1.0 = McLeod Pitch Method (MPM)** via `PitchDetector.forFloat32Array(fftSize)` and `detector.findPitch(buffer, sampleRate) → [frequency, clarity]`.

Graph: `mic.source → AnalyserNode` (`fftSize = 8192`, `smoothingTimeConstant = 0`). Time-domain samples are pulled each frame with `analyser.getFloatTimeDomainData(buffer)`. **No ScriptProcessor / AudioWorklet** — polling loop driven by `requestAnimationFrame`.

Key constants (defaults in `PitchDetectorOptions` / `processFrame()`):

| Constant | Value | Where |
|---|---|---|
| `fftSize` | **8192** samples (= 185.8 ms window @ 44.1 kHz) | ctor |
| `detector.minVolumeDecibels` | **-60 dB** | ctor |
| `minRms` | **0.01** (gate; below → frame = null, state reset) | `processFrame` |
| `minClarity` | **0.9** (pitchy clarity ∈ [0,1]) | `processFrame` |
| `minFreq` / `maxFreq` | **25 Hz – 600 Hz** (tuned for bass; guitar high E 12th fret = 659 Hz is *out of range* — must raise for GLead) | `processFrame` |
| cents gate | `|cents| > 45` → reject frame as transient | `processFrame` |
| `stabilityFrames` | **3** consecutive rAF frames on same MIDI | `processFrame` |
| loop cadence | `requestAnimationFrame` (~60 Hz, throttled in background tabs) | `start()` |

Frequency → MIDI: `nearestMidi(freq)` in `src/music/notes.ts`:
```ts
freqToMidi = 69 + 12*log2(f/440); midi = round(exact); cents = (exact - midi)*100
```
Name via `midiToNoteName(midi, useFlats)` / `midiToNoteClass`.

Onset / stability rule (`processFrame`):
1. RMS < 0.01 → reset `consecutive` and `lastEmittedMidi`, emit `onFrame(null)`.
2. clarity < 0.9 or f ∉ [25,600] → reset `consecutive`, `onFrame(null)`.
3. Emit `onFrame({frequency, clarity, midi, cents, rms})` (UI readout).
4. `|cents| > 45` → reset `consecutive` (no emit).
5. Same `midi` as last frame → `count++`, else `{midi, count:1}`.
6. `count >= 3 && lastEmittedMidi !== midi` → `onStableNote({ midi, frequency, timestamp: performance.now() })`; set `lastEmittedMidi = midi`.

So a "note event" fires **once per sustained pitch** (re-triggering the same pitch requires silence/RMS drop or an explicit `armForNextNote()`). There is **no true onset detector** (no energy-derivative / attack detection); "onset" ≈ first frame where 3 consecutive stable frames agree. `StableNoteEvent` carries no clarity, so GLead's `{midi, confidence, onsetTime}` would need to capture `clarity` from the frame that triggered emission (trivial change).

Public surface: `start()`, `stop()`, `pause()` (keeps graph, clears state, emits `onFrame(null)`), `resume()`, `armForNextNote()`, `getRms()`.

Latency-relevant: effective minimum detection latency ≈ analyser window fill (~186 ms, though the window is a sliding ring so partial-fill detection is earlier) + 3 rAF frames (~50 ms) ≈ **~150–240 ms** before `onStableNote`. No measured figures anywhere in the repo.

### 2c. `src/audio/micStore.ts` — zustand glue
`useMicStore` holds `{ mic, loop, open, detected }` with `openMic/closeMic/toggleMic`. Module-level mutable refs `setOnStableNote(fn)` / `setOnFrame(fn)` let a screen route events without re-creating the loop. This is the only place `PitchLoop` is constructed.

---

## 3. Mute-while-prompting / speech deconfliction

Not a separate module — it is a protocol between engine and `PitchLoop.pause()/resume()/armForNextNote()`.

**Where:** `src/game/sessionEngine.ts` `SessionEngine.nextRound()` (lines ~126–139), and identical blocks in `earSessionEngine.ts` and `chordSessionEngine.ts`.

**How (per round):**
```ts
this.deps.pitchLoop.pause();          // stop processing frames; clears consecutive/lastEmitted; onFrame(null)
await speak(speakTextStr);            // Web Speech API, resolves on onend/onerror or safety timeout
await sleep(300);                     // guard window: flush the ~186 ms analyser buffer tail
this.deps.pitchLoop.resume();
this.deps.pitchLoop.armForNextNote(); // next stable note is freshly emitted
```
Code comment: "speech formants sit in the bass frequency range and pitchy locks on."

**Same guard around feedback tones** (`judge()`):
- Correct → `pause()`, `playSuccess()`, 650 ms `setTimeout` → `nextRound()` (which pauses again then resumes after speech).
- Wrong → `pause()`, `playError()` (only if a *different* wrong pitch class than `lastWrongMidi`), 400 ms `setTimeout` → `resume(); armForNextNote()` (guarded by `if state.kind !== 'listening' return`).

**Speech side** (`src/audio/speech.ts`): `speak(text, {rate=0.9, lang, voiceName})` returns a Promise with a **safety timeout** `max(2000, text.length*120 + 1000)` ms because Chrome sometimes never fires `onend` after `cancel()`. Only calls `synth.cancel()` if `speaking || pending` (Chrome drops the new utterance if you cancel-then-speak in the same tick). `cancelSpeech()` is called on `stop()` so an awaited `speak()` can't strand the engine. `pickDefaultVoice()` prefers Google/Microsoft voices, then Apple's Samantha/Alex/…, and rejects a `NOVELTY_VOICE_PATTERN` list (Zarvox, Bahh, …). `speakableNoteName()` in `notes.ts` turns "A" into "A." so TTS says "ay" not "uh".

**Feedback tones** (`src/audio/feedbackTones.ts`): own `AudioContext` (separate from mic context), `playSuccess()` = E5→B5 sine blips (0.12 s/0.16 s), `playError()` = A3→D#3 square blips. Calls `ctx.resume()` if suspended.

Takeaway for GLead: the guard is purely temporal (pause → await output → fixed sleep → resume). It does **not** use echo cancellation, output-signal subtraction, or a dedicated output AudioContext mute. The 300 ms/400 ms/650 ms numbers are hand-tuned to `fftSize 8192 @ 44.1 kHz`.

---

## 4. Round engine (`src/game/`)

### 4a. Round definition — `src/game/sessionEngine.ts` `class SessionEngine`
- `SessionConfig { tuning, allowAccidentals, promptStyle, focusWeakSpots, minFret, maxFret }`.
- `EngineDeps { pitchLoop, getStats(), recordStat(key, correct, ms), onStateChange(state) }` — engine is **framework-free**; React only subscribes via `onStateChange`.
- `EngineState` discriminated union: `idle | prompting{round,target,expectedMidi,text,useFlats} | listening{…,startedAt,recorded,lastWrongMidi?} | feedback{round,result} | done{results}`.
- `RoundResult { position, expectedMidi, playedMidi, correct, ms, useFlats }`.
- Sessions are **infinite** until `stop()`; `notesPerSession` exists in settings but is not consumed by the engine.
- Entry point for input: `handleStableNote = (midi) => { if (state.kind==='listening') judge(midi) }`.

### 4b. Target selection — `src/game/weakSpotPicker.ts`
- `eligiblePositions(opts)`: `allPositions(tuning, minFret, maxFret)` (from `src/music/tunings.ts`), filtered by `isSharpOrFlat(noteAt(...))` when `allowAccidentals` is false.
- `pickNext(opts, avoid?)`: weighted roulette over `weightFor(pos)`; the previous target's weight is zeroed so no immediate repeat.
- `weightFor`:
  ```ts
  if (!focusWeakSpots) return 1;
  if (!stat || stat.attempts < 3) return 3;      // under-sampled → 3x
  score = proficiency(stat); if (score===null) return 3;
  return 0.25 + (1 - score) * 3;                 // range [0.25, 3.25]
  ```
- Sharp/flat spelling is a per-round coin flip (`useFlats = Math.random() < 0.5`).
- Interval engine (`earSessionEngine.ts`) chooses `pickInterval(enabledIds, lastId)` (uniform, avoids last) and a random root in MIDI 28–43 (E1–G2) clamped so target ≤ 55 (G3) — bass range constants `ROOT_MIN/ROOT_MAX/TARGET_MAX`. Chord engine uses `pickChord()` from `src/music/chords.ts`.

### 4c. Judging — `SessionEngine.judge(playedMidi)`
- **Octave-agnostic pitch-class equality**: `((played%12)+12)%12 === ((expected%12)+12)%12`.
- **No cents tolerance at judge time**; the ±45 cents gate lives upstream in `PitchLoop`. Anything that survives the detector is treated as the rounded semitone.
- `ms = performance.now() - startedAt` (startedAt set when `listening` begins, i.e. after speech + 300 ms guard).
- **Only the first attempt is recorded** (`if (!recorded)` → push `RoundResult`, call `recordStat(positionKey(tuning,target), correct, ms)`).
- Ear/chord engines additionally **ignore the previous note's pitch class** (root ring-out / previous chord tone) so sustain isn't judged wrong.

### 4d. "Keep listening on a miss"
On wrong answer the engine stays in `listening` with `recorded: true`, `lastWrongMidi: playedMidi`, same `startedAt`; UI reveals the target in red (`TrainingScreen.tsx` highlights). Error beep only when the wrong pitch class differs from `lastWrongMidi` ("single-beep errors"). Loop pauses 400 ms then `resume(); armForNextNote()`. When the player eventually hits the right note, the `feedback` state carries `correct: false` (because `recorded` was already true) so the UI flashes red but advances; stats keep the original miss.

### 4e. Weak-spot / heatmap data — `src/stats/statsStore.ts`
```ts
interface PositionStat { attempts: number; correct: number; totalMs: number; lastSeen: number }
type StatsMap = Record<string, PositionStat>        // key: `${instrument}:${openStringNote}:${fret}` e.g. "guitar:E4:7"
```
- Key built by `positionKey(tuning, pos)` (`src/music/tunings.ts`) / `keyFor(tuning, stringIndex, fret)`; keyed by open-string note so 4- and 5-string bass share stats. Interval stats use `ear:interval:${id}:${direction}`; chord stats use `chordStatKey(...)`.
- **Update rule** (`useStatsStore.record`): `attempts+1`, `correct+(correct?1:0)`, `totalMs+ms`, `lastSeen=Date.now()`; persisted to `localStorage['fretecho:stats:v2']` on every write (with v1→v2 migration).
- **Proficiency** (`proficiency(stat)`): `accuracy = correct/attempts`; `speed = clamp(1 - (avgMs - 1500)/3500, 0, 1)` (1.5 s → 1.0, 5 s → 0.0); `score = clamp(0.65*accuracy + 0.35*speed, 0, 1)`; `null` if no attempts. **No recency decay** — `lastSeen` is stored but unused.
- **Heatmap render** (`src/ui/StatsScreen.tsx` `colorForScore`): `null → #2a2a2a`, else `hsl(score*130, 70%, 50%)` (red→green), drawn onto `src/ui/Fretboard.tsx` via a `Map<"s:f", FretboardHighlight>`.

---

## 5. Coupling and extraction estimate

**The mic/pitch core is already framework-free.** `micInput.ts` and `pitchDetector.ts` import nothing from React or zustand; their only internal import is `nearestMidi` from `music/notes.ts` (pure math). React touches the mic only through `micStore.ts` (zustand) and the UI (`TrainingScreen.tsx` auto-opens the mic in a `useEffect`, calls `setOnStableNote(...)` to route to the engine, `MicMeter.tsx` polls `getRms()` per rAF).

**Effort to build `MicInputAdapter { start(), stop(), onNote }`: S** (half a day). Concretely:
1. Copy `src/audio/micInput.ts` verbatim.
2. Copy `src/audio/pitchDetector.ts`; add `clarity` to `StableNoteEvent` and rename `timestamp → onsetTime`; make `minFreq/maxFreq` guitar-appropriate (e.g. 70–1200 Hz) and consider `fftSize 4096` for lower latency on guitar (fundamentals ≥ 82 Hz don't need 8192).
3. Copy `nearestMidi/freqToMidi/midiToFreq/midiToNoteName/midiToNoteClass` from `src/music/notes.ts` (or the whole file, it's dependency-free).
4. Write ~40 lines of `MicInputAdapter` wrapping `openMic()` + `new PitchLoop(mic, { onStableNote })`, exposing `start/stop/pause/resume/armForNextNote/getRms`. This replaces `micStore.ts`; zustand not needed.
5. `npm i pitchy@4.1.0`.

Engines (`sessionEngine.ts`, `earSessionEngine.ts`, `chordSessionEngine.ts`) and `weakSpotPicker.ts` are also React-free (deps injected) but are coupled to `music/tunings.ts` (`TuningId`, `Position`, `positionKey`) and to `speech.ts`/`feedbackTones.ts` via direct imports. Extraction effort **M** if GLead wants them: abstract the `speak/playSuccess/playError` calls behind an injected "output" interface so the mute guard can wrap *any* GLead audio output, and generalise the position key.

Files to copy for the adapter: `src/audio/micInput.ts`, `src/audio/pitchDetector.ts`, `src/music/notes.ts`. Optional for the guard/engine: `src/audio/speech.ts`, `src/audio/feedbackTones.ts`, `src/game/sessionEngine.ts`, `src/game/weakSpotPicker.ts`, `src/stats/statsStore.ts` (drop zustand, keep `proficiency()` and `PositionStat`), `src/music/tunings.ts`.

Gotchas to carry over: rAF-driven loop stalls in background tabs (use `setInterval`/AudioWorklet if drills must run unfocused); `lastEmittedMidi` suppresses re-plucks of the same note until RMS drops below 0.01 or `armForNextNote()` is called — for a drill that asks the same note twice in a row you must arm explicitly; `Float32Array<ArrayBuffer>` generic requires TS ≥ 5.7 lib typings or loosen to `Float32Array`.

---

## 6. README / docs: latency, Safari/iOS, device caveats

Source: `README.md` ("Known limitations", "Prerequisites", "Tips") and code comments.
- **No measured latency numbers** anywhere. Only qualitative: "Safari's pitch detection latency is higher."
- "Tested primarily in Chrome on macOS. Firefox has partial Web Speech support." Prerequisite: "A modern Chromium-based browser (Chrome / Edge / Arc / Brave) — Web Speech voice availability is best there."
- **No iOS mention at all**; no `AudioContext.resume()`-on-gesture handling for the mic context and `new AudioContext({sampleRate: 44100})` is hard-coded (iOS Safari often forces 48 kHz; the explicit option may throw or be ignored). Treat iOS as untested.
- Low-frequency floor: "low B on a 5-string ~31 Hz is near the floor of what consumer mics and the McLeod method can resolve… expect occasional flutter on the detected-note readout." Mitigated by octave-agnostic judging.
- Device guidance: "A microphone near your amp or an audio interface routed as a mic input"; "Palm-mute everything except the string you're playing" (sympathetic resonance confuses the detector).
- Speech voice caveats: macOS Apple voices mispronounce "A"; novelty voices filtered; Chrome `cancel()`-then-`speak()` drops utterances; Chrome may never fire `onend` (hence the safety timeout).
- **Stale docs**: README and `HelpScreen.tsx` still describe a "synthesized reference tone" / "Replay reference" / sawtooth `bassTone` for ear training, but `src/audio/bassTone.ts` was deleted in HEAD (`e86aa94`) and the current `earSessionEngine.ts` speaks the root name instead of playing a tone.
