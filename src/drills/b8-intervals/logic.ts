/**
 * B8 "Intervals" (PRD B8, a support module): two notes rise, the learner
 * names the interval, and the feedback gives the song whose opening leaps
 * it, the hook most guitarists already know. Tap-only: the interval name
 * is the answer, not a pitch.
 */
import {
  intervalInfo,
  midiToFretNote,
  type AccidentalPref,
  type IntervalName,
} from '../../vendor/fretfree/theory';
import { displayPc } from '../../vendor/fretfree/theory/pitch-display';
import { noteName } from '../../audio/voicing';
import { pick } from '../../core/keys';
import type {
  AudioStep,
  Check,
  DrillContext,
  Feedback,
  InputEvent,
  Item,
  Skill,
} from '../../core/types';

export const B8_ID = 'b8-intervals';
export const B8_RATIONALE =
  'An interval is a distance you can hear before you can name it. The song hints are scaffolding: once the sound is yours, you will not need them.';

export const B8_STAGES = {
  'intervals-1': ['P4', 'P5', 'P8', 'M3', 'm3'],
  'intervals-2': ['m2', 'M2', 'm6', 'M6', 'TT', 'm7', 'M7'],
} as const satisfies Record<string, readonly IntervalName[]>;
export type B8Stage = keyof typeof B8_STAGES;

export const B8_SKILLS: readonly (Skill & { mode: 'major' })[] = [
  {
    id: 'B8.intervals-1',
    title: 'Intervals by ear: 3rds, 4ths, 5ths, octave',
    drillId: B8_ID,
    mode: 'major',
    items: () => b8Items('intervals-1'),
  },
  {
    id: 'B8.intervals-2',
    title: 'Intervals by ear: 2nds, 6ths, 7ths, tritone',
    drillId: B8_ID,
    mode: 'major',
    items: () => b8Items('intervals-2'),
  },
];

/** A song whose opening rises by the interval. */
export const SONG_HINTS: Record<IntervalName, string> = {
  P1: 'the same note twice',
  m2: 'the Jaws theme',
  M2: 'Happy Birthday',
  m3: 'Greensleeves',
  M3: 'Oh When the Saints',
  P4: 'Here Comes the Bride',
  TT: 'The Simpsons',
  P5: 'Twinkle Twinkle Little Star',
  m6: 'The Entertainer (the third and fourth notes)',
  M6: 'My Bonnie Lies Over the Ocean',
  m7: 'Somewhere (West Side Story)',
  M7: 'Take On Me',
  P8: 'Somewhere Over the Rainbow',
};

export function b8ItemId(interval: IntervalName): string {
  return `interval:${interval}:up`;
}

export function parseB8Item(id: string): { interval: IntervalName } | null {
  const m = /^interval:([A-Za-z0-9]+):up$/.exec(id);
  if (!m) return null;
  const name = m[1] as IntervalName;
  return Object.values(B8_STAGES).some((s) => (s as readonly string[]).includes(name))
    ? { interval: name }
    : null;
}

export function b8Items(stage: B8Stage): Item[] {
  return B8_STAGES[stage].map((i) => ({ id: b8ItemId(i), skillId: `B8.${stage}` }));
}

/** The choices offered: the whole stage the item belongs to, so no button gives it away. */
export function b8Choices(interval: IntervalName): IntervalName[] {
  const stage = (Object.keys(B8_STAGES) as B8Stage[]).find((s) =>
    (B8_STAGES[s] as readonly string[]).includes(interval),
  );
  return [...(stage ? B8_STAGES[stage] : B8_STAGES['intervals-1'])];
}

export const B8_LOW = { from: 48, to: 60 } as const;
export const B8_TIMING = { gapS: 0.8, noteS: 1.4 } as const;

export interface B8Prompt {
  itemId: string;
  interval: IntervalName;
  lowMidi: number;
  highMidi: number;
  choices: IntervalName[];
  accidentalPref: AccidentalPref;
}

export interface B8Answer {
  interval: IntervalName;
}

export function b8MakePrompt(item: Item, ctx: DrillContext): B8Prompt {
  const ref = parseB8Item(item.id);
  if (!ref) throw new Error(`B8 cannot test item ${item.id}`);
  const lowMidi = B8_LOW.from + pick(B8_LOW.to - B8_LOW.from + 1, ctx.rng);
  return {
    itemId: item.id,
    interval: ref.interval,
    lowMidi,
    highMidi: lowMidi + intervalInfo(ref.interval).semitones,
    choices: b8Choices(ref.interval),
    accidentalPref: ctx.accidentalPref,
  };
}

export function b8Audio(prompt: B8Prompt): AudioStep[] {
  return [
    {
      type: 'notes',
      notes: [
        noteName(prompt.lowMidi, prompt.accidentalPref),
        noteName(prompt.highMidi, prompt.accidentalPref),
      ],
      gapS: B8_TIMING.gapS,
      durationS: B8_TIMING.noteS,
    },
  ];
}

export function b8AnswerFromInput(prompt: B8Prompt, event: InputEvent): B8Answer | null {
  if (event.kind !== 'tap' || event.degree === undefined) return null;
  const interval = prompt.choices[event.degree - 1];
  return interval ? { interval } : null;
}

export function b8Check(prompt: B8Prompt, answer: B8Answer): Check {
  const expected = `${intervalInfo(prompt.interval).long} (${displayPc(midiToFretNote(prompt.lowMidi).pc)} to ${displayPc(midiToFretNote(prompt.highMidi).pc)})`;
  const given = intervalInfo(answer.interval).long;
  const correct = answer.interval === prompt.interval;
  return correct
    ? { correct, expected, given }
    : { correct, expected, given, confusedWith: answer.interval };
}

export function b8DescribeAnswer(answer: B8Answer): string {
  return intervalInfo(answer.interval).long;
}

/** After a miss: the right interval, then the one named, from the same low note. */
export function b8FeedbackAudio(prompt: B8Prompt, fb: Feedback<B8Answer>): AudioStep[] {
  if (fb.check.correct) return [];
  const low = noteName(prompt.lowMidi, prompt.accidentalPref);
  return [
    {
      type: 'notes',
      notes: [low, noteName(prompt.highMidi, prompt.accidentalPref)],
      gapS: B8_TIMING.gapS,
      durationS: 1.1,
    },
    { type: 'rest', ms: 400 },
    {
      type: 'notes',
      notes: [
        low,
        noteName(
          prompt.lowMidi + intervalInfo(fb.answer.interval).semitones,
          prompt.accidentalPref,
        ),
      ],
      gapS: B8_TIMING.gapS,
      durationS: 1.1,
    },
  ];
}

export function b8Hint(interval: IntervalName): string {
  return SONG_HINTS[interval];
}
