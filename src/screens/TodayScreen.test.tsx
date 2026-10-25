import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../test/render';
import { TodayScreen } from './TodayScreen';

describe('TodayScreen', () => {
  it('offers the placement test first and starts a session with the chosen length and skills', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    await renderWithApp(<TodayScreen onStart={onStart} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Take the placement test' })).toBeInTheDocument(),
    );
    const skills = within(screen.getByRole('group', { name: 'Skills' }));
    await user.click(screen.getByRole('button', { name: '10 min' }));
    await user.click(skills.getByRole('button', { name: 'I, IV, V and vi by ear' }));
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    expect(onStart).toHaveBeenCalledWith({
      minutes: 10,
      skillIds: ['B1.major', 'B2.primary'],
      noGuitar: false,
    });
    await user.click(screen.getByRole('button', { name: 'Take the placement test' }));
    expect(onStart).toHaveBeenLastCalledWith(
      expect.objectContaining({ purpose: 'placement', minutes: 6 }),
    );
  });

  it('without a guitar, the ear-to-hand skills wait and the session is tap-only', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    await renderWithApp(<TodayScreen onStart={onStart} />);
    const skills = within(screen.getByRole('group', { name: 'Skills' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Guitar' })).getByRole('button', {
        name: 'Not now',
      }),
    );
    await waitFor(() =>
      expect(skills.getByRole('button', { name: 'Melodies by ear in a major key' })).toBeDisabled(),
    );
    expect(skills.getByRole('button', { name: 'Scale degrees in a major key' })).toBeEnabled();
    expect(screen.getByText(/wait for the guitar/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ noGuitar: true }));
  });
});
