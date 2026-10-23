import type { Drill } from '../../core/types';
import { B4View } from './B4View';
import {
  B4_ID,
  B4_RATIONALE,
  B4_SKILLS,
  b4AnswerFromInput,
  b4Audio,
  b4Check,
  b4DescribeAnswer,
  b4FeedbackAudio,
  b4FeedbackPositions,
  b4MakePrompt,
  type B4Answer,
  type B4Prompt,
} from './logic';

const findMelody: Drill<B4Prompt, B4Answer> = {
  id: B4_ID,
  title: 'Find it on the neck',
  skills: B4_SKILLS.map((s) => s.id),
  inputModes: ['mic', 'tap'],
  rationale: B4_RATIONALE,
  accumulate: true,
  makePrompt: b4MakePrompt,
  audio: b4Audio,
  answerFromInput: b4AnswerFromInput,
  check: b4Check,
  describeAnswer: b4DescribeAnswer,
  feedbackPositions: b4FeedbackPositions,
  feedbackAudio: b4FeedbackAudio,
  render: B4View,
};

export default findMelody;
