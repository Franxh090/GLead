import { expect, test } from '@playwright/test';
import { fixArms } from './helpers';

test.beforeEach(async ({ page }) => fixArms(page));

test.describe('Settings: volume and latency', () => {
  test('the volume slider and the latency line follow the settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const volume = page.getByRole('slider', { name: 'Volume' });
    await expect(volume).toHaveValue('0.8');
    await expect(page.getByText('Volume: 80%')).toBeVisible();
    await volume.fill('0.5');
    await expect(page.getByText('Volume: 50%')).toBeVisible();
    await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
    await expect(page.getByText(/Mic latency: the default 150 ms/)).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('0.5');
  });
});

test.describe('Cohort report', () => {
  test('the cohort view offers the Markdown report', async ({ page }) => {
    const file = (name: string) => ({
      name,
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          app: 'glead',
          format: 1,
          exportedAt: '2026-11-01T10:00:00.000Z',
          trials: [],
        }),
      ),
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await page.getByLabel('View an export file').setInputFiles([file('p1.json'), file('p2.json')]);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the report (Markdown)' }).click();
    expect((await download).suggestedFilename()).toBe('glead-pilot-report.md');
  });
});
