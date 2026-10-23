import type { Drill, InputEvent } from '../../core/types';
import { B3View } from './B3View';
import {
  B3_ID,
  B3_RATIONALE,
  B3_SKILLS,
  b3AnswerFromInput,
  b3Audio,
  b3Check,
  b3DescribeAnswer,
  b3FeedbackAudio,
  b3FeedbackPositions,
  b3MakePrompt,
  type B3Answer,
  type B3Prompt,
  type ChordTone,
} from './logic';

/** The tone buttons send their tone as `degree` (1, 3, 5, 7); the neck and the mic send a pitch. */
function answerFromInput(prompt: B3Prompt, event: InputEvent): B3Answer | null {
  if (event.kind === 'tap' && event.degree !== undefined && !event.position) {
    const tone = String(event.degree) as ChordTone;
    return prompt.tones.includes(tone) ? { tone } : null;
  }
  return b3AnswerFromInput(prompt, event);
}

const chordTone: Drill<B3Prompt, B3Answer> = {
  id: B3_ID,
  title: 'Note against chord',
  skills: B3_SKILLS.map((s) => s.id),
  inputModes: ['mic', 'tap'],
  rationale: B3_RATIONALE,
  makePrompt: b3MakePrompt,
  audio: b3Audio,
  answerFromInput,
  check: b3Check,
  describeAnswer: b3DescribeAnswer,
  feedbackPositions: b3FeedbackPositions,
  feedbackAudio: b3FeedbackAudio,
  render: B3View,
};

export default chordTone;
