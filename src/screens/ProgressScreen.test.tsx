import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { TrialEvent } from '../core/types';
import { renderWithApp } from '../test/render';
import { ProgressScreen } from './ProgressScreen';

const trial = (id: string, correct = true): TrialEvent => ({
  trialId: id,
  sessionId: `s-${id}`,
  at: new Date('2026-10-22T10:00:00Z'),
  drillId: 'b1-scale-degree',
  itemId: 'degree:1@major',
  skillId: 'B1.major',
  key: 'G',
  mode: 'tap',
  correct,
  expected: '1',
  given: '1',
  responseMs: 800,
  confidence: 1,
  rating: Rating.Good,
  imagineFirst: false,
  feedbackVariant: 'full',
  experimentArm: 'default',
  retest: 'none',
  unseenKey: false,
  purpose: 'practice',
});

describe('ProgressScreen', () => {
  it('computes the numbers from the log and restores an export by id', async () => {
    const user = userEvent.setup();
    const { services } = await renderWithApp(<ProgressScreen />);
    await services.repo.logTrial(trial('a'));
    // The screen loaded before the trial existed; a restore refreshes it.
    const file = new File(
      [
        JSON.stringify({
          app: 'glead',
          format: 1,
          exportedAt: '2026-10-23T00:00:00.000Z',
          trials: [trial('a'), trial('b', false)],
          sessions: [],
        }),
      ],
      'backup.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText('Restore from an export'), file);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Restored: 1 trials/));
    expect(screen.getByText(/Your settings were kept/)).toBeInTheDocument();
    expect(screen.getByText(/over 2 trials/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Skills' })).toHaveTextContent(
      'Scale degrees in a major key',
    );
    expect((await services.repo.trials()).map((t) => t.trialId).sort()).toEqual(['a', 'b']);
  });
});
