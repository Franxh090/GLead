import { expect, test } from '@playwright/test';
import { awaitListening, fakeMicReady, fixArms, startSession, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

interface FakeChords {
  strum(symbol: string, o?: { confidence?: number }): void;
}
type ChordsWindow = Window & { __gleadFakeChords?: true | FakeChords };

async function useFakeChords(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as ChordsWindow).__gleadFakeChords = true;
  });
}
async function strum(page: import('@playwright/test').Page, symbol: string, confidence = 0.9) {
  await page.waitForFunction(() => typeof (window as ChordsWindow).__gleadFakeChords === 'object');
  await page.evaluate(
    ({ symbol, confidence }) =>
      ((window as ChordsWindow).__gleadFakeChords as FakeChords).strum(symbol, { confidence }),
    { symbol, confidence },
  );
}
const targetChord = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    String(document.querySelector('[data-target-chord]')?.getAttribute('data-target-chord')),
  );

test.describe('Offline (D6)', () => {
  test('registers the service worker on first visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)),
      null,
      { timeout: 20_000 },
    );
  });
});

test.describe('Chord hearing (experimental)', () => {
  test('a strummed chord answers B2, and an unsure strum asks for confirmation', async ({
    page,
  }) => {
    await useFakeMic(page);
    await useFakeChords(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('switch', { name: /Hear chords/ }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    // The mic is already on: start the session, then start listening.
    await startSession(page, { skills: ['I, IV, V and vi by ear'], deselectDefault: true });
    await page.getByRole('button', { name: 'Start listening' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Mic on' })).toBeVisible();
    await awaitListening(page);
    await strum(page, await targetChord(page));
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    // The next trial: an unsure strum goes through the confirm gate.
    await expect(page.getByText(/Trial 2 of/)).toBeVisible({ timeout: 10_000 });
    await awaitListening(page);
    await strum(page, await targetChord(page), 0.3);
    const dialog = page.getByRole('alertdialog', { name: 'Confirm what you played' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('30% sure');
    await dialog.getByRole('button', { name: 'Yes, that was it' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
  });

  test('the Mic lab adds a strummed-chord part when chord hearing is on', async ({ page }) => {
    await useFakeMic(page);
    await useFakeChords(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('switch', { name: /Hear chords/ }).click();
    await page.getByRole('button', { name: 'Run the Mic lab (five minutes)' }).click();
    await expect(page.getByText(/8 strummed chords come after the notes/)).toBeVisible();
    await page.getByRole('button', { name: 'Start listening' }).click();
    await page.getByRole('button', { name: 'Begin the note set' }).click();
    await fakeMicReady(page);
    for (let i = 0; i < 32; i++) {
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
            __gleadFakeMic: { play(n: number): void; silence(ms: number): void };
          }
        ).__gleadFakeMic;
        fake.play(m);
        fake.silence(200);
      }, midi);
    }
    for (let i = 1; i <= 8; i++) {
      await expect(page.getByText(`Chord ${i} of 8`)).toBeVisible();
      await page.waitForTimeout(100);
      const symbol = await targetChord(page);
      await strum(page, symbol, 0.8);
    }
    await expect(page.getByText(/of 12 clicks/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('row', { name: /Strummed chords named right/ })).toContainText(
      '100%',
    );
  });
});
