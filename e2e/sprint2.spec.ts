import { expect, test } from '@playwright/test';
import {
  awaitListening,
  currentTarget,
  fixArms,
  playNotes,
  startSession,
  useFakeMic,
} from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('B3 note against chord', () => {
  test('plays the chord tone back through the mic and tapping a tone grades too', async ({
    page,
  }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startSession(page, {
      mic: true,
      skills: ['Chord tones of major and minor chords'],
      deselectDefault: true,
    });
    await expect(page.getByText(/then one of its notes/)).toBeVisible();
    await awaitListening(page);
    const target = await currentTarget(page);
    await playNotes(page, [target]);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
    await expect(page.getByText(/Trial 2 of/)).toBeVisible({ timeout: 10_000 });
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Chord tone' })
      .getByRole('button', { name: 'Root' })
      .click();
    await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
  });
});

test.describe('B2 chord function', () => {
  test('names the chord by numeral and sees its root on the neck', async ({ page }) => {
    await page.goto('/');
    await startSession(page, { skills: ['I, IV, V and vi by ear'], deselectDefault: true });
    await expect(page.getByText(/After the cadence, one chord/)).toBeVisible();
    await awaitListening(page);
    await page
      .getByRole('group', { name: 'Roman numeral' })
      .getByRole('button', { name: 'IV', exact: true })
      .click();
    await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
    await expect(page.locator('[data-testid="marker-correct"]').first()).toBeVisible();
  });

  test('accepts the root played on the guitar', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/');
    await startSession(page, {
      mic: true,
      skills: ['I, IV, V and vi by ear'],
      deselectDefault: true,
    });
    await awaitListening(page);
    const root = await currentTarget(page);
    await playNotes(page, [root + 12]);
    await expect(page.getByRole('status').filter({ hasText: 'Right' })).toBeVisible();
  });
});

test.describe('skills interleaved', () => {
  test('a session over two skills shows both drills', async ({ page }) => {
    await page.goto('/');
    await startSession(page, { skills: ['Chord tones of major and minor chords'] });
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      await awaitListening(page);
      const isB1 = await page.getByRole('group', { name: 'Scale degree' }).isVisible();
      seen.add(isB1 ? 'b1' : 'b3');
      const group = page.getByRole('group', { name: isB1 ? 'Scale degree' : 'Chord tone' });
      await group.getByRole('button').first().click();
      await expect(page.getByRole('status').filter({ hasText: /Right|That was/ })).toBeVisible();
      const next = page.getByRole('button', { name: 'Next' });
      if (await next.isVisible()) await next.click();
      await expect(page.getByText(new RegExp(`Trial ${i + 2} of`))).toBeVisible({
        timeout: 10_000,
      });
    }
    expect(seen.size).toBe(2);
  });
});

test.describe('Loops', () => {
  test('shows a progression in a chosen key and plays it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Loops' }).click();
    await page.getByLabel('Progression').selectOption('i-bVI-bIII-bVII');
    await page.getByLabel('Key').selectOption('Em');
    const chords = page.getByRole('list', { name: 'Chords' }).getByRole('listitem');
    await expect(chords).toHaveText([/Em/, /C/, /G/, /D/]);
    await page.getByRole('button', { name: 'Play loop' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Em' })).toHaveAttribute(
      'aria-current',
      'true',
      {
        timeout: 10_000,
      },
    );
    await expect(page.locator('[data-testid="marker-root"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Stop' }).click();
  });
});
