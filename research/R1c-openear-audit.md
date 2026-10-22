# R1 — OpenEar audit (read-only) for GLead reuse

Repo: `/tmp/claude-0/-home-user-GLead/f36d5a2c-390d-589b-9bc6-1f29c1cf8967/scratchpad/upstream/open-ear` (ShacharHarshuv/open-ear). All paths below are relative to `src/app/` unless absolute.

## 1. Repo facts

| Item | Finding |
|---|---|
| License | **No standalone `LICENSE` file.** MIT text lives only in `README.md` under "## License": "Copyright 2021 Shachar Har-Shuv / Permission is hereby granted, free of charge, to any person obtaining a copy of this software…" — verbatim MIT, so reuse is MIT-permitted, but GLead must carry that copyright + permission notice. `package.json` has **no `license` field** and still says `"author": "Ionic Framework"` (template leftover). Recommend asking upstream to add `LICENSE` or at least cite README MIT text in GLead's NOTICE. |
| Last commit | `e17c6f7` 2026-09-24 "Bigger, more spaced answer buttons (#350)" |
| Commits visible | 53 (shallow clone; recent activity 2025-12 → 2026-09, ~monthly) |
| Angular / Ionic | `@angular/*` ^17.0.5, `@ionic/angular` ^7.8.6, Capacitor ^7 |
| Tone.js | `tone` **pinned 14.7.77** (commit 2026-09-16 "Pin tone.js to 14.7.77 to fix broken production build") |
| Test runner | Karma + Jasmine (`karma.conf.js`, `ng test`; `jest` is in devDeps but unused). 51 `*.spec.ts` under `src/`, incl. a smoke test per exercise (`exercise/exercises/testing-utility/test-exercise.spec.ts` → `exerciseSmokeTest`) and unit tests for music utils (Chord, RomanNumeralChord, voicing, scale degrees, modal-analysis, isAcceptableChordAnalysis). |
| Music-theory libs | **None.** No `tonal`/`@tonaljs` (0 hits in `pnpm-lock.yaml`). All theory is hand-written under `exercise/utility/music/`. Other deps touching logic: `lodash`, `lodash-decorators` (`@Memoize` in `NotesRange.ts`), `ts-fsrs` (spaced repetition, `exercise.page/state/fsrs-exercise.ts`), `heap-js`, `js-priority-queue`, `youtube-player`. Piano samples from `@audio-samples/piano-mp3-velocity10` plus bundled `src/samples/*` (20 instruments). |

## 2. Exercise definition model

Core file: `exercise/exercise-logic/Exercise.ts` (550 lines) + `exercise/exercise-logic/settings-config.ts`.

```ts
export interface Exercise<GAnswer extends string = string, GSettings extends ExerciseSettings = ExerciseSettings> {
  readonly id: string;            // persisted key, never change
  readonly name: string;
  readonly summary: string;
  readonly explanation?: ExerciseExplanationContent; // string | Angular Type<any>
  readonly alert?: Type<any>;
  readonly blackListPlatform?: Platforms;              // ionic
  readonly settingsConfig: SettingsConfig<GSettings>;  // { controls: SettingsControlDescriptor[]; defaults: GSettings }
  logic(settings: GSettings): ExerciseLogic<GAnswer>;
}

export interface ExerciseLogic<GAnswer extends string = string> {
  answerList: StaticOrGetter<AnswerList<GAnswer>>;
  getQuestion(questionsToExclude?: string[]): Question<GAnswer>;
  getQuestionById?(id: string): Question<GAnswer> | undefined;
  isQuestionValid?(question: Question<GAnswer>): boolean;
  handleFinishedAnswering?: (numberOfMistakes: number) => unknown;
  questionStartedPlaying?: () => void;
  reset?: () => unknown;
}

interface BaseQuestion<GAnswer extends string, GSegment> {
  id?: string;
  type?: string;                              // 'notes' (default) | 'youtube'
  segments: (GSegment & {
    rightAnswer: GAnswer;
    isAcceptable?: (answer: GAnswer) => boolean;
    playAfter?: number;
  })[];
  cadence?: PartToPlay;                       // NoteEvent[] | Note | Note[]  — played to establish key
  key?: Key;                                  // used to decide whether to replay cadence on key change
  drone?: Note | null;
  afterCorrectAnswer?: { partToPlay: NoteEvent[]; answerToHighlight?: GAnswer }[];
  info?: string | { beforeCorrectAnswer: string; afterCorrectAnswer: string };
}
export interface NotesQuestion<GAnswer> extends BaseQuestion<GAnswer, { partToPlay: PartToPlay; playOnWrong?: StaticOrGetter<PartToPlay,[GAnswer]> }> { type?: 'notes' }
export interface YouTubeQuestion<GAnswer> extends BaseQuestion<GAnswer, { seconds: number }> { type: 'youtube'; videoId: string; endSeconds: number }
```

