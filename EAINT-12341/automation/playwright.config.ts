import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
// Safe to import above the env load: every value in there is read lazily.
import { baseURL } from "./config/environments";

/**
 * Env file resolution — a ladder, so CI can hand in a file from outside the
 * repo while a developer keeps a local one:
 *
 *   ENV_FILE=/config/.env            explicit, CI uses this
 *   env/.<TEST_ENV>.env-local        local, gitignored
 *   env/env-default                  committed template, all values blank
 */
function envFile(): string {
  if (process.env.ENV_FILE) return process.env.ENV_FILE;
  const testEnv = process.env.TEST_ENV || "staging";
  const local = path.join(__dirname, "env", `.${testEnv}.env-local`);
  return fs.existsSync(local) ? local : path.join(__dirname, "env", "env-default");
}
loadEnv({ path: envFile(), override: true });

const headed = process.env.HEADED === "1" || process.env.MODE === "HEADED";

/**
 * Which browser. Default: the Google Chrome installed on the laptop.
 * BROWSER_CHANNEL=msedge uses Microsoft Edge instead (also real, not bundled).
 * BROWSER_PATH=<exe> points at a specific browser program (used for checks
 * on machines without Chrome).
 */
const browserPath = process.env.BROWSER_PATH?.trim();
const browser = browserPath
  ? { launchOptions: { executablePath: browserPath } }
  : { channel: (process.env.BROWSER_CHANNEL || "chrome").trim() };
const runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");

// `--list` executes nothing, but a reporter attached unconditionally still
// writes a results file, and a board then counts an empty listing as a run.
const listingOnly = process.argv.includes("--list");

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // A whole STMS journey crosses six steps and two gateways.
  timeout: 25 * 60 * 1000,
  expect: { timeout: 60 * 1000 },
  fullyParallel: false,
  /**
   * ONE WORKER, and this is not a performance oversight.
   *
   * The emulator keeps card state per channel and would happily serve a
   * channel per worker — but `mykad-websocket-v2.js` on the portal HARDCODES
   * `ws://localhost:7878/IDCard`, the default channel. So two workers would
   * insert cards into each other's flows no matter how the fixture is keyed.
   * Verified against staging 2026-09-15.
   *
   * eSim is the second reason: its canned responses are global, so two runs
   * editing one prefix collide. Prefix-per-outcome fixes that; a worker count
   * does not.
   */
  workers: process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10) : 1,
  // NEVER retry: a retry spends another real company (one company, one use).
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: listingOnly
    ? [["list"]]
    : [
        ["list"],
        ["json", { outputFile: `test-results/runs/${runId}/results.json` }],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ],

  use: {
    baseURL: baseURL(),
    headless: !headed,
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 90 * 1000,
    navigationTimeout: 120 * 1000,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    ignoreHTTPSErrors: true,
    launchOptions: {
      /**
       * REQUIRED, not an optimisation.
       *
       * The portal pages that need a card open ws://localhost:7878 from an
       * HTTPS origin. Chrome blocks that as a local-network request and says
       * nothing useful on the page — instead the screen shows
       * "Update Required — Dermalog Biometric Device", which is the
       * connection-failed state, NOT a version check. Reading that message
       * literally sends you hunting for a driver update for an hour.
       */
      args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests"],
    },
  },

  projects: [
    {
      // A change request's own specs, which live beside the ticket's evidence
      // in cr/<TICKET>/03-spec/ so one folder holds the whole story. They run
      // with the staging project because that is what they target; a spec that
      // must keep running after the CR ships gets COPIED into tests/staging/
      // and the ticket's copy marked @status retired.
      name: "cr",
      testDir: "../cr",
      testMatch: "**/03-spec/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ...browser,
        launchOptions: {
          args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests"],
          ...(browserPath ? { executablePath: browserPath } : {}),
        },
      },
    },
    // The full team project also had "staging", "production" and "explore"
    // projects. Their test folders were not in the handover, so they are not
    // declared here. Only the CR project runs.
  ],
});
