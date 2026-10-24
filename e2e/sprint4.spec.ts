import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, playNotes, startSession, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

/** A practice session now opens on its goal; tap Begin to start the trials. */
async function begin(page: import('@playwright/test').Page) {
  const goal = page.getByRole('region', { name: 'Session goal' });
  await expect(goal).toBeVisible();
  await goal.getByRole('button', { name: 'Begin' }).click();
}

test.describe('Session shape (D2)', () => {
  test('states the goal up front and offers the play-along after a 10-minute session', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '10 min' }).click();
    await page.getByRole('button', { name: 'Start session' }).click();
    await expect(page.getByRole('region', { name: 'Session goal' })).toContainText(
      /new: Scale degrees in a major key, then 2 minutes over a loop/,
    );
    await begin(page);
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('button', { name: 'Save, then 2 minutes over a loop' }).click();
    await expect(page.getByRole('heading', { name: 'Changes' })).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: "Your session's play-along" }),
    ).toBeVisible();
  });
});

test.describe('B4 find it on the neck', () => {
  test('collects the melody note by note through the mic and grades the sequence', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startSession(page, {
      mic: true,
      skills: ['Melodies by ear in a major key'],
      deselectDefault: true,
    });
    await expect(page.getByText(/notes\. Listen, then play them back in order/)).toBeVisible();
    await awaitListening(page);
    const midis = await page.evaluate(() =>
      String(document.querySelector('[data-target-midis]')?.getAttribute('data-target-midis'))
        .split(',')
        .map(Number),
    );
    expect(midis.length).toBeGreaterThanOrEqual(3);
    await playNotes(page, midis.slice(0, -1));
    await expect(page.getByText(`Heard ${midis.length - 1} of ${midis.length}.`)).toBeVisible();
    await playNotes(page, [midis[midis.length - 1]!]);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
  });
});

test.describe('B5 spot the error', () => {
  test('tapping the wrong slot is graded and explained', async ({ page }) => {
    await page.goto('/');
    await startSession(page, {
      skills: ['Spot the wrong chord or note (major)'],
      deselectDefault: true,
    });
    await awaitListening(page);
    const wrongAt = await page.evaluate(() =>
      Number(document.querySelector('[data-wrong-at]')?.getAttribute('data-wrong-at')),
    );
    const group = page.getByRole('group', { name: /Which (chord|note)/ });
    await group.getByRole('button').nth(wrongAt).click();
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    await expect(page.getByText(/played .* instead of|was .* instead of/)).toBeVisible();
  });
});

test.describe('Dashboard (D4)', () => {
  test('shows the per-skill report and the experiment arms', async ({ page }) => {
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
    await expect(page.getByRole('table', { name: 'Skills' })).toContainText(
      'Scale degrees in a major key',
    );
    await expect(page.getByRole('table', { name: 'Experiments' })).toContainText('Imagine first');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText(/Drawn once at first run/)).toBeVisible();
  });
});
