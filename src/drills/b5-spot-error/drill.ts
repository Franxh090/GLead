import type { Drill } from '../../core/types';
import { B5View } from './B5View';
import {
  B5_ID,
  B5_RATIONALE,
  B5_SKILLS,
  b5AnswerFromInput,
  b5Audio,
  b5Check,
  b5DescribeAnswer,
  b5FeedbackAudio,
  b5MakePrompt,
  type B5Answer,
  type B5Prompt,
} from './logic';

const spotError: Drill<B5Prompt, B5Answer> = {
  id: B5_ID,
  title: 'Spot the error',
  skills: B5_SKILLS.map((s) => s.id),
  inputModes: ['tap'],
  rationale: B5_RATIONALE,
  makePrompt: b5MakePrompt,
  audio: b5Audio,
  answerFromInput: b5AnswerFromInput,
  check: b5Check,
  describeAnswer: b5DescribeAnswer,
  feedbackAudio: b5FeedbackAudio,
  render: B5View,
};

export default spotError;
