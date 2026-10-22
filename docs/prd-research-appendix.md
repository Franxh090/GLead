# PRD: GLead — Guitar Harmony & Ear Training (research appendix, v0.2)

**Status:** Draft v0.2 (learning-first rewrite) · **Date:** 22 Oct 2026 · **Owner:** Frank
**Change from v0.1:** removed market sizing, pricing, conversion and store metrics. The product is now defined by one question: *what design gets a guitarist from "knows shapes" to "hears the key and can fill the space" in the fewest practice hours?*

---

## 1. Purpose

Build a tool that makes a guitarist's learning curve **steeper**: fewer hours to reach a fixed, testable level of skill in four linked abilities.

1. **Know the key**: scale, diatonic chords, Roman numerals, where they sit on the neck.
2. **Hear the key**: scale degrees, chord function, and "which chord tone is this note?" by ear.
3. **Find it**: go from what you hear or imagine to the right place on the guitar.
4. **Fill the space**: play lines over a progression that land on chord tones at the changes.

"Steeper" is defined operationally in §7: time and trials to reach a criterion, and how well the skill holds after a delay and in new keys.

Nothing here is for sale. Features are included only if there is a reason to expect they speed learning. Where the evidence is weak, the feature is framed as an experiment (§9).

## 2. What the research says about learning faster

*Research done 22 Oct 2026 from public sources. The evidence base has an important limit: most music-practice experiments use classical or wind players, children, or short lab sessions. Almost none test a guitar app over months. Treat each row as a design hypothesis, not a proven result.*

| # | Finding | Evidence and strength | Design implication |
|---|---|---|---|
| 1 | **Practice quality beats practice time.** Strategy use predicted performance at retention better than frequency or duration of practice in one pianist study. One study reports that "formal practice" (goal-directed, self-regulated, deliberate) predicted achievement better than practice time alone. | A few studies; a large body of music-practice research exists (a systematic review screened 3,102 records, 1928–2020). Mostly correlational. **Medium.** | Each session must have a specific goal, a measurable target and immediate review, not "noodle for 20 minutes". |
| 2 | **You need to hear errors to fix them.** Practice is described as effective only when aural schemata exist to monitor errors (Hallam 2001, quoted in a 2023 study). Children without clear instruction used weaker strategies and learned errors. | Theory plus qualitative study. **Medium-low.** | Ear training is a prerequisite for self-correction, not an extra. Include "spot the wrong note or chord" tasks, and teach explicit practice strategies. |
| 3 | **Combine imagining, singing and playing.** In 50 classically trained trumpet students, physical and combined (imagery + singing + playing) practice both improved pitch accuracy over no practice; only the combined strategy improved musical expression. Pitch gains correlated with prior solfege training and frequent use of random practice. | Single experiment, short term, one new piece. **Medium-low.** | Build an "imagine → hum or sing (optional) → play" step into drills. Offer moveable-do or number labels. |
| 4 | **Interleaving helps long-term retention, but feels worse.** Alternating tasks usually gives better retention than blocked repetition even when it looks worse during training. In 10 skilled clarinetists, interleaved practice was rated better wherever raters differed, and players found it more useful, yet still preferred blocked. Other studies are mixed: a secondary-school study found no group difference, and effects differed between woodwind and brass players. | Large motor-learning literature; small and mixed music studies. **Medium.** | Interleave topics and keys by default. Tell the learner why it feels harder. Test it per learner (§9). |
| 5 | **Spacing and retrieval work, mostly measured on memory tasks.** A meta-analysis of 29 studies found spaced retrieval beat massed retrieval (g = 0.74); expanding schedules were no better than uniform spacing. Distributed practice and practice testing were the two techniques rated "high utility" in Dunlosky et al. 2013 (quoted via a secondary source). In maths, spacing helped (g = 0.28) but the testing effect was not robust. | Strong for declarative memory, uncertain for motor and perceptual skills. **Medium-high for facts, medium-low for guitar skill.** | Use spaced retrieval for chord names, functions and neck locations. Do not claim it will speed improvisation until measured. A simple uniform schedule is enough. |
| 6 | **Perceptual learning needs a lot of trials.** In adult absolute-pitch training, some people reached strong performance in about 8 weeks, but most improved only modestly. A later study averaged about 21 hours and 15,000+ trials per person, with heavy attrition. | Experiments with volunteers motivated to learn absolute pitch, not relative pitch. **Medium** for the dose point, **low** for transfer to our task. | Keep trials very short and numerous: a 10-minute session should contain 100+ ear trials. Measure trials-to-criterion. |
| 7 | **Playing by ear transfers to other musical skills.** Ear playing was found to relate to improvisation, playing from memory, performing rehearsed music and sight-reading (McPherson et al. 1997). In a class of beginning guitarists, a hearing-and-imitation group scored higher than a notation-reading group (M = 3.07 vs 2.50). Learning songs by ear in several keys improved ear-playing in two of three keys tested in wind students. Targeted "ear-to-hand" training improved scores over a control group in college music majors. | Mostly small, correlational, or intact-class studies. **Medium-low**, but consistent direction. | Make "find it on the neck by ear" central, and practise it in several keys. |
| 8 | **Singing can speed ear-playing.** Vernacular (popular, folk) musicians needed fewer trials than formally trained musicians to learn melodies by ear, and singing by ear took fewer trials than playing by ear (24 participants). | Small study, quoted second-hand. **Low-medium.** | Offer an optional hum-it-first step. Do not force it. |
| 9 | **Feedback: more is not always better.** The "guidance hypothesis" says frequent feedback creates dependence. But a lab study with real-time sound feedback found 100% feedback gave equal or better retention than 50%, and other work suggests sound-based feedback may not show the dependence effect. | Mixed, from non-musical motor tasks. **Low** for our case. | Start with full feedback, fade it as accuracy rises, and test fading per skill (§9). |
| 10 | **Fluency during practice is a poor guide to learning.** "Immediate fluency and perceived gains during training are not good indicators of long-term learning" (Bjork, as cited in the clarinet study). | Well-established principle in cognitive psychology. **High.** | Judge progress with **delayed retests**, not in-session scores. Show those on the dashboard. |
| 11 | **Internalising sound before playing is the aim of aural training.** Aural-skills teaching literature treats improvisation as the real test and describes a continuous loop of play, listen, correct (Royal Conservatoire, Den Haag), and teaches "pitch internalization" as an explicit skill (Klonoski). Jazz teaching traditions compare aural imitation to learning a mother tongue. | Pedagogical theory and practitioner reports; little controlled evidence. **Low-medium.** | Include silent-imagining tasks ("sing the note in your head, then play it") and imitation of short phrases. |
| 12 | **Practice strategies can be taught.** Researchers recommend explicit instruction in practice strategies and have tested whether it transfers to individual practice (Weidner 2020; I could not retrieve its results). | Quasi-experimental design, results not seen. **Low** on effect size. | Add short, in-app "how to practise this" coaching and end-of-session reflection. |

