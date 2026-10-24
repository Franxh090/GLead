import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, startSession } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('B9 progressions by ear', () => {
  test('names the chords in order by numeral and is graded as a sequence', async ({ page }) => {
    await page.goto('/');
    await startSession(page, {
      skills: ['Progressions by ear in a major key'],
      deselectDefault: true,
    });
    await expect(page.getByText(/chords after the cadence/)).toBeVisible();
    await awaitListening(page);
    const numerals = await page.evaluate(() =>
      String(
        document.querySelector('[data-target-numerals]')?.getAttribute('data-target-numerals'),
      ).split(','),
    );
    expect(numerals.length).toBeGreaterThanOrEqual(3);
    expect(numerals[0]).toBe('I');
    const grid = page.getByRole('group', { name: 'Roman numeral' });
    for (const n of numerals.slice(0, -1)) {
      await grid.getByRole('button', { name: n, exact: true }).click();
    }
    await expect(
      page.getByText(`Heard ${numerals.length - 1} of ${numerals.length}.`),
    ).toBeVisible();
    await grid.getByRole('button', { name: numerals[numerals.length - 1]!, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    const slots = page.getByRole('list', { name: 'Your answer' }).getByRole('listitem');
    await expect(slots).toHaveCount(numerals.length);
  });
});

test.describe('Changes: approaches and passing notes', () => {
  test('a take records how each landing was reached and the notes between changes', async ({
    page,
  }) => {
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
    await expect(page.locator('[data-testid="marker-root"]').first()).toBeVisible({
      timeout: 10_000,
    });
    // G lands the first change; the A right after it is a passing note in key.
    await page.locator('[data-cell="s6f3"]').dispatchEvent('pointerdown');
    await page.locator('[data-cell="s6f5"]').dispatchEvent('pointerdown');
    await expect(page.getByRole('heading', { name: /of changes on a chord tone/ })).toBeVisible({
      timeout: 20_000,
    });
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows.nth(0)).toContainText('Approach');
    await expect(rows.nth(1)).toContainText('1 (1 in key)');
    await expect(page.getByText(/1 notes between the changes, 1 in key/)).toBeVisible();
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('row', { name: /Passing notes in key/ })).toContainText('1 notes');
  });
});

test.describe('Progress: cohort view', () => {
  test('several exports open side by side with the experiments pooled', async ({ page }) => {
    const participant = (name: string, imagine: boolean) => ({
      name,
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          app: 'glead',
          format: 1,
          exportedAt: '2026-11-01T10:00:00.000Z',
          trials: Array.from({ length: 4 }, (_, i) => ({
            trialId: `${name}-${i}`,
            sessionId: `${name}-s`,
            at: '2026-10-30T10:00:00.000Z',
            drillId: 'b1-scale-degree',
            itemId: 'degree:1@major',
            skillId: 'B1.major',
            key: 'G',
            mode: 'tap',
            correct: i % 2 === 0,
            expected: '1',
            given: '1',
            responseMs: 900,
            confidence: 1,
            rating: 3,
            imagineFirst: imagine,
            feedbackVariant: 'full',
            experimentArm: 'imagine=random;feedback=full;labels=numbers',
            retest: 'none',
            unseenKey: false,
            purpose: 'practice',
          })),
        }),
      ),
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await page
      .getByLabel('View an export file')
      .setInputFiles([participant('p1.json', true), participant('p2.json', false)]);
    await expect(page.getByRole('heading', { name: 'Cohort: 2 exports' })).toBeVisible();
    const table = page.getByRole('table', { name: 'Cohort: 2 exports' });
    await expect(table.getByRole('row')).toHaveCount(3);
    await expect(table).toContainText('p1.json');
    await expect(table).toContainText('p2.json');
    await expect(page.getByRole('table', { name: /pooled/ })).toContainText(
      'Imagine first: 50% (4 trials, 1 participants)',
    );
    await page.getByRole('button', { name: 'Back to my data' }).click();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  });
});
