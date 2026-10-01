import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { step } from "@fixtures/step";
import { obsURL } from "@config/environments";
import { choosePaymentTile, type PaymentMethod } from "./obs-page";

/**
 * The Pre-Application form — `/obs/preOnb/form`.
 *
 * The public front door to eAuto: a prospective dealer fills this in with no
 * login at all, pays RM108, and a Pre-Application record is created for
 * BackOffice to approve.
 *
 * ── Terminology ────────────────────────────────────────────────────────────
 * The UI says **Pre-Application**. The backend and every SRD say
 * **Pre-Onboarding** — `preOnb` in the path. Same entity.
 *
 * ── It is ONE page, not two ────────────────────────────────────────────────
 * The screen presents "the form" then "Business Info Review" then payment, but
 * step 2 is the same DOM, hidden. So the payment controls are present and
 * findable before Next is ever pressed, and a locator that resolves proves
 * nothing about which step is showing. Check the visible step, not existence.
 *
 * ── The reCAPTCHA ──────────────────────────────────────────────────────────
 * `/obs/preOnb/form` 302s to `/obs/preOnb/recaptcha` on a fresh session. A
 * CAPTCHA is a bot check and automation does not solve it: `openForHuman()`
 * drives to the gate and stops, and the operator clears it. Everything after
 * that is automated normally.
 *
 * Ask dev for Google's official reCAPTCHA **test keys** on staging — the
 * widget then validates for everyone and this handover disappears.
 *
 * ── Selector provenance ────────────────────────────────────────────────────
 * Every id below was read off the live staging form on 2026-09-15 and is
 * recorded in `knowledge/cross-portal/onboarding.md`. None is guessed.
 */

export const PRE_APPLICATION_PATH = "obs/preOnb/form";
export const RECAPTCHA_PATH = "obs/preOnb/recaptcha";

/**
 * The five radios, by their exact visible label.
 *
 * Read off the live form 2026-09-22. **They are GROUPED**, which neither the
 * brief nor the earlier field spec recorded: "Sdn Bhd" and "Bhd" share one
 * radio, and so do "Sole Proprietorship" and "Partnership". So there is no
 * control that selects "Bhd" on its own, and a config that treats the five
 * business types as five radios cannot be filled.
 */
export const BUSINESS_TYPE = {
  ROC: "Sdn Bhd / Bhd",
  ROB: "Sole Proprietorship / Partnership",
  LLP: "LLP",
  TRADING_SABAH: "Business Trading (Sabah)",
  TRADING_SARAWAK: "Business Trading (Sarawak)",
} as const;

export type BusinessType = (typeof BUSINESS_TYPE)[keyof typeof BUSINESS_TYPE];

/** The two types with no SSM record behind them — a licence instead of a BRN. */
export function isTradingType(type: BusinessType): boolean {
  return type === BUSINESS_TYPE.TRADING_SABAH || type === BUSINESS_TYPE.TRADING_SARAWAK;
}

export type { PaymentMethod };

export interface PreApplicationDetails {
  businessName: string;
  businessType: BusinessType;
  /** SSM types: the number as seeded in eSim — `roc` on both simulator rows. */
  oldBrn?: string;
  /** SSM types: the 12-digit form — `newRoc` on both simulator rows. */
  newBrn?: string;
  /** Business Trading types: the licence number (min 4; letters, digits, `/`). */
  tradingLicenceNo?: string;
  /** Business Trading types: the licence document — mandatory for them. */
  tradingLicenceFile?: string;
  tin?: string;
  showroomAddress: string;
  showroomPostcode: string;
  /** The option's visible label, e.g. "SELANGOR". */
  showroomState: string;
  /** Only selectable once a state is chosen — the list cascades. */
  showroomCity: string;
  adminName: string;
  mobileNo: string;
  /**
   * The Admin In Charge email.
   *
   * This is the address every later email assertion reads in Mailtrap, so it
   * MUST be unique per run or two chains become indistinguishable in a shared
   * inbox.
   */
  adminEmail: string;
}