### Where this leaves the product design

The evidence points to a coherent set of choices: short, goal-specific sessions; high trial counts; mixed (interleaved) material across keys; spaced return of what was missed; ear-to-hand tasks rather than tapping answers; imagining and optional singing before playing; fading feedback; and judging progress by delayed, transfer tests rather than by how good a session felt.

Two things the research does **not** settle, and the product should treat as open: whether interleaving and feedback fading help *this* kind of learner (adult guitarists learning functional hearing), and how much ear training transfers to improvisation on guitar.

## 3. The learner's problem

From teacher and practice-community descriptions of the "intermediate plateau":

- Learners know chord shapes and a pentatonic box but see the neck as disconnected boxes. Scales do not turn into music because chords and scales are learned separately.
- They cannot play the same chord or scale in another position or key.
- They can't hear where a progression is going, so improvising "feels like guessing".
- The standard teaching bridge is **targeting chord tones** (root and 3rd first) on the beat at chord changes, with passing scale notes between. Teachers advise starting with chord tones before chord-scale theory.
- The skill teachers keep naming: *hear something in your head, then find it on the guitar.*
- Learners gather theory, riffs and charts from many unrelated sources, so there is no sequence and no feedback loop.

### Why existing tools fall short for learning speed

*(Summary of the v0.1 landscape review; names are for reference, not competition.)*

