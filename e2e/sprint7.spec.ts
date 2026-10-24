import { expect, test } from '@playwright/test';
import { awaitListening, fakeMicReady, fixArms, startSession, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Spanish (D7)', () => {
  test('switching the language translates the interface and a drill', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page
      .getByRole('group', { name: 'Language' })
      .getByRole('button', { name: 'Español' })
      .click();
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
    await page.getByRole('button', { name: 'Hoy' }).click();
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    await page.getByRole('button', { name: '5 min' }).click();
    await page.getByRole('button', { name: 'Empezar sesión' }).click();
    await page
      .getByRole('region', { name: 'Session goal' })
      .getByRole('button', { name: 'Empezar' })
      .click();
    await expect(page.getByText(/Escucha y luego toca la nota que oíste/)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Escuchando' })).toBeVisible({
      timeout: 20_000,
    });
    await page
      .getByRole('group', { name: 'Grado de la escala' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await expect(page.getByRole('status').filter({ hasText: /Correcto|Era/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible();
  });
});

test.describe('Alternate tunings (D7)', () => {
  test('drop D moves the low string on every neck', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('combobox', { name: 'Tuning' }).selectOption('drop-d');
    await page.getByRole('button', { name: 'Keys' }).click();
    await page.getByRole('combobox', { name: 'Tonic' }).selectOption('D');
    // In drop D the open sixth string is the tonic: a root square at string 6, fret 0.
    await expect(
      page.locator('[data-testid="marker-root"][data-string="6"][data-fret="0"]'),
    ).toHaveCount(1);
    // CAGED zones are standard-tuning grips, so none are offered.
    await page
      .getByRole('table', { name: 'Diatonic chords' })
      .getByRole('button', { name: 'I', exact: true })
      .click();
    await expect(page.getByText(/No CAGED shape/)).toBeVisible();
  });
});

test.describe('B8', () => {
  test('intervals by ear with a song hint', async ({ page }) => {
    await page.goto('/');
    await startSession(page, {
      skills: ['Intervals by ear: 3rds, 4ths, 5ths, octave'],
      deselectDefault: true,
    });
    await expect(page.getByText(/Two notes, the second above the first/)).toBeVisible();
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Interval' })
      .getByRole('button', { name: 'perfect 5th' })
      .click();
    await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
    await expect(page.getByText(/Think of /)).toBeVisible();
  });

  test('find my key from a played phrase', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await page.getByRole('button', { name: 'Keys' }).click();
    await page.getByRole('button', { name: 'Listen for a phrase' }).click();
    await fakeMicReady(page);
    await page.evaluate(async () => {
      const fake = (
        window as unknown as {
          __gleadFakeMic: { play(n: number): void; silence(ms: number): void };
        }
      ).__gleadFakeMic;
      await new Promise((r) => setTimeout(r, 150));
      for (const m of [55, 57, 59, 60, 62, 64, 66, 67, 62, 55]) {
        fake.play(m);
        fake.silence(150);
      }
    });
    await page.getByRole('button', { name: /Done, which key\? \(10\)/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Best fit: G major' })).toBeVisible();
  });
});
