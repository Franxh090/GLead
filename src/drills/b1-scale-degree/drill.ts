import type { Drill } from '../../core/types';
import { B1View } from './B1View';
import {
  B1_ID,
  B1_RATIONALE,
  B1_SKILLS,
  b1AnswerFromInput,
  b1Audio,
  b1Check,
  b1DescribeAnswer,
  b1FeedbackAudio,
  b1FeedbackPositions,
  b1MakePrompt,
  type B1Answer,
  type B1Prompt,
} from './logic';

const scaleDegree: Drill<B1Prompt, B1Answer> = {
  id: B1_ID,
  title: 'Scale degree in key',
  skills: B1_SKILLS.map((s) => s.id),
  inputModes: ['mic', 'tap'],
  rationale: B1_RATIONALE,
  makePrompt: b1MakePrompt,
  audio: b1Audio,
  answerFromInput: b1AnswerFromInput,
  check: b1Check,
  describeAnswer: b1DescribeAnswer,
  feedbackPositions: b1FeedbackPositions,
  feedbackAudio: b1FeedbackAudio,
  render: B1View,
};

export default scaleDegree;
