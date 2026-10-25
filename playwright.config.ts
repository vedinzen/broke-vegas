import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.QA_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    launchOptions: {
      // Headless Chromium needs a software GL backend for the WebGL scene.
      args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
    },
  },
  // System Chrome is used because the bundled headless shell build does not match this Playwright version.
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } }],
  webServer: {
    // `QA_DEV=0` switches to the production server when a fresh `next build` exists.
    command: process.env.QA_DEV === "0" ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
