import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, startSession } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

const exportFile = (name: string, ids: string[]) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(
    JSON.stringify({
      app: 'glead',
      format: 1,
      exportedAt: '2026-11-01T10:00:00.000Z',
      settings: [{ key: 'singleton', labelScheme: 'moveable-do' }],
      trials: ids.map((id) => ({
        trialId: id,
        sessionId: `s-${id}`,
        at: '2026-10-30T10:00:00.000Z',
        drillId: 'b1-scale-degree',
        itemId: 'degree:1@major',
        skillId: 'B1.major',
        key: 'G',
        mode: 'tap',
        correct: true,
        expected: '1',
        given: '1',
        responseMs: 900,
        confidence: 1,
        rating: 3,
        imagineFirst: false,
        feedbackVariant: 'full',
        experimentArm: 'imagine=setting;feedback=full;labels=numbers',
        retest: 'none',
        unseenKey: false,
        purpose: 'practice',
      })),
      sessions: ids.map((id) => ({
        sessionId: `s-${id}`,
        startedAt: '2026-10-30T10:00:00.000Z',
        endedAt: '2026-10-30T10:05:00.000Z',
        minutes: 5,
        trials: 1,
        correct: 1,
        reflection: '',
        kind: 'practice',
      })),
    }),
  ),
});

test.describe('Keep the data (D6)', () => {
  test('restores an export on a device that already has data, by id, and twice adds nothing', async ({
    page,
  }) => {
    await page.goto('/');
    await startSession(page);
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('button', { name: 'Save and finish' }).click();
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByText(/over 1 trials/)).toBeVisible();
    await page
      .getByLabel('Restore from an export')
      .setInputFiles(exportFile('backup.json', ['r1', 'r2']));
    await expect(
      page.getByRole('status').filter({ hasText: 'Restored: 2 trials, 2 sessions' }),
    ).toBeVisible();
    await expect(page.getByText(/Your settings were kept/)).toBeVisible();
    await expect(page.getByText(/over 3 trials/)).toBeVisible();
    await page
      .getByLabel('Restore from an export')
      .setInputFiles(exportFile('backup.json', ['r1', 'r2']));
    await expect(
      page.getByRole('status').filter({ hasText: 'Restored: 0 trials, 0 sessions' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText(/3 trials, 3 sessions and \d+ cards on this device/)).toBeVisible();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /keep your data|clear your data|will keep your data/ }),
    ).toBeVisible();
  });

  test('a fresh device takes the settings from the file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await page
      .getByLabel('Restore from an export')
      .setInputFiles(exportFile('old-phone.json', ['a']));
    await expect(page.getByText(/Settings came from the file/)).toBeVisible();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('button', { name: 'do re mi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('With and without a guitar', () => {
  test('Today separates ear-only skills from ear-to-hand ones and runs tap-only without a guitar', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    const skills = page.getByRole('group', { name: 'Skills' });
    await expect(skills).toContainText('Ear only, no guitar needed');
    await expect(skills).toContainText('Guitar in hand');
    await page
      .getByRole('group', { name: 'Guitar' })
      .getByRole('button', { name: 'Not now' })
      .click();
    await expect(
      skills.getByRole('button', { name: 'Melodies by ear in a major key' }),
    ).toBeDisabled();
    await expect(
      skills.getByRole('button', { name: 'Scale degrees in a major key' }),
    ).toBeEnabled();
    await expect(page.getByText(/wait for the guitar/)).toBeVisible();
    await page.getByRole('button', { name: '10 min' }).click();
    await page.getByRole('button', { name: 'Start session' }).click();
    const goal = page.getByRole('region', { name: 'Session goal' });
    await expect(goal).not.toContainText('over a loop');
    await goal.getByRole('button', { name: 'Begin' }).click();
    // Mic on in Settings, yet no listening button: the session is tap-only.
    await awaitListening(page);
    await expect(page.getByRole('button', { name: 'Start listening' })).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('group', { name: 'Guitar' }).getByRole('button', { name: 'Not now' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
