import type { Drill } from '../../core/types';
import { B9View } from './B9View';
import {
  B9_ID,
  B9_RATIONALE,
  B9_SKILLS,
  b9AnswerFromInput,
  b9Audio,
  b9Check,
  b9DescribeAnswer,
  b9FeedbackAudio,
  b9MakePrompt,
  type B9Answer,
  type B9Prompt,
} from './logic';

const progressions: Drill<B9Prompt, B9Answer> = {
  id: B9_ID,
  title: 'Progressions by ear',
  skills: B9_SKILLS.map((s) => s.id),
  inputModes: ['tap', 'mic'],
  rationale: B9_RATIONALE,
  accumulate: true,
  makePrompt: b9MakePrompt,
  audio: b9Audio,
  answerFromInput: b9AnswerFromInput,
  check: b9Check,
  describeAnswer: b9DescribeAnswer,
  feedbackAudio: b9FeedbackAudio,
  render: B9View,
};

export default progressions;