Answers are plain strings (`type Answer<GAnswer> = GAnswer`). `AnswerList` is either a flat array or an `AnswersLayout { rows: (AnswersLayoutCell[] | string)[] }` where a cell is `Answer | null | AnswerConfig {answer, displayLabel?, space?, playOnClick?} | MultiAnswerCell {innerAnswersList, innerAnswersList2?}` (long-press sub-menus). Helpers in the same file: `normalizedAnswerList`, `flatAnswerList`, `filterIncludedAnswers`, `mapAnswerList`, `addViewLabelToAnswerList`, `getAnswerListIterator`.

Settings UI is declarative: `SettingsControlDescriptor { key, descriptor: ControlDescriptor (slider | select | list-select | checkbox | included-answers), show?, info?, isDisabled? }`.

**Factory / composition pattern** ("use*" hooks, no classes): exercises are plain object literals composed from reusable attribute factories in `exercise/exercises/utility/exerciseAttributes/` and settings factories in `exercise/exercises/utility/settings/`:

- `useTonalExercise(config)` (`tonalExercise.ts`) — key selection (`'C' | 'random'`, `newKeyEvery`), drone + drone octave; holds mutable closure state (`questionCount`, `key`); `getQuestion(settings, questionInC, cadenceInC?)` transposes a question authored **in C** to the current key via `transpose(x, getDistanceOfKeys(key,'C'))`, attaches `cadence`, `key`, `drone`, `info: "1 = <key>"`. Random key pool: C G D A E B F# Db Ab Eb Bb F.
- `useMelodicExercise(config)` (`melodicDictationExercise.ts`) — wraps tonal; turns `Note[]` (or `Note[][]` voices) into segments with `rightAnswer: SolfegeNote`; adds `displayMode: 'solfege'|'numeral'`, `rhythmicValues`.
- `useChordProgression()` (`chordProgressionExercise.ts`) — turns `{chord: Chord, answer}[]` into voiced `NotesQuestion` segments (one `NoteEvent` per chord, `velocity 0.3`, `duration '2n'`), honouring `VoicingSettings`.
- `useRomanAnalysisChordProgressionExercise()` (`roman-analysis-chord-progression-exercise/romanAnalysisChordProgressionExercise.ts`) — composes the two above; `getChordsQuestion(romanNumerals)` → `romanNumeralToChordInC`; `getQuestion(settings, romanNumerals | chordsQuestion, cadenceInC?)`; `fullAnswerList = allRomanNumeralAnswerList` (big 5-row Roman-numeral grid with chord-type sub-menus, `roman-numeral-answer-list.ts`, 317 lines).
- Settings mixins: `useIncludedAnswers`, `useNumberOfSegments(name)` (slider 1–8), `playAfterCorrectAnswerControlDescriptorList`, `cadenceType` (`CadenceTypeSetting.ts`), `chordVoicings` (`voicing-settings.ts`), `modalAnalysis` (`modal-analysis.ts`), `flexibleChordChoiceSettings`.

Registry: `exercise/exercise.service.ts` `exerciseList = [notesInKeyExercise, chordInKeyExercise, commonChordProgressionExercise, chordsInRealSongsExercise, chordTypeExercise, notesWithChordsExercise, triadInversionExercise, intervalExercise]`.

