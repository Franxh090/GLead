import { expect, test } from '@playwright/test';
import { fixArms, playNotes, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Songs by ear (level 6)', () => {
  test('learns a phrase: melody played back through the mic, then its chords named in order', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('button', { name: 'Songs' }).click();
    await expect(page.getByRole('region', { name: 'Ode to Joy' })).toContainText(
      '0 of 4 phrases learned',
    );
    await page
      .getByRole('region', { name: 'Ode to Joy' })
      .getByRole('button', { name: 'Learn' })
      .click();
    await page.getByRole('button', { name: 'Start listening' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Mic on' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Phrase 1 of 4/ })).toBeVisible();
    await page.getByRole('button', { name: 'Hear the melody' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Listening' })).toBeVisible({
      timeout: 25_000,
    });
    const midis = await page.evaluate(() =>
      String(document.querySelector('[data-target-midis]')?.getAttribute('data-target-midis'))
        .split(',')
        .map(Number),
    );
    expect(midis).toHaveLength(8);
    await playNotes(page, midis);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    await page.getByRole('button', { name: 'On to the chords' }).click();
    await page.getByRole('button', { name: 'Hear the chords' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Listening' })).toBeVisible({
      timeout: 20_000,
    });
    const numerals = await page.evaluate(() =>
      String(
        document.querySelector('[data-target-numerals]')?.getAttribute('data-target-numerals'),
      ).split(','),
    );
    expect(numerals).toEqual(['I', 'V']);
    const grid = page.getByRole('group', { name: 'Roman numeral' });
    for (const n of numerals) await grid.getByRole('button', { name: n, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    await page.getByRole('button', { name: 'Next phrase' }).click();
    await expect(page.getByRole('heading', { name: /Phrase 2 of 4/ })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Phrases' })).toContainText('1 ✓');
    await page.getByRole('button', { name: 'All songs' }).click();
    await expect(page.getByRole('region', { name: 'Ode to Joy' })).toContainText(
      '1 of 4 phrases learned',
    );
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('row', { name: /Song phrases by ear/ })).toContainText('2 trials');
  });
});

test.describe('Changes: the phrase rung', () => {
  test('offers the phrase rung with its hint', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Changes' }).click();
    await page
      .getByRole('group', { name: 'Rung' })
      .getByRole('button', { name: 'Phrases' })
      .click();
    await expect(page.getByText(/reached by step: the note before the change/)).toBeVisible();
  });
});
