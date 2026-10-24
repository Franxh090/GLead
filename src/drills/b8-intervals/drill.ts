import type { Drill } from '../../core/types';
import { B8View } from './B8View';
import {
  B8_ID,
  B8_RATIONALE,
  B8_SKILLS,
  b8AnswerFromInput,
  b8Audio,
  b8Check,
  b8DescribeAnswer,
  b8FeedbackAudio,
  b8MakePrompt,
  type B8Answer,
  type B8Prompt,
} from './logic';

const intervals: Drill<B8Prompt, B8Answer> = {
  id: B8_ID,
  title: 'Intervals',
  skills: B8_SKILLS.map((s) => s.id),
  inputModes: ['tap'],
  rationale: B8_RATIONALE,
  makePrompt: b8MakePrompt,
  audio: b8Audio,
  answerFromInput: b8AnswerFromInput,
  check: b8Check,
  describeAnswer: b8DescribeAnswer,
  feedbackAudio: b8FeedbackAudio,
  render: B8View,
};

export default intervals;
