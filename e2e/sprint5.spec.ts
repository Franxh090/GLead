import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, startSession } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Keys (A1, A2)', () => {
  test('shows the scale by degree, then a chord with its tones and three zones', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Keys' }).click();
    await page.getByRole('combobox', { name: 'Tonic' }).selectOption('D');
    await expect(page.getByText(/D major: the scale by degree/)).toBeVisible();
    await expect(page.locator('[data-testid="marker-root"]').first()).toBeVisible();
    const table = page.getByRole('table', { name: 'Diatonic chords' });
    await expect(table).toContainText('F♯m');
    await table.getByRole('button', { name: 'V', exact: true }).click();
    await expect(page.getByText(/V A: root square, 3rd circle, 5th triangle/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Three places to play A' })).toBeVisible();
    await expect(page.getByRole('button', { name: /shape at fret \d+, tap to hear/ })).toHaveCount(
      3,
    );
    await page.locator('[data-cell="s5f0"]').first().dispatchEvent('pointerdown');
    await expect(page.getByRole('status')).toContainText(/A2: degree 5/);
    await page.getByRole('button', { name: 'Back to the scale' }).click();
    await expect(page.getByRole('heading', { name: /Three places/ })).toHaveCount(0);
  });
});

test.describe('Progress: export viewer', () => {
  test('loads an export file read-only and returns to own data', async ({ page }) => {
    await page.goto('/');
    await startSession(page);
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('button', { name: 'Save and finish' }).click();
    await page.getByRole('button', { name: 'Progress' }).click();
    const file = {
      name: 'participant-3.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          app: 'glead',
          format: 1,
          exportedAt: '2026-11-01T10:00:00.000Z',
          trials: Array.from({ length: 6 }, (_, i) => ({
            trialId: `t${i}`,
            sessionId: 's1',
            at: '2026-10-30T10:00:00.000Z',
            drillId: 'b2-chord-function',
            itemId: 'function:IV@major',
            skillId: 'B2.primary',
            key: 'Bb',
            mode: 'tap',
            correct: i % 2 === 0,
            expected: 'IV',
            given: i % 2 === 0 ? 'IV' : 'V',
            responseMs: 900,
            confidence: 1,
            rating: 3,
            imagineFirst: false,
            feedbackVariant: 'full',
            experimentArm: 'imagine=setting;feedback=full;labels=numbers',
            retest: '7d',
            unseenKey: true,
            purpose: 'retest',
          })),
        }),
      ),
    };
    await page.getByLabel('View an export file').setInputFiles(file);
    await expect(page.getByRole('status').filter({ hasText: 'participant-3.json' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Retest after 7 days/ })).toContainText('50%');
    await expect(page.getByRole('table', { name: 'Skills' })).toContainText(
      'I, IV, V and vi by ear',
    );
    await page.getByRole('button', { name: 'Back to my data' }).click();
    await expect(page.getByRole('row', { name: /Retest after 7 days/ })).toContainText('—');
    await expect(page.getByText(/over 1 trials/)).toBeVisible();
  });
});

test.describe('Today: schedule note', () => {
  test('says which schedule this week runs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/This week's practice is interleaved/)).toBeVisible();
  });
});