## 3. The four target exercises

### 3a. Scale degrees — `exercise/exercises/NotesInKeyExercise/notesInKeyExercise.ts` (`notesInKeyExercise`, id `noteInKey`)
- **Answer type**: `SolfegeNote` (`'Do'|'Di'|'Ra'|'Re'|…|'Ti'`, `utility/music/scale-degrees/SolfegeNote.ts`); mapping to `ScaleDegree` (`'1'|'b2'|'2'|…|'7'`) via `scaleDegreeToSolfegeNote` / `solfegeNoteToScaleDegree`. Layout: `utility/answer-layouts/scale-layout.ts` (two rows: chromatic row `b2 b3 #4 b6 b7` over diatonic `1..7`); labels switch to numerals via `toMusicalTextDisplay` when `displayMode='numeral'`.
- **Question generation** (`logic(settings).getQuestion`): picks range by `notesRange` (`high C4–G6`, `middle G2–E4`, `bass A1–C3`, `contrabass Eb1–Eb2`, as `NotesRange`), maps range into key-of-C space (`utils.getRangeForKeyOfC`), filters notes whose solfege is in `includedAnswers`, walks `numberOfSegments` notes constrained by `melodicIntervals` (diatonic interval codes `'1'..'8','4#'` → semitone sets), optionally stacks `numberOfVoices` (1–3) lower voices a major-third-gap apart constrained by `harmonicIntervals`. Each note becomes a segment `{notes: note, duration}` (`'2n'` for single note, else random from `rhythmicValues`). Resolution ("play after correct answer") computed by `getResolutionFromScaleDegree(scaleDegree, included, cadenceType)` (`utility/music/scale-degrees/getResolutionFromScaleDegree.ts`): stepwise walk to tonic choosing a scale option (major/mixolydian/harmonic/natural minor) consistent with the included notes and cadence.
- **Cadence**: `cadenceInC: getCadence(settings.cadenceType)` from `utility/settings/CadenceTypeSetting.ts`. `CadenceType = 'I IV V I' | 'i iv V i' | 'vi ii III vi'` → `IV_V_I_CADENCE_IN_C`, `iv_V_i_CADENCE_IN_C`, or minor cadence transposed to A (`transpose(iv_V_i_CADENCE_IN_C, getDistanceOfKeys('A','C'))`). Then `useTonalExercise.getQuestion` transposes it to the chosen key.
- **Settings** (`NoteInKeySettings`): `cadenceType`, `key: 'C'|'random'`, `newKeyEvery: 0|1|5|10|20`, `drone: false|1..7`, `droneOctave 1–7`, `displayMode`, `includedAnswers` (default `['Do','Re','Mi']`), `notesRange` (default `'middle'`), `numberOfSegments` (1–8), `melodicIntervals`, `rhythmicValues` (`'2n','4n','4n.','8n','8n.','16n'`), `numberOfVoices` 1–3, `harmonicIntervals`, `playAfterCorrectAnswer`.

