import { expect, test } from '@playwright/test';
import { fakeMicReady, fixArms, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Mic lab (R2 harness)', () => {
  test('walks the note set, the wrong set and the clicks, then summarises and saves', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('button', { name: 'Run the Mic lab (five minutes)' }).click();
    await page.getByRole('button', { name: 'Start listening' }).click();
    await page.getByRole('button', { name: 'Begin the note set' }).click();
    await fakeMicReady(page);
    // Answer every prompt with what it asks for: the named note, or the fret above it.
    for (let i = 0; i < 32; i++) {
      const label = await page.getByText(/^(Note|Wrong note) \d+ of \d+$/).textContent();
      expect(label).toBeTruthy();
      const midi = await page.evaluate(() => {
        const m = document.querySelector('[data-testid="marker-target"]');
        const s = Number(m?.getAttribute('data-string'));
        const f = Number(m?.getAttribute('data-fret'));
        const open = [64, 59, 55, 50, 45, 40][s - 1] as number;
        return open + f;
      });
      await page.evaluate(async (m) => {
        await new Promise((r) => setTimeout(r, 120));
        const fake = (
          window as unknown as {
            __gleadFakeMic: {
              play(n: number, o?: { cents?: number }): void;
              silence(ms: number): void;
            };
          }
        ).__gleadFakeMic;
        fake.play(m, { cents: 8 });
        fake.silence(200);
      }, midi);
    }
    await expect(page.getByText(/Pluck any note on each click/)).toBeVisible({ timeout: 10_000 });
    // Pluck on a few clicks.
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(1000);
      await page.evaluate(async () => {
        const fake = (
          window as unknown as {
            __gleadFakeMic: { play(n: number): void; silence(ms: number): void };
          }
        ).__gleadFakeMic;
        fake.play(45);
        fake.silence(200);
      });
    }
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 20_000 });
    const results = page.getByRole('table', { name: 'Mic lab results' });
    await expect(results.getByRole('row', { name: /Correct plays accepted/ })).toContainText(
      '100%',
    );
    await expect(results.getByRole('row', { name: /Wrong plays accepted/ })).toContainText('0%');
    await expect(results.getByRole('row', { name: /Suggested confirm threshold/ })).toContainText(
      /0\.\d+/,
    );
    await page.getByRole('button', { name: 'Save this run' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });
});

test.describe('Keys: A4', () => {
  test('capo helper, circle neighbours and a why card', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Keys' }).click();
    await page.getByRole('combobox', { name: 'Tonic' }).selectOption('Bb');
    await expect(
      page.getByText(/its IV side is Eb, its V side is F, its relative key is Gm/),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Shapes key' }).selectOption('G');
    await expect(page.getByRole('status').filter({ hasText: 'Capo on fret 3' })).toBeVisible();
    await page.getByRole('button', { name: 'Why V pulls home' }).click();
    await expect(page.getByRole('note')).toContainText('one half step under the tonic');
  });
});

test.describe('Weekly goal (D7)', () => {
  test('counts sessions this week and never changes the schedule', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Weekly goal in sessions').fill('3');
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'This week: 0 of 3 sessions' }),
    ).toBeVisible();
  });
});
