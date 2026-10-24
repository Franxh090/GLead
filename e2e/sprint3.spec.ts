import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, startSession } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Changes: play into the gaps', () => {
  test('a take by tapping the neck scores each change and logs the hit rate', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Changes' }).click();
    await page.getByLabel('Progression').selectOption('I-V-vi-IV');
    await page.getByLabel('Key', { exact: true }).selectOption('G');
    await page.getByRole('group', { name: 'Tempo' }).getByRole('button', { name: '120' }).click();
    await page
      .getByRole('group', { name: 'Passes' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'Start take' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
    // Targets for the roots rung show on the neck while the loop runs.
    await expect(page.locator('[data-testid="marker-root"]').first()).toBeVisible({
      timeout: 10_000,
    });
    // Tap the G at string 6, fret 3 (the root of the first chord) right away.
    await page.locator('[data-cell="s6f3"]').dispatchEvent('pointerdown');
    // One pass of four chords at 120 bpm, four beats each, is eight seconds.
    await expect(page.getByRole('heading', { name: /of changes on a chord tone/ })).toBeVisible({
      timeout: 20_000,
    });
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(5); // header + four changes
    await expect(rows.nth(1)).toContainText('Root');
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('row', { name: /Chord-tone hit rate/ })).toContainText('4 changes');
  });
});

test.describe('Placement', () => {
  test('Today offers the placement test first, and it runs as a measuring session', async ({
    page,
  }) => {
    await page.goto('/');
    const region = page.getByRole('region', { name: 'Placement' });
    await expect(region).toBeVisible();
    await region.getByRole('button', { name: 'Take the placement test' }).click();
    await expect(page.getByText(/Trial 1 of 22/)).toBeVisible();
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '2', exact: true })
      .click();
    await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
    // A placement never re-queues a miss: the total stays at 22.
    await expect(page.getByText(/of 22/)).toBeVisible();
    await page.getByRole('button', { name: 'End session' }).click();
    await expect(page.getByRole('heading', { name: 'Placement done' })).toBeVisible();
    await page.getByRole('button', { name: 'Save and finish' }).click();
    await expect(page.getByRole('region', { name: 'Placement' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Placement baseline' })).toBeVisible();
  });

  test('a practice session still works after placement', async ({ page }) => {
    await page.goto('/');
    await startSession(page);
    await awaitListening(page);
  });
});