### 3b. Chord functions / Roman numerals — `exercise/exercises/ChordInKeyExercise/chordsInKeyExercise.ts` (`chordInKeyExercise`, id `chordInKey`, 732 lines; ~540 are the resolution table)
- **Answer type**: `RomanNumeralChordSymbol` (template-literal union in `utility/music/harmony/RomanNumeralChordSymbol.ts`: accidental? + numeral + chord-type postfix + optional `/bass-degree`, e.g. `'I'`, `'bVII'`, `'viidim'`, `'V7'`, `'ii7'`, `'I/3'`). Parsed by `class RomanNumeralChord` (`utility/music/harmony/RomanNumeralChord.ts`) with `getChord(key): Chord`, `isInversion`, `scaleDegrees()`, `convertAnalysis(...)`.
- **Question generation**: `composeSequenceWithGrammar(settings.includedAnswers, settings.numberOfSegments, chordProgressionRules)` (`utility/grammer/compose-sequence-with-grammar.ts`) — random walk filtered by `Rule<T> = (prev) => (next) => boolean`; rules in `ChordInKeyExercise/grammar/`: `noRepeatsRule`, `dominantResolutionRule` (dominant must resolve authentically/deceptively or prolong), `inversionEnterRule`, `inversionExitRule` (slash chords only with stepwise bass). Then `romanAnalysis.getChordsQuestion(chords)` → `Chord` objects in C → `useChordProgression.getQuestionInC` voices them (see §4) → `useTonalExercise.getQuestion` transposes. Single-chord mode adds `afterCorrectAnswer` resolution from the hard-coded `romanNumeralToResolution` table (major & minor, per starting inversion 0/1/2, e.g. `ii → V(third pos) → I(octave pos, oct 5)`).
- **Cadence**: `getCadence(settings.cadenceType)` (same three options as 3a).
- **Settings** (`ChordInKeySettings`): `cadenceType`, tonal (`key`, `newKeyEvery`, `drone`, `droneOctave`), voicing (`voiceLeading: 'RANDOM'|'CORRECT'` default CORRECT, `includedPositions: (0|1|2)[]`, `includeBass: boolean` default true), `includedAnswers` (default `['I','IV','V']`), `numberOfSegments` 1–8, `playAfterCorrectAnswer` (default true).

### 3c. Notes with chords — `exercise/exercises/NotesWithChords/notesWithChordsExercise.ts` (`notesWithChordsExercise`, id `notesWithChords`)
- **Answer type**: `NoteWithChord = \`${SolfegeNote}${1..7}\`` e.g. `'Do1'`, `'Mi5'` = solfege of the note + *scale degree of the chord root*. `noteWithChordDescriptorMap` enumerates all 49 diatonic combos → `{ chord: {triad: 'I'…, seventh: 'Imaj7'…}, solfegeNote }`. `allNotesWithChordsAnswersList` = 7×7 grid (rows = chord degree, cols = Do..Ti).
- **Question generation**: pick random included answer → chord via `romanNumeralToChordInC(descriptor.chord[harmonyMode])`, note type via `scaleDegreeToNoteType`. Chord voicing: `chord.getVoicing({position: random 0|1|2, octave: 4, withBass: false})`; note chosen from `voiceMode` range (`soprano C4–G5` / `bass G2–B3`, mapped to key-of-C). Voicing is re-inverted (`Chord.invertVoicing`) until the note is above (soprano) or below (bass) the chord; soprano mode adds `chord.getBass()` (root at oct 2 and 3). Single segment with two simultaneous `NoteEvent`s at `time: 0`: chord (`velocity 0.3, '2n'`) + target note (`velocity 1, '2n'`).
- **Cadence**: hard-coded `IV_V_I_CADENCE_IN_C` (major only), transposed by `useTonalExercise`.
- **Settings**: tonal (key/newKeyEvery/drone/droneOctave), `includedAnswers` (default `['Do1','Do3','Do5']`), `voiceMode: 'soprano'|'bass'`, `harmonyMode: 'triad'|'seventh'`.

### 3d. Common progressions — `exercise/exercises/CommonChordProgressionExercise/commonChordProgressionsExercise.ts` (`commonChordProgressionExercise`, id `commonChordProgression`)
- **Answer type**: `RomanNumeralChordSymbol` (one per chord segment; learner answers each chord in order).
- **Question generation**: `randomFromList(getIncludedProgressionsDescriptors(settings))` from `commonProgressions.ts` (see §6), re-spelled to the user's `modalAnalysis` via `RomanNumeralChord.convertAnalysis`; then `romanAnalysis.getQuestion(settings, romanNumerals, cadenceInC)` (voicing + transposition identical to 3b). `answerList` = `filterIncludedAnswers(fullAnswerList, uniq(all chords in included progressions))`.
- **Cadence**: `getCadenceInCFromModalAnalysis(progression.mode ?? Ionian, settings.modalAnalysis)` (`utility/settings/modal-analysis.ts`): `tonic-1` → major ? `IV_V_I` : `iv_V_i`; `1-major-6-minor` → major ? `IV_V_I` : `transpose(iv_V_i, -3)` (i.e. relative-minor cadence on A); `1-ionian-always` → cadence transposed by the mode's degree offset.
- **Settings**: tonal + voicing + `playAfterCorrectAnswer`, `modalAnalysis: 'tonic-1'|'1-major-6-minor'|'1-ionian-always'` (default `1-major-6-minor`), `includedProgressions: string[]` (ids are `romanNumerals.join(' ')`; 12 defaults listed in `defaultProgressions`).

