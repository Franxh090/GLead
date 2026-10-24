import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    // Vite directly, not through pnpm: Playwright kills the process it spawned,
    // and a pnpm wrapper would leave Vite running and the teardown waiting.
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      // iPhone 15 viewport and touch, in Chromium (WebKit is not installed here).
      name: 'iphone-chromium',
      testMatch: /iphone\.spec\.ts/,
      use: {
        ...devices['iPhone 15'],
        browserName: 'chromium',
        launchOptions: {
          executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
    {
      name: 'desktop-chromium',
      testIgnore: /iphone\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // The container ships Chromium at this path; a project pinning another
        // Playwright version must not download a browser (environment note).
        launchOptions: {
          executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
          // Let the AudioContext run without a gesture, so Tone's Transport advances headless.
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
  ],
});
