import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../core/i18n';
import { renderWithApp } from '../test/render';
import { SettingsScreen } from './SettingsScreen';

afterEach(() => setLanguage('en'));

describe('SettingsScreen', () => {
  it('turns the microphone on, reveals the chord toggle, and switches language', async () => {
    const user = userEvent.setup();
    const { services } = await renderWithApp(<SettingsScreen />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    const mic = screen.getByRole('switch', { name: 'Answer on the guitar (microphone)' });
    expect(mic).toHaveAttribute('aria-checked', 'false');
    await user.click(mic);
    expect(services.settings.get().micEnabled).toBe(true);
    expect(screen.getByRole('switch', { name: /Hear chords/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Español' }));
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(services.settings.get().language).toBe('es');
  });

  it('shows what this device holds and whether the browser will keep it', async () => {
    const { services } = await renderWithApp(<SettingsScreen />);
    await services.repo.saveSession({
      sessionId: 's1',
      startedAt: new Date(),
      endedAt: new Date(),
      minutes: 5,
      trials: 3,
      correct: 2,
      reflection: '',
      kind: 'practice',
    });
    // jsdom has no Storage API: the honest answer is "unknown".
    await waitFor(() =>
      expect(screen.getByText(/does not say whether it will keep your data/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/0 trials, 0 sessions and 0 cards/)).toBeInTheDocument();
  });
});
