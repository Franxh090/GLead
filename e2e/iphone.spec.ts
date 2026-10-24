import { expect, test, type Page } from '@playwright/test';
import { awaitListening, fixArms, playNotes, startSession, useFakeMic } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

/** No horizontal page scroll: the phone's whole screen fits the viewport. */
async function fits(page: Page, where: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, `${where} overflows by ${over}px`).toBeLessThanOrEqual(1);
}

test.describe('iPhone width', () => {
  test('every screen fits the phone', async ({ page }) => {
    await page.goto('/');
    await fits(page, 'Today');
    for (const name of ['Keys', 'Changes', 'Loops', 'Songs', 'Progress', 'Settings']) {
      await page.getByRole('button', { name }).click();
      await fits(page, name);
    }
    await page.getByRole('button', { name: 'Keys' }).click();
    await page
      .getByRole('table', { name: 'Diatonic chords' })
      .getByRole('button', { name: 'V', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: /Three places/ })).toBeVisible();
    await fits(page, 'Keys with zones');
  });

  test('a session runs with the neck scrolling inside its box', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startSession(page, { mic: true });
    await fits(page, 'Session');
    await awaitListening(page);
    const target = await page.evaluate(() =>
      Number(document.querySelector('[data-target-midi]')?.getAttribute('data-target-midi')),
    );
    await playNotes(page, [target]);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    await fits(page, 'Session feedback');
    // The degree buttons stay tappable: at least 44px tall.
    const box = await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button')
      .first()
      .boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('placement and the summary fit', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('region', { name: 'Placement' })
      .getByRole('button', { name: 'Take the placement test' })
      .click();
    await awaitListening(page);
    await fits(page, 'Placement');
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'End session' }).click();
    await expect(page.getByRole('heading', { name: 'Placement done' })).toBeVisible();
    await fits(page, 'Summary');
  });
});
