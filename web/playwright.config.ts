import { defineConfig, devices } from "@playwright/test";

/** E2E runs against the local API (127.0.0.1:4000) and `vite preview` (127.0.0.1:4173) of the production build. */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: [
    { command: "npm run -w api start", url: "http://127.0.0.1:4000/health", reuseExistingServer: true, timeout: 60_000, cwd: ".." },
    { command: "npm run build && npm run preview", url: "http://127.0.0.1:4173", reuseExistingServer: true, timeout: 120_000 },
  ],
});
