import type { Page } from "@playwright/test";

/**
 * The FPX payment sandbox.
 *
 * Observed on staging 2026-09-22: pressing "Submit and Pay" opens a POPUP —
 * not a same-tab redirect — at `bank-simulator.fiuu.com/<channel>/login`. The
 * channel is the bank chosen on the review step; Maybank is `MB2U0227`. The
 * eAuto page meanwhile shows "Connecting to payment gateway", and on success
 * replaces its own location with `/obs/preOnb/summary/<uuid>`.
 *
 * The simulator screen is a login, then a small form: a payment-status dropdown
 * that must read **Approved**, an authentication code, and a pay control.
 *
 * ── Why a credential may be typed here at all ──────────────────────────────
 * It is HOST-LOCKED. The stored pair is typed only when the window's host is
 * exactly `bank-simulator.fiuu.com` — a sandbox with no real account and no
 * real money behind it. **Any other login form stops and hands the window
 * back**, credentials configured or not. A password field on any other host is
 * treated as a real bank and is never filled. That guard is the whole reason
 * this is safe to automate, so it does not get relaxed.
 *
 * The authentication code is NOT a secret: the simulator prints it on its own
 * page for the tester to copy. Reading it off the screen is reading the screen.
 */

/** The ONLY host a stored credential may ever be typed on. */
export const SIMULATOR_HOST = "bank-simulator.fiuu.com";

/** Controls the simulator puts in front of you, in the order worth pressing. */
const PAY_CONTROL =
  /^(pay|pay now|confirm|approve|submit|proceed|continue|agree|accept|ok|next|done|request tac)$/i;

/**
 * Sign in, if and only if this window is the sandbox.
 *
 * Returns false WITHOUT typing anything when the host is not the simulator or
 * no credential is configured. A false means a human finishes the window, which
 * is the correct outcome rather than a failure.
 */
export async function simulatorLogin(page: Page): Promise<boolean> {
  const user = (process.env.FIUU_USERNAME ?? "").trim();
  const pass = (process.env.FIUU_PASSWORD ?? "").trim();
  if (!user || !pass) return false;

  let host = "";
  try {
    host = new URL(page.url()).hostname;
  } catch {
    return false;
  }
  if (host !== SIMULATOR_HOST) return false; // THE GUARD

  const username = page
    .locator("input[type=text]:visible, input:not([type]):visible, input[type=email]:visible")
    .first();
  const password = page.locator("input[type=password]:visible").first();
  if (!(await username.count().catch(() => 0)) || !(await password.count().catch(() => 0))) {
    return false;
  }

  await username.fill(user);
  await password.fill(pass);
  await page
    .getByRole("button", { name: /^log ?in$/i })
    .or(page.locator("button[type=submit], input[type=submit]"))
    .first()
    .click()
    .catch(() => undefined);
  await page.waitForTimeout(2_500);
  return true;
}

/**
 * Set the payment status to Approved and copy the on-screen code into its box.
 *
 * The code is rendered in ANOTHER INPUT'S VALUE beside a copy control, not in
 * page text — so a text-only search finds nothing. Look in the text first,
 * then fall back to any filled 4–8 digit input that is not the code box itself
 * and not an amount or order reference.
 *
 * Best effort: a miss leaves a half-filled screen a person can finish, which
 * beats throwing on a window that is still perfectly usable.
 */
export async function prepareSimulatorForm(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      for (const select of Array.from(document.querySelectorAll("select"))) {
        const approved = Array.from(select.options).find((o) =>
          /approved/i.test(o.textContent || o.value),
        );
        if (approved && select.value !== approved.value) {
          select.value = approved.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    })
    .catch(() => undefined);

  await page
    .evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>("input[type=text], input:not([type])"),
      );
      const box = inputs.find((i) => !i.value && /tac|code/i.test(`${i.name} ${i.id} ${i.placeholder}`));
      if (!box) return;

      const inText = (/Transaction Authentication Code\s*:?\s*(\d{4,8})/i.exec(
        document.body.innerText || "",
      ) || [])[1];
      const inInput = inputs.find(
        (i) =>
          i !== box &&
          /^\d{4,8}$/.test(i.value || "") &&
          !/amount|order|postcode|mobile|phone/i.test(`${i.name} ${i.id} ${i.placeholder}`),
      )?.value;

      const code = inText || inInput;
      if (!code) return;
      box.value = code;
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));
    })
    .catch(() => undefined);
}

