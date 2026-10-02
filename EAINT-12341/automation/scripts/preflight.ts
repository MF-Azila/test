/**
 * PREFLIGHT — proves the laptop is ready, and creates NO data anywhere.
 *
 *   npm run preflight
 *
 *  1. settings file: passwords present (values never printed)
 *  2. company sheet present
 *  3. staging reachable (VPN): opens the Pre-Application page — fills nothing
 *  4. eSim reachable: opens its login page — logs in to nothing
 *  5. BackOffice login works for the Approver and the Assignee — only signs in
 *
 * Screenshots: test-results/preflight-*.png. Send the window text back.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadSettings } from "./load-env";
const settings = loadSettings();

import { chromium, type Browser, type LaunchOptions } from "@playwright/test";
import { obsURL, esimURL } from "@config/environments";
import { LoginPage } from "@auth/login";

const OUT = path.join(__dirname, "..", "test-results");
const SHEET = path.join(__dirname, "..", "..", "cr", "EAINT-12341", "02-plan", "EAINT-12341_eSim_Setup.xlsx");
const results: string[] = [];
const ok = (s: string) => results.push(`  ✔ ${s}`);
const bad = (s: string) => results.push(`  ✘ ${s}`);

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`settings file: ${settings}`);

  for (const k of ["BO_USERNAME", "BO_PASSWORD", "BO_ADMIN_USERNAME", "BO_ADMIN_PASSWORD"]) {
    if ((process.env[k] ?? "").trim()) ok(`${k} is filled`);
    else bad(`${k} is EMPTY in env/.staging.env-local`);
  }
  if (fs.existsSync(SHEET)) ok("company sheet found (02-plan/EAINT-12341_eSim_Setup.xlsx)");
  else bad(`company sheet missing: ${SHEET}`);

  const exe = process.env.BROWSER_PATH?.trim();
  const launch: LaunchOptions = {
    headless: process.env.PREFLIGHT_HEADLESS === "1",
    args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests"],
    ...(exe ? { executablePath: exe } : { channel: (process.env.BROWSER_CHANNEL || "chrome").trim() }),
  };
  let browser: Browser;
  try {
    browser = await chromium.launch(launch);
    ok(`browser opened (${exe ?? launch.channel})`);
  } catch (e) {
    bad(`browser did not open: ${(e as Error).message.split("\n")[0]} — install Google Chrome, or set BROWSER_CHANNEL=msedge`);
    return;
  }

  try {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();

    // 3. staging (Pre-Application page — nothing is filled)
    try {
      const r = await page.goto(obsURL("obs/preOnb/form"), { waitUntil: "domcontentloaded", timeout: 60_000 });
      const status = r?.status() ?? 0;
      await page.screenshot({ path: path.join(OUT, "preflight-1-pre-application.png") });
      if (status >= 400) bad(`staging answered HTTP ${status} — is the VPN connected?`);
      else ok(`staging reachable — Pre-Application opened at ${new URL(page.url()).pathname} (HTTP ${status})`);
    } catch (e) {
      bad(`staging not reachable: ${(e as Error).message.split("\n")[0]} — is the VPN connected?`);
    }

    // 4. eSim login page (no login)
    try {
      const r = await page.goto(`${esimURL()}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const status = r?.status() ?? 0;
      await page.screenshot({ path: path.join(OUT, "preflight-2-esim.png") });
      if (status >= 400) bad(`eSim answered HTTP ${status}`);
      else ok(`eSim reachable (HTTP ${status})`);
    } catch (e) {
      bad(`eSim not reachable: ${(e as Error).message.split("\n")[0]} — is the VPN connected?`);
    }
    await ctx.close();

    // 5. BackOffice logins — sign in only
    for (const role of ["bo", "boAdmin"] as const) {
      const c = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 900 } });
      const p = await c.newPage();
      const label = role === "bo" ? "Approver" : "Assignee";
      if (!(process.env[role === "bo" ? "BO_PASSWORD" : "BO_ADMIN_PASSWORD"] ?? "").trim()) {
        bad(`${label} login not tried — password empty in the settings file`);
        await c.close();
        continue;
      }
      try {
        await new LoginPage(p).as(role);
        const menu = await p.locator("li.obs-auth-required").count();
        await p.screenshot({ path: path.join(OUT, `preflight-3-login-${role}.png`) });
        ok(`${label} signed in — onboarding menu items found: ${menu}`);
      } catch (e) {
        await p.screenshot({ path: path.join(OUT, `preflight-3-login-${role}.png`) }).catch(() => undefined);
        bad(`${label} login: ${(e as Error).message.split("\n")[0]}`);
      }
      await c.close();
    }
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => bad(`preflight crashed: ${(e as Error).message}`))
  .finally(() => {
    console.log(`\nPREFLIGHT RESULT\n${results.join("\n")}`);
    const failed = results.filter((r) => r.includes("✘")).length;
    console.log(failed ? `\n${failed} problem(s). Send this text and test-results/preflight-*.png to QA support.` : "\nAll good — ready for npm run ch1.");
    process.exit(failed ? 1 : 0);
  });
