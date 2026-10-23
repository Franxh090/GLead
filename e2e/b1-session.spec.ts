import { expect, test } from '@playwright/test';
import { awaitListening, currentTarget, playNotes, startMicSession, useFakeMic } from './helpers';

test.describe('B1 scale degree session', () => {
  test('answers by tapping a degree and sees feedback on the neck', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '5 min' }).click();
    await page.getByRole('button', { name: 'Start session' }).click();
    await expect(page.getByText(/Trial 1 of/)).toBeVisible();
    await awaitListening(page);
    const group = page.getByRole('group', { name: 'Scale degree' });
    await group.getByRole('button', { name: '1', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
    await expect(page.locator('[data-testid="marker-correct"]').first()).toBeVisible();
  });

  test('answers on the guitar through the microphone', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startMicSession(page);
    await awaitListening(page);
    const target = await currentTarget(page);
    expect(target).toBeGreaterThan(0);
    await playNotes(page, [target]);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
  });

  test('asks to confirm an out-of-tune note, then grades it', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startMicSession(page);
    await awaitListening(page);
    const target = await currentTarget(page);
    await playNotes(page, [target], 40);
    const dialog = page.getByRole('alertdialog', { name: 'Confirm what you played' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Yes, that was it' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
  });

  test('a wrong note marks the answer and the note played, and comes back later', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startMicSession(page);
    await awaitListening(page);
    const target = await currentTarget(page);
    await playNotes(page, [target + 1]);
    await expect(page.getByRole('status').filter({ hasText: 'That was' })).toBeVisible();
    await expect(page.locator('[data-testid="marker-wrong"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Trial 2 of/)).toBeVisible();
  });

  test('ending a session saves it and Progress shows the trials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '5 min' }).click();
    await page.getByRole('button', { name: 'Start session' }).click();
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Scale degree' })
      .getByRole('button', { name: '1', exact: true })
      .click();
    await page.getByRole('button', { name: 'End session' }).click();
    await expect(page.getByRole('heading', { name: 'Session done' })).toBeVisible();
    await page.getByRole('button', { name: 'Save and finish' }).click();
    await page.getByRole('button', { name: 'Progress' }).click();
    await expect(page.getByText(/over 1 trials/)).toBeVisible();
  });
});
