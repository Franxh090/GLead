import { expect, type Page } from '@playwright/test';

interface FakeMic {
  state: string;
  play(note: number | string, options?: { durationMs?: number; cents?: number }): void;
  silence(durationMs: number): void;
}

type FakeMicWindow = Window & { __gleadFakeMic?: true | FakeMic };

/** Every page load from now on gets the fake mic (`main.tsx`). Call before the first `goto`. */
export async function useFakeMic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as FakeMicWindow).__gleadFakeMic = true;
  });
}

export async function fakeMicReady(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof (window as FakeMicWindow).__gleadFakeMic === 'object');
}

/** Plays notes into the fake mic, each followed by silence, after the stability hold. */
export async function playNotes(
  page: Page,
  notes: readonly (number | string)[],
  cents = 0,
): Promise<void> {
  await fakeMicReady(page);
  await page.evaluate(
    async ({ notes, cents }) => {
      await new Promise((r) => setTimeout(r, 150));
      const fake = (window as FakeMicWindow).__gleadFakeMic as FakeMic;
      for (const n of notes) {
        fake.play(n, { cents });
        fake.silence(200);
      }
    },
    { notes, cents },
  );
}

/** Waits for the prompt (cadence plus note, about 7 s) to finish and listening to start. */
export async function awaitListening(page: Page): Promise<void> {
  await expect(page.getByRole('status').filter({ hasText: 'Listening' })).toBeVisible({
    timeout: 20_000,
  });
}

/** Turns the mic on in Settings and starts a session of the given length. */
export async function startMicSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Answer on the guitar (microphone)' }).click();
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: '5 min' }).click();
  await page.getByRole('button', { name: 'Start: scale degrees' }).click();
  await page.getByRole('button', { name: 'Start listening' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mic on' })).toBeVisible();
}

/** The target MIDI note of the current B1 prompt, read from the page's debug hook. */
export async function currentTarget(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-target-midi]');
    return Number(el?.getAttribute('data-target-midi'));
  });
}
