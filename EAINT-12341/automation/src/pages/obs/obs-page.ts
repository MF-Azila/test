import type { Page } from "@playwright/test";

/**
 * Behaviour every `/obs/` screen shares — BackOffice and the Application form
 * alike, because they are the same application.
 *
 * It lives here rather than in each page object because it was written three
 * times during exploration and the copies drifted: a fix applied to one was
 * missing from the one actually running.
 */

/**
 * Wait for an `/obs/` page to be readable.
 *
 * These pages never fire a lifecycle event — a large number of static assets
 * never answer, so `load` and `domcontentloaded` hang for their full timeout on
 * a document that arrived in about a second. Poll for a document big enough to
 * be real instead. Observed on staging 2026-09-22.
 */
export async function settleObs(page: Page, minChars = 15_000, timeout = 30_000): Promise<number> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const size = await page.evaluate(() => document.body?.innerHTML?.length ?? 0).catch(() => 0);
    if (size >= minChars || Date.now() > deadline) return size;
    await page.waitForTimeout(400);
  }
}

/**
 * Press the affirmative button on whatever jQuery UI dialog is open, and
 * return what it said. Returns "" when there was no dialog.
 *
 * ⚠ Every destructive action in `/obs/` is guarded by a dialog whose buttons
 * are **No** and **Yes** — never the verb. Matching the verb re-hits the button
 * that OPENED the dialog: nothing happens, nothing errors, and the page still
 * looks right. A Pre-Application "approved" that way stayed `New` while the
 * banner read successful.
 */
export async function confirmObsDialog(page: Page, names = /^yes$/i): Promise<string> {
  const dialog = page.locator(".ui-dialog:visible").last();
  if (!(await dialog.count().catch(() => 0))) return "";
  const text = (await dialog.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  const button = dialog.getByRole("button", { name: names }).first();
  if (!(await button.count().catch(() => 0))) return text;
  await button.click({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(2_500);
  return text;
}

/**
 * Press a dealer-form Submit and ride out the acknowledge-then-save cycle
 * until the page confirms. Returns the confirmation text, or throws.
 *
 * The first press raises "Unsaved Changes"; only after saving does the real
 * confirmation arrive, so a single click followed by a read reports failure on
 * a form that is still working. Step 3 (the Application) and step 4 (the
 * Registration Documents) both behave this way.
 */
export async function submitUntilConfirmed(
  page: Page,
  controlId: string,
  success = /successfully submitted/i,
  tries = 6,
): Promise<string> {
  for (let i = 0; i < tries; i++) {
    await page.locator(`#${controlId}`).click({ timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(2_500);
    for (let d = 0; d < 3; d++) {
      const text = await confirmObsDialog(page, /^(save & continue|yes|ok|submit|confirm|proceed)$/i);
      if (!text) break;
      if (success.test(text)) return text;
    }
    const body = await page.locator("body").innerText().catch(() => "");
    const hit = body.split("\n").find((line) => success.test(line));
    if (hit) return hit.trim();
  }
  throw new Error(`#${controlId} was pressed ${tries} times and the page never confirmed.`);
}

/** The payment tiles, by their exact caption. Observed 2026-09-22 and 2026-09-23. */
export type PaymentMethod = "Credit or Debit Card" | "Online Banking (Personal)";

/**
 * Choose a payment method tile and, for FPX, the first bank tile. Returns the
 * bank's value (`fpx_mb2u`) or a note that the method has no bank list.
 *
 * Shared by the Pre-Application fee and the registration fee: both render the
 * same markup — `#payment-fpx-personal`, then `#bank-selection-personal` with
 * `bank-b2c-N` tiles. What differs is what comes BEFORE: the Pre-Application
 * gates the tiles behind `#agreeTerms`; step 5 shows them straight away.
 *
 * ⚠ The radios are visually hidden and the real controls are TILES — an image
 * plus a caption. `check()` on the radio times out because it is never
 * visible, and forcing it registers nothing: an early run submitted with
 * neither method nor bank set and sat on the page with no error. Click what a
 * user clicks.
 */
export async function choosePaymentTile(page: Page, method: PaymentMethod): Promise<string> {
  await page.getByText(method, { exact: true }).first().click();
  if (method !== "Online Banking (Personal)") return "(no bank list for this method)";

  await page.locator("#bank-selection-personal").waitFor({ state: "visible", timeout: 15_000 });
  const first = await page.evaluate(() => {
    const el = document.querySelector('[id^="bank-b2c-"]') as HTMLInputElement | null;
    if (!el) return null;
    const wrap = el.closest("label,div,li") as HTMLElement | null;
    return { id: el.id, value: el.value, label: (wrap?.innerText || "").replace(/\s+/g, " ").trim() };
  });
  if (!first) throw new Error("FPX was chosen but no bank tile rendered.");

  const tile = first.label
    ? page.getByText(first.label.split("\n")[0], { exact: false }).first()
    : page.locator(`label[for="${first.id}"]`);
  await tile.click({ timeout: 15_000 }).catch(async () => {
    await page.locator(`label[for="${first.id}"]`).click({ timeout: 10_000 });
  });
  const chosen = await page.locator(`#${first.id}`).isChecked().catch(() => false);
  if (!chosen) throw new Error(`Clicked the ${first.value} tile but its radio is not checked.`);
  return first.value || first.label || first.id;
}

export type FormStep = 1 | 2 | 3 | 4 | 5;

/**
 * Which step of the dealer's Application form is on screen — `#stepN`
 * visible — or 0 when none is (the payment receipt replaces the form).
 *
 * The step containers are the only honest signal. Every file input is hidden
 * behind a styled "Browse Files..." button, so "a visible file input" never
 * identifies the upload step; and the form RESTORES a draft to the step it
 * reached, so a revisited link can open on any of them. Observed 2026-09-23.
 */
export async function visibleFormStep(page: Page): Promise<FormStep | 0> {
  for (const n of [5, 4, 3, 2, 1] as const) {
    if (await page.locator(`#step${n}`).isVisible().catch(() => false)) return n;
  }
  return 0;
}