/** True when this window is a real bank's login rather than the sandbox. */
export async function isRealBankLogin(page: Page): Promise<boolean> {
  let host = "";
  try {
    host = new URL(page.url()).hostname;
  } catch {
    return false;
  }
  if (host === SIMULATOR_HOST) return false;
  return (await page.locator("input[type=password]:visible").count().catch(() => 0)) > 0;
}

/**
 * Drive one payment window to completion.
 *
 * Bounded, because a window still unfinished after a handful of presses is not
 * one this understands, and guessing further is worse than stopping. Returns
 * how many controls were pressed — two is the normal count for Maybank — and
 * every amount the sandbox showed on the way, so the caller can check the
 * gateway charged what the eAuto page quoted.
 */
export async function completePayment(
  page: Page,
  maxPresses = 8,
  idleLimitMs = 45_000,
): Promise<{ presses: number; amountsSeen: number[] }> {
  let presses = 0;
  let signedIn = false;
  let idleSince = Date.now();
  const amountsSeen = new Set<number>();

  while (presses < maxPresses) {
    if (page.isClosed()) break;
    for (const a of await amountsOnScreen(page)) amountsSeen.add(a);

    if (await isRealBankLogin(page)) {
      throw new Error(
        `This window is a real bank login (${new URL(page.url()).hostname}), not the sandbox. ` +
          "Stopping without typing anything.",
      );
    }

    if (!signedIn && (await page.locator("input[type=password]:visible").count().catch(() => 0)) > 0) {
      signedIn = await simulatorLogin(page);
      if (signedIn) {
        idleSince = Date.now();
        continue;
      }
    }

    // Fill the form BEFORE pressing, so the press lands on a complete form.
    await prepareSimulatorForm(page);

    // Only ever press on Fiuu's own pages. Once the gateway hands back, the
    // window is an eAuto page, and its buttons are not this loop's to press.
    const onFiuu = /(^|\.)fiuu\.com$/i.test(hostOf(page));
    const control = page
      .getByRole("button", { name: PAY_CONTROL })
      .or(page.getByRole("link", { name: PAY_CONTROL }))
      .or(page.locator("input[type=submit]"))
      .first();
    if (!onFiuu || !(await control.count().catch(() => 0))) {
      // Nothing to press: either still IN TRANSIT (a redirect page, or the
      // simulator not rendered yet) or FINISHED. Quitting on the first empty
      // look left a registration-fee window on an untouched login page, 2026-09-23.
      if (signedIn && presses > 0 && !onFiuu) break;
      if (Date.now() - idleSince > idleLimitMs) break;
      await page.waitForTimeout(1_500).catch(() => undefined);
      continue;
    }

    await control.click({ timeout: 10_000 }).catch(() => undefined);
    presses++;
    idleSince = Date.now();
    // The window CLOSES itself after the final press — that is the hand-back,
    // not a failure.
    await page.waitForTimeout(2_500).catch(() => undefined);
  }
  return { presses, amountsSeen: [...amountsSeen] };
}

function hostOf(page: Page): string {
  try {
    return new URL(page.url()).hostname;
  } catch {
    return "";
  }
}

/** Every "RM 1,500.00" / "MYR 1500.00" on the page, as numbers. Empty when the page is gone. */
async function amountsOnScreen(page: Page): Promise<number[]> {
  const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  const re = /(?:RM|MYR)\s*([\d,]+\.\d{2})/gi;
  const out: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(Number(m[1].replace(/,/g, "")));
  return out;
}