export class PreApplicationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Open the form and stop at whatever gate is in front of it.
   *
   * Returns `"form"` when the form itself rendered, or `"recaptcha"` when the
   * bot check is in the way — which is the operator's to clear, not this
   * code's. The caller decides what to do about it; a helper that silently
   * waited would look like a hang.
   */
  @step("Open the Pre-Application form")
  async open(): Promise<"form" | "recaptcha"> {
    await this.page.goto(obsURL(PRE_APPLICATION_PATH), { waitUntil: "domcontentloaded" });
    if (/recaptcha/i.test(this.page.url())) return "recaptcha";
    await this.page.locator("#businessName").waitFor({ state: "visible", timeout: 30_000 });
    return "form";
  }

  /**
   * Wait for a human to clear the reCAPTCHA, then continue.
   *
   * Deliberately long and deliberately loud: the run is parked on a person, so
   * it says so rather than looking like a slow page. Automation never touches
   * the checkbox.
   */
  @step("Wait for the operator to clear the reCAPTCHA")
  async waitForHuman(timeout = 180_000): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `\n*** reCAPTCHA — please tick "I'm not a robot" in the browser window. ***\n` +
        `    Waiting up to ${Math.round(timeout / 1000)}s. The run continues on its own after that.\n`,
    );
    await this.page.locator("#businessName").waitFor({ state: "visible", timeout });
  }

  /**
   * Choose the business type.
   *
   * This decides which registration-number field exists: the BRN inputs are
   * hidden until a type is picked, so filling them first finds nothing.
   */
  @step("Choose the business type")
  async chooseBusinessType(type: BusinessType): Promise<void> {
    const radio = this.page.getByRole("radio", { name: type, exact: true });
    await (await this.requireVisible(radio, `business type "${type}"`)).check();
    // The type decides which number field is revealed.
    const field = isTradingType(type) ? "#businessLicenseNo" : "#oldBrn";
    await expect(this.page.locator(field)).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Fill the registration numbers.
   *
   * ⚠ Both fields fire a lookup ON BLUR — the BRN hits SSM and the TIN hits
   * LHDN. So the value has to be seeded in eSim BEFORE this runs, and the
   * blur is what triggers the purchase that populates the director list.
   */
  @step("Fill the registration numbers")
  async fillRegistration(d: PreApplicationDetails): Promise<void> {
    if (isTradingType(d.businessType)) {
      await this.fillTradingLicence(d);
    } else {
      if (!d.oldBrn || !d.newBrn) throw new Error(`${d.businessType} needs both BRNs.`);
      await this.page.fill("#oldBrn", d.oldBrn);
      await this.page.fill("#newBrn", d.newBrn);
      // Blur explicitly: the lookup is bound to it, and moving on without one
      // leaves the SSM purchase untriggered.
      await this.page.locator("#newBrn").blur();
    }
    if (d.tin) {
      await this.page.fill("#tin", d.tin);
      await this.page.locator("#tin").blur();
    }
  }

  /**
   * The Business Trading route: a licence number and the licence itself.
   *
   * There is no SSM lookup behind these types, so nothing needs seeding. The
   * upload is the catch: the section for EACH business type carries its own
   * hidden file input, so the one to use is the one inside the section that
   * is showing. The page's receipt that it took the file is "No file
   * selected." turning into the file's name — without it, Next rejects the
   * form for a missing document and says so nowhere on screen.
   */
  @step("Fill the trading licence")
  async fillTradingLicence(d: PreApplicationDetails): Promise<void> {
    if (!d.tradingLicenceNo || !d.tradingLicenceFile) {
      throw new Error(`${d.businessType} needs a licence number and a licence file.`);
    }
    await this.page.fill("#businessLicenseNo", d.tradingLicenceNo);
    await this.page.locator("#businessLicenseNo").blur();

    // Click what a user clicks: the visible Browse control. Which hidden input
    // sits behind it is the page's business.
    const browse = this.page.getByText(/browse files?\.{0,3}/i).filter({ visible: true }).first();
    if (!(await browse.count().catch(() => 0))) {
      throw new Error("No visible Browse control for the trading licence.");
    }
    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser", { timeout: 15_000 }),
      browse.click(),
    ]);
    await chooser.setFiles(d.tradingLicenceFile);

    const name = d.tradingLicenceFile.split(/[\\/]/).pop()!;
    await this.page
      .getByText(name, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => {
        throw new Error(`The licence upload never showed "${name}" — the page did not take the file.`);
      });
  }

  /**
   * Fill the showroom block.
   *
   * Two behaviours worth knowing, both observed rather than documented:
   *  - the address **force-uppercases and strips non-ASCII**, so "café"
   *    becomes "CAF". Read the value back rather than assuming it round-trips.
   *  - the city list is **disabled until a state is chosen** and then cascades,
   *    so the two cannot be set in either order.
   */
  @step("Fill the showroom details")
  async fillShowroom(d: PreApplicationDetails): Promise<void> {
    await this.page.fill("#showroomAddress", d.showroomAddress);
    await this.page.fill("#showroomPostcode", d.showroomPostcode);
    await this.page.selectOption("#showroomState", { label: d.showroomState });
    await expect(this.page.locator("#showroomCity")).toBeEnabled({ timeout: 15_000 });
    await this.page.selectOption("#showroomCity", { label: d.showroomCity });
  }

  /** The Admin In Charge block. The email here is the one Mailtrap reads. */
  @step("Fill the Admin In Charge details")
  async fillAdmin(d: PreApplicationDetails): Promise<void> {
    await this.page.fill("#adminName", d.adminName);
    await this.page.fill("#mobileNo", d.mobileNo);
    await this.page.fill("#adminEmail", d.adminEmail);
  }

  /** Everything on step 1, in the order the form needs it. */
  @step("Complete step 1")
  async fillForm(d: PreApplicationDetails): Promise<void> {
    await this.page.fill("#businessName", d.businessName);
    await this.chooseBusinessType(d.businessType);
    await this.fillRegistration(d);
    await this.fillShowroom(d);
    await this.fillAdmin(d);
  }

  /**
   * Step 2's payment block, in the only order it can be done.
   *
   * Each control REVEALS the next, and nothing can be set out of order:
   *
   *   tick #agreeTerms        -> #payment-method-section appears
   *   choose a method tile    -> #bank-selection-personal appears (FPX only)
   *   choose a bank tile      -> "Submit and Pay" will actually do something
   *
   * ⚠ The radios are visually hidden and the real controls are TILES — an
   * image plus a caption. `check()` on `#payment-fpx-personal` times out
   * because the input is never visible, and forcing it registers nothing: an
   * early run submitted with neither method nor bank set and simply sat on the
   * page with no error at all. Click what a user clicks.
   *
   * Observed on staging 2026-09-22.
   */
  @step("Accept the declaration and choose how to pay")
  async choosePayment(method: PaymentMethod = "Online Banking (Personal)"): Promise<string> {
    await this.page.locator("#agreeTerms").check();
    await this.page.locator("#payment-method-section").waitFor({ state: "visible", timeout: 15_000 });

    return choosePaymentTile(this.page, method);
  }

  /**
   * Submit and pay. This CREATES the Pre-Application and hands off to Fiuu.
   *
   * The page shows "Connecting... Please do not close the browser while
   * connecting to payment gateway", so the hand-off is asynchronous — waiting
   * for any URL change is not enough, because the draft URL already changed
   * once at step 2. Wait for the HOST to change.
   */
  @step("Submit and pay")
  async submitAndPay(timeout = 90_000): Promise<void> {
    const host = new URL(this.page.url()).host;
    await this.page.locator("#nextSubmitBtn").click();
    await this.page
      .waitForURL((u) => new URL(u.toString()).host !== host, { timeout })
      .catch(() => undefined);
  }

  /**
   * Move to the Business Info Review step. Returns any warning the form raised
   * on the way.
   *
   * The TIN is checked with LHDN on blur, and a TIN it rejects gets a
   * NON-BLOCKING warning — "The TIN is invalid. This may affect e-Invoice
   * submission. Click "Next" to proceed." The first Next only acknowledges it;
   * the second advances. Observed 2026-09-23, when a build that pressed once
   * sat on step 1 with the review hidden. So this presses until the review
   * shows, bounded, and throws with the form's own words if it never does.
   */
  @step("Continue to the review step")
  async next(tries = 3): Promise<string[]> {
    const review = this.page.locator("#business-review-section");
    const warnings = new Set<string>();
    const next = this.page.locator("#nextSubmitBtn");
    for (let i = 0; i < tries; i++) {
      // Next stays DISABLED while a lookup is pending or has failed outright.
      // One seen 2026-09-25: a "Service Unavailable" modal — "The LHDN
      // e-Invoice validation service is temporarily unavailable" — with Next
      // greyed out. Say what the page says instead of timing out on a button.
      if (!(await next.isEnabled({ timeout: 15_000 }).catch(() => false))) {
        await this.page.waitForTimeout(15_000);
        if (!(await next.isEnabled().catch(() => false))) {
          const modal = await this.page
            .locator(".modal:visible, [role=dialog]:visible, .ui-dialog:visible, .swal2-popup:visible")
            .first()
            .innerText()
            .catch(() => "");
          throw new Error(
            `Next is disabled${modal ? ` — the page says: "${modal.replace(/\s+/g, " ").trim()}"` : ""}.`,
          );
        }
      }
      await next.click();
      const shown = await review
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (shown) return [...warnings];
      for (const m of await this.validationMessages()) warnings.add(m);
      const tin = await this.page.getByText(/The TIN is invalid/i).first().innerText().catch(() => "");
      if (tin) warnings.add(tin.trim());
    }
    throw new Error(`Next was pressed ${tries} times and the review never showed. The form says: ${[...warnings].join(" | ") || "(nothing)"}`);
  }

  /**
   * What the company name resolved to after the BRN lookup.
   *
   * The SSM purchase overwrites what was typed with the registered name, so
   * this is how a test proves the right simulator record was hit.
   */
  async resolvedCompanyName(): Promise<string> {
    return this.page.inputValue("#businessName");
  }

  /** Whatever the form is currently objecting to, in its own words. */
  async validationMessages(): Promise<string[]> {
    return this.page.evaluate(() => {
      const found = new Set<string>();
      for (const sel of [".error", ".is-invalid", ".invalid-feedback", ".mandatory", ".text-red"]) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          const e = el as HTMLElement;
          if (e.offsetParent === null) continue;
          const t = (e.innerText || "").trim();
          if (t && t.length < 300) found.add(t.replace(/\s+/g, " "));
        }
      }
      return Array.from(found);
    });
  }
}
