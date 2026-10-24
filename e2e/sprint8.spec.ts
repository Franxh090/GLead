import { expect, test } from '@playwright/test';
import { awaitListening, fixArms, playNotes, startSession, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('C4 call and response', () => {
  test('after a copied melody the learner answers with a phrase, which is logged as a take', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startSession(page, {
      mic: true,
      skills: ['Melodies by ear in a major key'],
      deselectDefault: true,
    });
    await awaitListening(page);
    const midis = await page.evaluate(() =>
      String(document.querySelector('[data-target-midis]')?.getAttribute('data-target-midis'))
        .split(',')
        .map(Number),
    );
    await playNotes(page, midis);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    // The response panel holds the session: no auto-advance.
    const turn = page.getByRole('region', { name: 'Your turn' });
    await expect(turn).toBeVisible();
    await turn.getByRole('button', { name: 'Answer with a phrase' }).click();
    await expect(
      turn.getByRole('status').filter({ hasText: 'Listening for your answer' }),
    ).toBeVisible({ timeout: 20_000 });
    // Three notes of the call again: in key, inside the box or not, never a stray.
    await playNotes(page, [midis[0]!, midis[1]!, midis[0]!]);
    await expect(turn.getByRole('status').filter({ hasText: '3 of 8 notes' })).toBeVisible();
    await turn.getByRole('button', { name: 'Done' }).click();
    await expect(
      turn.getByRole('status').filter({ hasText: /In key, all 3 notes|All 3 notes in key/ }),
    ).toBeVisible();
    await turn.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Trial 2 of/)).toBeVisible();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('button', { name: 'Save and finish' }).click();
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('row', { name: /Responses in key/ })).toContainText('1 takes');
  });

  test('can be turned off in Settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const toggle = page.getByRole('switch', { name: 'Call and response after each melody' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Spanish everywhere (D7)', () => {
  test('the Mic lab, Progress, Keys, Changes and Loops read in Spanish', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page
      .getByRole('group', { name: 'Language' })
      .getByRole('button', { name: 'Español' })
      .click();
    await page.getByRole('switch', { name: 'Responder con la guitarra (micrófono)' }).click();
    await page
      .getByRole('button', { name: 'Ejecutar el laboratorio de micro (cinco minutos)' })
      .click();
    await expect(page.getByRole('heading', { name: 'Laboratorio de micro' })).toBeVisible();
    await expect(page.getByText(/Unos cinco minutos, con tu guitarra/)).toBeVisible();
    await page.getByRole('button', { name: 'Progreso' }).click();
    await expect(page.getByText('Reevaluación al día')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Experimentos' })).toBeVisible();
    await page.getByRole('button', { name: 'Tonalidades' }).click();
    await page.getByRole('button', { name: 'Por qué el V tira hacia casa' }).click();
    await expect(page.getByRole('note')).toContainText('un semitono por debajo de la tónica');
    await page.getByRole('button', { name: 'Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Empezar toma' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Peldaño' })).toBeVisible();
    await page.getByRole('button', { name: 'Bucles' }).click();
    await expect(page.getByRole('button', { name: 'Reproducir bucle' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Patrón' })).toContainText('corcheas');
  });
});

test.describe('More tunings (D7)', () => {
  test('DADGAD puts D on both outer open strings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('combobox', { name: 'Tuning' }).selectOption('dadgad');
    await page.getByRole('button', { name: 'Keys' }).click();
    await page.getByRole('combobox', { name: 'Tonic' }).selectOption('D');
    await expect(
      page.locator('[data-testid="marker-root"][data-string="6"][data-fret="0"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid="marker-root"][data-string="1"][data-fret="0"]'),
    ).toHaveCount(1);
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('combobox', { name: 'Tuning' })).toHaveValue('dadgad');
  });
});