- **Beginner course apps** (Yousician, Fender Play, Simply Guitar, JustinGuitar) run out of content and are weak on functional hearing and improvisation. A review analysis found pitch detection that mishears correct playing was the top complaint (28% of 1–3 star reviews analysed), which undermines feedback trust.
- **Intermediate video pathways** (Pickup Music, TrueFire) teach the right ideas but are video-led, with little adaptive drilling.
- **Ear trainers** (Functional Ear Trainer, EarMaster, Perfect Ear, Hooktheory Chord Crush, OpenEar) drill hearing well but are generic or piano-centred, and not tied to where notes are on the guitar neck or to playing over changes.
- **Fretboard and chord tools** (FretMaster, Fretboard Master, Guitar Wiz, ChordMuse) cover one piece each.
- I found no single tool that links *key knowledge → functional hearing → finding it on the neck → playing over changes* in one adaptive loop, but I have not tested every competitor hands-on. A teardown is in Phase 0.

## 4. Learner and scope

**Primary learner: the stuck intermediate guitarist.** Has played 1–8 years, knows open and barre chords and a pentatonic shape, wants to understand keys, hear progressions, play by ear and improvise over changes. Plays acoustic or electric, mostly at home.

**Also served:** songwriters who play rhythm and want to know why progressions work; returning players.

**Out of scope for now:** absolute beginners, notation reading, formal conservatory ear-training exams, bass and ukulele, social features, a song-tab library, video lessons.

## 5. Goals and non-goals

**Goals**
- G1. Learners can name the key and the diatonic chords of a song, and hear chord function (I, IV, V, vi and more).
- G2. Learners can hear a short progression or a single note against a chord and find it on the guitar.
- G3. Learners can play a line over a looping progression that lands on chord tones at the changes, including in keys and progressions they have not practised.
- G4. **The same skill level is reached in measurably fewer practice hours than a self-directed baseline** (§7, §9).

**Non-goals**
- No engagement-maximising mechanics. Streaks and rewards are allowed only if they do not distort the learning schedule.
- No absolute-pitch training.
- No advanced jazz harmony in the first release.

## 6. Product principles (derived from §2)

1. **Hear first, label second.** Every concept starts with sound.
2. **Ear to hand.** The main response is playing the answer on the guitar, not tapping a label. Tapping is the fallback.
3. **Many short trials.** Perceptual skill needs volume. A trial should take seconds.
4. **Mixed, spaced, retested.** Interleave skills and keys, bring missed items back, and judge by delayed tests.
5. **Honest, fading feedback.** Say when detection is unsure. Reduce feedback as skill rises, and check that this helps.
6. **Teach the practice, not just the content.** Explain why a drill is arranged as it is.
7. **Always connect to the neck and to music.** Every note shows where it is on the guitar and sounds in a real harmonic context.

## 7. How we will measure a steeper learning curve

These are the product's primary metrics. Each is measured per learner and per skill.

| Metric | Definition | Why it matters |
|---|---|---|
| **Trials-to-criterion** | Number of trials, and minutes, to reach a fixed accuracy (for example 90% on 20 consecutive scale-degree items in a key). | Direct measure of learning speed. |
| **Delayed retention** | Accuracy on a retest 1, 7 and 30 days after criterion, with no practice in between. | Separates real learning from in-session fluency (finding 10). |
| **Transfer** | Accuracy in an unseen key, a new timbre or tempo, and a progression never practised. | Tests whether the skill is functional rather than memorised. |
| **Play-by-ear time** | Time to find a 4-chord progression of an unfamiliar short track on the neck. | A real-world, end-to-end test (G2). |
| **Chord-tone hit rate** | Share of chord changes where the learner is on a chord tone within a time window, over a new progression. | Direct measure of G3. |
| **Learning rate** | Slope of accuracy against cumulative trials, per skill. | Lets us compare practice designs fairly. |
| **Detection reliability** | Share of correct performances the app accepts, and share of wrong ones it accepts, on a test set. | Feedback is only useful if it is right. |

Baselines come from a placement test, and from a "typical self-directed practice" control period for early users (see §9).

## 8. Feature requirements

Priority: **P0** = first build, **P1** = next, **P2** = later. "Mechanism" ties each feature to §2.

### 8.1 Key & Harmony Map (knowing it)