### 3e. (bonus) Chords in real songs — `exercise/exercises/ChordsInRealSongsExercise/chordsInRealSongsExercise.ts`
YouTube-backed (`type: 'youtube'`, segments are `{seconds, chord}`), cadence = `IV_V_I_CADENCE_IN_C` / `iv_V_i_CADENCE_IN_C` transposed to `progression.tonic`. Uses Angular `signal/computed/untracked` and `fsrsExercise` (ts-fsrs) → **not** framework-free; iOS blacklisted. Data in `songQuestions.ts` (see §6).

## 4. Harmonic prompt generator → audio

**Where the cadence/progression becomes note data (pure):**
- `utility/music/chords/chordProgressions.ts`:
  ```ts
  export const IV_V_I_CADENCE_IN_C: NoteEvent[] = [
    { notes: new Chord('F').getVoicing({ position: TriadPosition.Third }),  velocity: 0.3 },
    { notes: new Chord('G7').getVoicing({ position: TriadPosition.Third }), velocity: 0.3 },
    { notes: new Chord('C').getVoicing({ position: TriadPosition.Octave, octave: 5 }), duration: '2n', velocity: 0.3 },
  ];
  // iv_V_i_CADENCE_IN_C: same with 'Fm', 'G7', 'Cm'
  ```
  `TriadPosition { Fifth=0, Octave=1, Third=2 }` names the soprano note. `Chord.getVoicing({position, withBass=true, octave=4})` (`utility/music/chords/Chord/Chord.ts`) builds close-position chord from `chordTypeConfigMap[type].scaleDegreeList` (`ChordType.ts`, 29 chord types), rotates `position` times, normalises so soprano sits in `octave`, and with `withBass` prepends `getBass()` = `[bass2, bass3]`. So the major cadence is literally: F/A (A2? no — bass F2,F3 + voicing with A on top), G7 with B on top, C with C5 on top, each a quarter note at 120 bpm (`'4n'` default), last chord a half note, velocity 0.3; followed by a 100 ms gap (state service).
- Progression voicing: `useChordProgression().getQuestionInC` (`exerciseAttributes/chordProgressionExercise.ts`) — `voiceLeading==='CORRECT'` → `voiceChordProgressionWithVoiceLeading(chords, firstInversion, {withBass})` (`utility/music/chords/voiceChordProgressionWithVoiceLeading.ts`: for each next chord try all rotations, octave-normalise toward previous soprano, accept those with avg voice movement ≤ 8/3 semitones, random among valid); `'RANDOM'` → random voicing in range `G3–E5` with soprano leap ≤ P5.
- Transposition to key: `utility/music/transpose.ts` `transpose(partOrNotes, semitones)` works on `Note`, `NoteType`, `Note[]`, `NoteEvent[]`, `NotesRange`; distance via `utility/music/keys/getDistanceOfKeys.ts` (nearest, −6..+6).

**Audio data format (`services/player.service.ts`):**
```ts
export interface NoteEvent {
  notes: Note[] | Note;      // Tone note names e.g. 'C4', 'Bb3' (string literal type from tone/Tone/core/type/NoteUnits)
  duration?: Time;           // Tone Time, default '4n'
  time?: Time;               // default: previous time + previous duration (sequential)
  velocity?: NormalRange;    // default 0.7
}
export type PartToPlay = { partOrTime: NoteEvent[] | number /*ms gap*/; instrumentName?; beforePlaying?; afterPlaying?; bpm?; playAfter?: number };
```
Note names only (no MIDI numbers at the boundary; MIDI numbers exist internally via `toNoteNumber`/`toNoteName` in `utility/music/notes/toNoteName.ts`). `toSteadyPart` (`utility/music/toSteadyPart.ts`) converts bare notes to `NoteEvent[]` with `time: {'4n': i}`.

