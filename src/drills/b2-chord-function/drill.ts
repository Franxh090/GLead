import type { Drill, InputEvent } from '../../core/types';
import { B2View } from './B2View';
import {
  B2_ID,
  B2_RATIONALE,
  B2_SKILLS,
  b2AnswerFromInput,
  b2Audio,
  b2Check,
  b2DescribeAnswer,
  b2FeedbackAudio,
  b2FeedbackPositions,
  b2MakePrompt,
  type B2Answer,
  type B2Prompt,
} from './logic';

/** The numeral buttons send their 1-based index as `degree`; the neck and the mic send a pitch. */
function answerFromInput(prompt: B2Prompt, event: InputEvent): B2Answer | null {
  if (event.kind === 'tap' && event.degree !== undefined && !event.position) {
    const numeral = prompt.choices[event.degree - 1];
    return numeral ? { numeral } : null;
  }
  return b2AnswerFromInput(prompt, event);
}

const chordFunction: Drill<B2Prompt, B2Answer> = {
  id: B2_ID,
  title: 'Chord function',
  skills: B2_SKILLS.map((s) => s.id),
  inputModes: ['tap', 'mic'],
  rationale: B2_RATIONALE,
  makePrompt: b2MakePrompt,
  audio: b2Audio,
  answerFromInput,
  check: b2Check,
  describeAnswer: b2DescribeAnswer,
  feedbackPositions: b2FeedbackPositions,
  feedbackAudio: b2FeedbackAudio,
  render: B2View,
};

export default chordFunction;