| ID | Requirement | Pri | Mechanism |
|---|---|---|---|
| A1 | Choose any key (major, natural minor). Show scale, diatonic triads and 7ths, and Roman numerals on an interactive fretboard, with sound on every tap. | P0 | #7, #11 |
| A2 | Show each diatonic chord in at least three neck zones, linked to CAGED shapes. | P0 | Teacher consensus on the plateau |
| A3 | Common progressions in any key (I–V–vi–IV, ii–V–I, 12-bar blues, I–vi–IV–V, i–VI–III–VII) with backing audio. | P0 | Material for all drills |
| A4 | Short "why it works" cards, written after the learner has heard the effect. | P1 | #11 |
| A5 | Circle of Fifths linked to the neck; capo and transposition helper. | P1 | Variability across keys (#7) |
| A6 | Modes shown against the parent key. | P2 | None needed in v1 |

### 8.2 Ear Training (hearing it)

| ID | Requirement | Pri | Mechanism |
|---|---|---|---|
| B1 | **Scale degrees in key context.** A cadence sets the key, then a note plays. The learner plays it on the guitar, or taps a number or moveable-do syllable. | P0 | #6, #7 |
| B2 | **Chord function.** Identify chords in a progression by Roman numeral, starting with I, IV, V, vi. Several guitar-like timbres and strum patterns. | P0 | #6 |
| B3 | **Note against chord.** A chord sounds, then a note: root, 3rd, 5th or 7th? This is the bridge to improvisation. | P0 | #6, #11 |
| B4 | **Spot the error.** A progression or line is played with one wrong note or chord. Where is it? | P0 | #2 |
| B5 | **Find it on the neck.** A short melody or 3–4 chord progression plays. The learner finds it by ear, in a key that rotates between trials. No tab shown. | P0 | #7, #3 |
| B6 | **Imagine first.** Optional silent beat (and optional hum or sing) between hearing and playing. | P0 | #3, #8, #11 |
| B7 | Scheduler: interleaves skills and keys, returns missed items at a uniform spacing, adapts difficulty to keep accuracy in a target band. | P0 | #4, #5 |
| B8 | Interval training with song-reference hints, as a support module. | P1 | — |
| B9 | Key-finding from a snippet the learner plays. | P1 | #7 |
| B10 | Real-song clips for progression spotting (licensing to be settled). | P2 | Transfer |

### 8.3 Play Into the Gaps (using it)

| ID | Requirement | Pri | Mechanism |
|---|---|---|---|
| C1 | **Chord-tone ladder** over a looping backing track: target roots, then 3rds, then 5ths and 7ths on chord changes, then add passing scale notes. Targets are highlighted on the neck at first and hidden later. | P0 | #9 (fading), #11 |
| C2 | **Live feedback** from the microphone: were you on a chord tone at the change? A per-bar hit map shown after the take, not during it, by default. | P0 | #9, #10 |
| C3 | Backing-track generator: key, progression, tempo, feel. Always new keys and progressions for transfer testing. | P0 | #4, transfer metric |
| C4 | Call-and-response: a short phrase is played, the learner imitates it by ear, then answers with a phrase of their own. | P1 | #7, #11 |
| C5 | Pentatonic-to-full-scale bridge: which notes the box leaves out and how to land on them. | P1 | Plateau literature |
| C6 | Record and replay a take with a chord-tone overlay. | P2 | #2 |

### 8.4 Practice system (making it stick)

| ID | Requirement | Pri | Mechanism |
|---|---|---|---|
| D1 | **Placement test** (5–8 minutes) that sets level and gives the baseline for §7. | P0 | Measurement |
| D2 | **Session builder**: a 10-minute default (5/10/20): warm-up ear block, one new concept, one play-along. Skills and keys are interleaved, and the goal is stated up front. | P0 | #1, #4 |
| D3 | **Retest sessions** at 1, 7 and 30 days, scheduled automatically, using unseen keys. | P0 | #10, transfer |
| D4 | **Dashboard of delayed and transfer results**, not just today's accuracy. In-session scores are shown smaller, with a note on why. | P0 | #10 |
| D5 | **Practice coaching**: one-line "why this drill is arranged this way" and a 30-second end-of-session reflection (what was hard, what to try next). | P0 | #12 |
| D6 | Free-explore mode, so learners can follow their own interest. | P0 | Motivation |
| D7 | Optional light rewards (for example a weekly goal) that never override the schedule. | P1 | — |
| D8 | English and Spanish interface. | P1 | Access |

### 8.5 Cross-cutting

| ID | Requirement | Pri |
|---|---|---|
| X1 | Standard tuning and left-handed neck view first; alternate tunings later. | P0 / P1 |
| X2 | Audio processed on the device and not stored or uploaded by default. | P0 |
| X3 | Accessibility: dynamic type, colour-blind-safe neck colours, screen-reader labels. | P0 |
| X4 | Offline use for core drills. | P1 |
| X5 | Export of the learner's own results (CSV), so they can check the claims about their own progress. | P1 |

## 9. Learning experiments built into the product

Because the evidence is partial (§2), the app should be able to test its own design choices, per learner and in aggregate if there are enough users.

| Question | Test | Outcome measure |
|---|---|---|
| Does interleaving keys and skills beat blocked practice for this task? | Within-person: alternate weeks or skill pairs between blocked and interleaved scheduling. | Delayed retention and transfer at 7 and 30 days. |
| Does imagine-first (and hum-first) help? | Randomise B6 on and off by item. | Accuracy on the first attempt after the imagining step; trials-to-criterion. |
| Does fading feedback help or hurt? | Full feedback vs feedback on alternate takes for matched play-along items. | Chord-tone hit rate without feedback, at retest. |
| Does ear-to-hand training transfer to improvisation? | Compare chord-tone hit rate over a new progression for learners with more vs less B5 practice, adjusted for total time. | Chord-tone hit rate. |
| Moveable-do vs numbers? | Randomise label scheme at onboarding. | Trials-to-criterion for B1 and B2; preference. |

Early on, the builder and a few friendly users act as the sample. Single-person (n-of-1) experiments are fine for tuning the app but cannot support general claims. Say so in any write-up.

## 10. Technical considerations

- **Platforms:** mobile first (iOS and Android) with native audio modules; web or desktop later for audio-interface users. Framework decision pending.
- **Audio input:** monophonic pitch detection for single-note drills (B1, B3, B5 melody, C1). Polyphonic chord detection is harder because shared harmonics make some chords ambiguous and resolving them adds latency, so it is a separate, riskier workstream. Plan: chord detection as a strum-level event with a confidence score, with tap-to-confirm below a threshold. Detection quality is itself a measured metric (§7).
- **Latency:** visual note-on feedback should feel immediate (target under about 150 ms, to be measured on mid-range Android phones).
- **Audio content:** synthesised or sampled guitar, piano and pad timbres for prompts, plus a programmatic backing-track engine so every key and progression is available. One study found that matching the timbre of the player's own instrument did not significantly help ear-to-hand performance, so a guitar-only sample library is not required.
- **Scheduler:** per-item history with a simple spaced-retrieval schedule and difficulty targeting. Uniform spacing is enough given the evidence (finding 5).
- **Data:** results and settings only; no audio retained.
- **Content rights:** use original or public-domain material in the first release.

## 11. Roadmap

- **Phase 0, validate (4–6 weeks):**
  1. Interview 10–15 intermediate players and 3–5 guitar teachers about their plateau and their current practice.
  2. Hands-on teardown of Cadence: Guitar Theory, Functional Ear Trainer, Chord Crush, Pickup Music and FretMaster.
  3. Prototype detection and measure accuracy and latency on several guitars and phones.
  4. Build a throwaway version of the core loop (B1, B3, B5, C1) and run a 4-week pilot with 5–10 players, with placement test, 7-day and 30-day retests and a baseline period.
- **Phase 1 (first build, about 3–4 months):** A1–A3, B1–B7, C1–C3, D1–D6, X1–X3. Levels 1–3. English only.
- **Phase 2:** Levels 4–6, A4–A5, B8–B9, C4–C5, D7–D8, X4–X5, the experiment harness in §9.
- **Phase 3:** modes, take recording, real-song clips, other instruments.

## 12. Curriculum sketch (to validate with teachers)

| Level | Key knowledge | Ear | Play |
|---|---|---|---|
| 1. One key, three chords | Major key, I–IV–V, roots on the neck | Tonic vs not; I vs IV vs V | Land on the root at each change |
| 2. The whole key | Diatonic triads, relative minor, Roman numerals | Scale degrees 1–5; vi chord | Root and 5th over I–V–vi–IV |
| 3. Chord tones | 3rds and 5ths, major vs minor feel | Note against chord (1/3/5); minor-key hearing | Target 3rds; connect to the pentatonic box |
| 4. Moving through changes | ii–V–I, 12-bar blues, 7th chords | Dominant 7th; ii–V–I by ear | Target 3rds and 7ths; passing notes |
| 5. Beyond the box | Full scale across the neck | Full scale-degree set; borrowed chords | Phrase building; call and response |
| 6. Play by ear | Transposing, capo, key-finding | Dictate short real-song progressions | Learn a melody and its chords by ear |

## 13. Risks and open questions

| Risk | Why it matters | Response |
|---|---|---|
| Evidence does not transfer from classical and lab studies to adult guitarists | Design could rest on weak ground | Phase 0 pilot and the §9 experiments; no claims beyond the data |
| Detection errors | Wrong feedback teaches wrong things and is the top complaint in other apps | Monophonic first, confidence display, tap-to-confirm, a measured reliability metric |
| Interleaving and delayed testing feel harder, so learners may drop them | Learners preferred blocked practice even when interleaving worked better | Explain it in-app, offer an easy mode, and track whether people continue |
| Ear training gains do not reach improvisation | The final goal could be missed | Keep C-pillar tasks in every session and measure chord-tone hit rate in unseen progressions |
| Teaching-sequence errors | Curriculum is my sketch, not teacher-validated | Review with working guitar teachers in Phase 0 |
| Small samples | Early results will be noisy | Report effect sizes with uncertainty; use within-person designs |

**Open questions**
1. Who is the first learner: the builder, a stuck-intermediate friend group, or songwriters? This changes the first drills.
2. Moveable-do or numbers as the default?
3. How good must chord detection be before it replaces tap-to-confirm?
4. Are 100+ trials in 10 minutes realistic on a phone with a real guitar in hand?
5. Who writes and reviews the harmony and curriculum content?
6. Do I add a short "sing it" step by default, or only on request, given that many guitarists dislike singing?

## 14. Sources and confidence

Confidence: **H** well established, **M** several consistent sources or one solid experiment, **L** single, secondary or small-sample source.

| Topic | Confidence | Source |
|---|---|---|
| Strategy quality vs practice time; deliberate practice research | M | Frontiers in Psychology 2021 (trumpet study, citing Duke et al. 2009 and Ericsson et al. 1993); SAGE systematic review of music-practice research |
| Aural schemata needed to monitor errors | L (secondary citation) | MacArthur et al. 2023, citing Hallam 2001 |
| Imagine + sing + play practice | L–M | Frontiers in Psychology 2021, 50 classical trumpet students |
| Interleaved vs blocked practice | M | Carter & Grahn 2016 (10 clarinetists); Veniel-Martí et al. (secondary school, no group difference); Stambaugh studies as summarised in Carter & Grahn |
| Spaced retrieval | M–H for facts | Latimier et al. meta-analysis (29 studies, g = 0.74; expanding vs uniform no difference); Murray, Horner & Göbel 2025 (maths); Dunlosky et al. 2013 via a secondary summary |
| Perceptual learning dose | M | Van Hedger, Heald & Nusbaum 2019, PLOS ONE; University of Surrey absolute-pitch study via ScienceBlog |
| Ear playing and related skills; guitar hearing/modelling vs reading | L–M | McPherson et al. 1997 and Woody & Lehmann 2010 (via Varvarigou & Green); revistas.ufg.br guitar pedagogy study; University of Oregon and University of Michigan theses |
| Feedback and guidance hypothesis | L | Fujii, Lulic & Chen 2016, Frontiers in Neuroscience; sonification review (PMC5486555) |
| Audiation, internalisation, imitation | L–M | Klonoski, Journal of Music Theory Pedagogy; Royal Conservatoire Den Haag guide; Solli, Aksdal & Inderberg 2021 |
| Practice-strategy instruction | L | Weidner 2020, Psychology of Music (results not retrieved) |
| Plateau and chord-tone pedagogy | M (qualitative, teacher consensus) | Hub Guitar, London Guitar Academy, TrueFire, ArtistWorks, JustinGuitar community, JG Music Lessons |
| Detection complaints in learning apps | M | Unstar analysis of 1–3 star reviews, 2026 |
| Competitor features | M | App Store listings, Hooktheory forum, Melbourne Polytechnic aural guide, gitnux |
| "Scale-degree training beats interval-only (Karpinski 2000)" | L (blog claim, not verified against the original; **not relied on**) | The Maestro Online |