**Where Tone.js is called:** only `services/player.service.ts` (`Tone.start/loaded`, `Tone.Sampler({urls, release:1})`, `Tone.Part` scheduling `instrument.triggerAttackRelease(notes, duration, time, velocity)`, `Tone.Transport` bpm/start/stop/cancel/schedule) and `services/drone-player.service.ts` (`Tone.Synth` triangle, `triggerAttack/Release`). Plus `sandbox.component.ts`, `triadInversionExercise.ts`, `fsrs-exercise.ts` (`import * as Tone`), none in the four target exercises. Everywhere else `tone` appears only as **type imports** (`Note`, `Time`, `Frequency`, `Subdivision`).

**Playback sequencing** (`exercise.page/state/exercise-state.service.ts` `playCurrentCadenceAndQuestion`): cadence part (`toSteadyPart(question.cadence)`, forced `bpm: 120`) + 100 ms gap, then question segments, then `afterCorrectAnswer` parts. Cadence is played when `globalSettings.playCadence` is true or when `question.key` changed (`_wasKeyChanged`); `'ONLY_ON_REPEAT'` plays it only on first/repeat. Global settings: `exercise/utility/exercise-settings/GlobalExerciseSettings.ts` (`playCadence`, `bpm` default 120, `instrument` default `'piano'`, …).

## 5. Coupling and porting estimate

Framework imports inside the logic tree (`exercise/exercise-logic`, `exercise/exercises`, `exercise/utility`, excluding specs/explanation components):

| File | Coupling |
|---|---|
| `exercise/exercise-logic/Exercise.ts` | `import { Type } from '@angular/core'` (only for `explanation?: Type<any>`, `alert?: Type<any>`), `import type { Platforms } from '@ionic/core/components'`. Trivial to replace with `unknown`/string. |
| `exercise/utility/music/harmony/RomanNumeralChord.ts` | `import { computed } from '@angular/core'` used for three lazily-memoised fields `inversionIndex`, `intervals`, `scaleDegrees` (called as `chord.intervals()`). Replace with a plain memo/getter — 10-line change, but callers use call syntax `intervals()`. |
| `exercise/utility/music/NotesRange.ts` | `@Memoize()` from `lodash-decorators` (needs `experimentalDecorators`). Drop or replace with a Map cache. |
| `exercise/exercises/ChordsInRealSongsExercise/*` | Angular `signal/computed/untracked`, `fsrsExercise` — out of scope unless GLead wants YouTube songs. |
| `exercise/exercises/IntervalExercise/intervalExercise.ts` | `@Component`, `ModalController` — out of scope. |
| Each exercise's `explanation: XxxExplanationComponent` | Angular component import; drop or replace with markdown string. |
| `NoteEvent` type imported from `services/player.service.ts` | Pure type, but the module imports Tone + `@Injectable`; move the interface to its own file. |
| `tone` type imports (`Note`, `Time`, `Frequency`, `Subdivision`) | Types only; `Note` is just a template-literal string union — redefine locally or keep `tone` as a type-only devDependency. |
| RxJS | **None** in the logic tree (only in `services/` and `exercise.page/`). |
| `lodash` | Pervasive (`_.map`, `_.flatMap`, `_.random`, `_.round`, `_.last`, …) — keep `lodash-es` or replace ad hoc. |
| Path aliases | Several files import via `src/app/...` absolute alias (`tonalExercise.ts`, `CadenceTypeSetting.ts`, `modal-analysis.ts`, `getResolutionFromScaleDegree.ts`, `IncludedAnswersSettings.ts`, `isAcceptableChordAnalysis.ts`, `RomanNumeralChord.ts`). Need a `tsconfig` `paths` entry or rewrite. |
| Circular-ish import | `utility/music/harmony/RomanNumeralChord.ts` ↔ `exercises/utility/settings/modal-analysis.ts`; `scale-degrees/getResolutionFromScaleDegree.ts` → `exercises/utility/settings/CadenceTypeSetting.ts`. Works in Angular's bundler; fine in Vite but worth flattening. |
| Side effects | `ChordType.ts` has a stray `console.log(romanNumeralChordTypeParserMap)` at module load; `songQuestions.ts` throws on duplicate ids at module load. |

**Verdict:** the exercise logic is already written in a framework-free "hooks" style and authored in C + transposed, so it is highly portable. Estimated effort to lift the four exercises' pure logic into GLead as plain TS (Vite):

- **S** — Scale degrees (3a) and Notes-with-chords (3c): copy ~15 utility files + `tonalExercise`, `melodicDictationExercise`, `CadenceTypeSetting`, `IncludedAnswersSettings`; strip 2 Angular imports.
- **M** — Chord functions (3b) and Common progressions (3d): add `Chord`, `ChordType`, `RomanNumeralChord` (de-Angular `computed`), `voiceChordProgressionWithVoiceLeading`, `chordProgressionExercise`, `romanAnalysisChordProgressionExercise`, `roman-numeral-answer-list` (UI-ish layout, optional), grammar rules, `modal-analysis`. The 540-line resolution table in `chordsInKeyExercise.ts` is optional.
- **Overall: M (roughly 1–2 days)** for a faithful port, excluding UI and audio. Replacing the audio layer is independent: write a `playParts(PartToPlay[])` against Tone.js (or GLead's existing synth) consuming the same `NoteEvent[]` shape.

**On using `tonal`:** OpenEar's theory core is small and idiosyncratic (12-tone `ScaleDegree` strings like `'b3'`, `'#4'`; `NoteType` is 17 spellings; Roman-numeral grammar with chord-type postfixes and `/degree` slash bass). `tonal` could replace `transpose`, `toNoteNumber/toNoteName`, `getDistanceOfKeys`, `Chord` interval tables and `Interval` enum (via `@tonaljs/note`, `@tonaljs/chord`, `@tonaljs/roman-numeral`), but **not** `RomanNumeralChord` parsing of OpenEar's own symbol dialect (`viidim`, `7b5`, `6/9`, `/b7` bass), `voiceChordProgressionWithVoiceLeading`, `getResolutionFromScaleDegree`, `convertModalAnalysis`, the grammar rules, or the answer-layout grids. Recommendation: port OpenEar's utils verbatim first (they are tested — 20 spec files), and optionally swap the note-arithmetic primitives to `tonal` later. Enharmonics caveat: OpenEar maps MIDI→name with sharps-first (`toNoteName` returns `'C#4'` for 61) and `NoteType` transposition is modular with sharp spellings except Db/Eb/Ab/Bb/Gb kept as inputs; `tonal` would give proper key-aware spelling if GLead wants display-quality note names.

**Files to port (minimum set for a–d):**
```
exercise/exercise-logic/Exercise.ts, settings-config.ts            (strip Angular Type/Platforms)
shared/ts-utility/{StaticOrGetter,randomFromList,toArray,mod,isValueTruthy,keys,DeepReadonly}.ts
services/player.service.ts                                        (extract NoteEvent + PartToPlay types only)
exercise/utility/music/MusicSymbol.ts, NotesRange.ts (drop @Memoize), transpose.ts, toSteadyPart.ts, getMusicTextDisplay.ts
exercise/utility/music/intervals/{Interval,getInterval}.ts
exercise/utility/music/notes/{NoteType,consts,NoteNumberOrName,toNoteName,toNoteTypeNumber,getNoteType,getNoteOctave,noteTypeToNote}.ts
exercise/utility/music/keys/{Key,getDistanceOfKeys,isInKey}.ts
exercise/utility/music/scale-degrees/{ScaleDegrees,SolfegeNote,scaleDegreeToSolfegeNote,scaleDegreeToNoteType,noteTypeToScaleDegree,getResolutionFromScaleDegree}.ts
exercise/utility/music/chords/Chord/{Chord,ChordType,isChordTypeMajor,isChordTypeMinor,isChordTypeDiminished}.ts
exercise/utility/music/chords/{chordProgressions,voiceChordProgressionWithVoiceLeading}.ts
exercise/utility/music/harmony/{Mode,RomanNumeralChordSymbol,RomanNumeralChord (de-Angular),romanNumeralToChordInC,transposeScaleDegree,isAcceptableChordAnalysis}.ts
exercise/utility/grammer/*.ts
exercise/exercises/utility/exerciseAttributes/{tonalExercise,melodicDictationExercise,chordProgressionExercise}.ts
exercise/exercises/utility/exerciseAttributes/roman-analysis-chord-progression-exercise/*.ts
exercise/exercises/utility/settings/{CadenceTypeSetting,keySelectionSettingsDescriptors,IncludedAnswersSettings,NumberOfSegmentsSetting,PlayAfterCorrectAnswerSetting,voicing-settings,modal-analysis}.ts
exercise/exercises/utility/answer-layouts/scale-layout.ts
exercise/exercises/NotesInKeyExercise/notesInKeyExercise.ts
exercise/exercises/ChordInKeyExercise/chordsInKeyExercise.ts + grammar/**
exercise/exercises/NotesWithChords/notesWithChordsExercise.ts
exercise/exercises/CommonChordProgressionExercise/{commonChordProgressionsExercise,commonProgressions}.ts
```
Plus the corresponding `*.spec.ts` (Jasmine → Vitest is mostly `describe/it/expect`-compatible; custom matchers in `ExerciseTest.ts` use `jasmine.AsymmetricMatcher`).

## 6. Progression / song data

- **Common progressions**: `exercise/exercises/CommonChordProgressionExercise/commonProgressions.ts` — `ProgressionDescriptor { romanNumerals: RomanNumeralChordSymbol[]; name?: string; mode?: Mode /*default Ionian*/; analysis?: ModalAnalysis /*default 'tonic-1'*/ }`, 44 entries: 18 major (I V I "Perfect Cadence", I IV V I "Classical", I V vi IV "Axis (optimistic)", I vi IV V "Doo-Wop / 50s", I vi ii V "Circle", IV V iii vi "The Royal Road", Pachelbel Canon, 2-5-1s…), 16 Aeolian (i iv V i, i bVII bVI V "Andalusian", i bVI bIII bVII "Axis (Pessimistic)", "Can't Stop"…), 2 Dorian ("Dorian Vamp", "Plagal Cascade"), 2 Mixolydian ("Mixolydian Vamp", "Clocks"), 3 modal-interchange (I IV iv I, bVI bVII I "Mario Cadence", I bVI V I), 4 secondary-dominant (I III vi IV, I VI ii V, I IV #ivdim V, I V III vi). Facts/pattern names, not copyrightable content; code is MIT per README.
- **Song progressions**: `exercise/exercises/ChordsInRealSongsExercise/songQuestions.ts` (10,078 lines) — `YouTubeSongQuestion { mode: Mode; tonic: NoteType; analysis?; cadence?: NoteEvent[]; videoId: string; legacyVideoId?; subId?; name?; artist?; section?; chords: {seconds: number; chord: RomanNumeralChordSymbol}[]; endSeconds: number; solo? }`. 342 entries (~30 non-Ionian). Exported as `songChordQuestions`; id = `getId()` = `videoId section subId`. Supporting: `getIncludedQuestions.ts` (filter by included chords + modal-analysis conversion), `indexQuestionsByProgression.ts`. **Licence remarks**: the file is MIT-licensed code, but the content is (i) song titles/artists (facts), (ii) hand-made Roman-numeral analyses with timestamps (original authorship by contributors, covered by the repo's MIT grant), and (iii) YouTube video IDs — playback relies on the YouTube IFrame API, so GLead would be bound by YouTube ToS, not by OpenEar. No song lyrics or audio are included. Reusable, but attribute OpenEar.
- No other datasets; the Roman-numeral answer grid in `roman-numeral-answer-list.ts` and the resolution table in `chordsInKeyExercise.ts` are the only other large hand-authored tables.
