import type { Page, BrowserContext } from "@playwright/test";
import { step } from "@fixtures/step";
import { settleObs, confirmObsDialog } from "./obs-page";

/**
 * BackOffice — the onboarding review screens.
 *
 * ── The route in, and why a URL will not do ────────────────────────────────
 * `/obs/admin/*` returns **403 to everyone**, signed in or not, dealer or
 * BackOffice. Those are not the way in. The session is established by a menu
 * item on the eAuto portal home page whose class states the mechanism:
 *
 *   <li class="obs-auth-required" data-type="PRE_OBS_APPLICATION_LISTING">
 *
 * Clicking it runs a handler that opens an `/obs/` session; afterwards the same
 * URLs work **in that session**. The inner `<a href="#">` does nothing — the
 * handler is on the `<li>`.
 *
 * ── These pages never finish loading ───────────────────────────────────────
 * These pages never fire a lifecycle event: a large number of static assets
 * never answer, so `load` and `domcontentloaded` hang on a document that
 * already arrived. `settle()` polls for a document big enough to be real
 * instead. Observed on staging 2026-09-22.
 */

/** The four onboarding menu items, by the `data-type` that identifies them. */
export const BO_MENU = {
  preApplicationListing: "PRE_OBS_APPLICATION_LISTING",
  applicationListing: "OBS_APPLICATION_LISTING",
  preApplicationAudit: "PRE_OBS_AUDIT_LOG_LISTING",
  applicationAudit: "OBS_AUDIT_LOG_LISTING",
} as const;

export type BoMenuItem = (typeof BO_MENU)[keyof typeof BO_MENU];

export class BackOfficePage {
  constructor(
    private readonly page: Page,
    private readonly context: BrowserContext,
  ) {}

  /** See `settleObs` — these pages never finish loading. */
  async settle(minChars = 15_000, timeout = 30_000): Promise<number> {
    return settleObs(this.page, minChars, timeout);
  }

  /** The portal home the menu lives on, remembered from the first visit. */
  private home?: string;

  /**
   * Open one of the onboarding listings from the portal menu.
   *
   * The menu is on the portal home only — once a listing is open the page is
   * an `/obs/` screen with no such item, so a second call used to time out
   * looking for it. Going BACK to the home the run already signed in to, and
   * clicking again, keeps to the click-don't-construct rule.
   */
  @step("Open a BackOffice onboarding listing")
  async openListing(item: BoMenuItem): Promise<void> {
    const menu = this.page.locator(`li.obs-auth-required[data-type="${item}"]`);
    if (await menu.count().catch(() => 0)) {
      this.home = this.page.url();
    } else {
      if (!this.home) throw new Error("Not on the portal home, and no home remembered — sign in first.");
      await this.page.goto(this.home, { waitUntil: "commit" });
      await menu.waitFor({ state: "attached", timeout: 60_000 });
    }
    await menu.click({ timeout: 30_000 });
    await this.settle();
  }

  /**
   * Search, then wait for the table to actually be the result of THIS search.
   *
   * `#to-search` fires an AJAX GET
   * and rebuilds the table in a callback, but the "record(s) in total" line is
   * ALREADY on the page from the previous search. Waiting for that text is
   * satisfied immediately, so every read lags by exactly one query and reports
   * the PREVIOUS result set — a listing that looks broken while working
   * perfectly.
   *
   * Two identical reads 300ms apart is the honest wait.
   */
  @step("Search a BackOffice listing")
  async search(fields: Record<string, string>): Promise<string> {
    for (const [id, value] of Object.entries(fields)) {
      await this.page.fill(`#${id}`, value);
    }
    await this.page.locator("#to-search").click();

    let previous = "";
    for (let i = 0; i < 25; i++) {
      await this.page.waitForTimeout(300);
      const now = await this.page.evaluate(
        () => document.querySelector("tbody")?.innerText?.replace(/\s+/g, " ") ?? "",
      );
      if (now && now === previous) return now;
      previous = now;
    }
    return previous;
  }

  /**
   * Open a row's action link — which opens a NEW TAB.
   *
   * Take the link from the ROW, never the page. A
   * page-level "first action link" match opens whatever is at the top of the
   * results, which silently acts on a record the search did not select.
   * 
   *
   * A no-match search renders ONE row saying "No records found",
   * which a row-reader counts as data. This throws instead.
   */
  @step("Open a listing row")
  async openRow(rowText: string): Promise<Page> {
    const row = this.page.locator("tbody tr", { hasText: rowText }).first();
    if (!(await row.count().catch(() => 0))) {
      throw new Error(`No BackOffice row matching "${rowText}".`);
    }
    if (/no records found/i.test((await row.innerText().catch(() => "")) || "")) {
      throw new Error(`The listing returned "No records found" for "${rowText}".`);
    }

    const opened = this.context.waitForEvent("page", { timeout: 12_000 }).catch(() => null);
    await row.locator("td").last().locator("a,button").first().click({ timeout: 20_000 });
    const tab = await opened;
    const target = tab ?? this.page;
    await target.waitForLoadState("domcontentloaded").catch(() => undefined);
    return target;
  }

  /**
   * Approve a Pre-Application, from its detail page.
   *
   * ⚠ ONE-SHOT. An approved Pre-Application has fired its emails and created
   * the Application; it cannot be re-approved.
   *
   * ⚠ The confirm is a jQuery UI dialog whose buttons are **No** and **Yes** —
   * "Are you sure to approve the Pre-Application?". Matching `/approve/i` for
   * the confirm re-hits the button that OPENED the dialog: nothing is
   * approved, no error is shown, and the page still looks right. Cost a run
   * here on 2026-09-22.
   */
  @step("Approve a Pre-Application")
  async approvePreApplication(detail: Page): Promise<void> {
    await detail.getByRole("button", { name: /^approve$/i }).first().click({ timeout: 20_000 });
    await this.confirm(detail);
  }

  /** See `confirmObsDialog` — the buttons are No/Yes, never the verb. */
  private async confirm(target: Page, names = /^yes$/i): Promise<string> {
    return confirmObsDialog(target, names);
  }

  /**
   * Stage 1 → 2, as the ASSIGNEE.
   *
   * `#to-submit-for-approval` exists only for the assignee account; the
   * approver's page has `Save` and nothing else at this stage, so the chain
   * stalls with no visible reason if only one BO login is configured.
   *
   * UCD Group must be set first — the workflow will not move without it.
   * Afterwards the listing reads `Checked / Pending Approver`.
   */
  @step("Submit an Application for approval (assignee)")
  async submitForApproval(detail: Page, ucdGroup = "UCD"): Promise<void> {
    await detail.selectOption("#ucdGroup", { label: ucdGroup }).catch(async () => {
      await detail.selectOption("#ucdGroup", { index: 1 });
    });
    await detail.locator("#to-submit-for-approval").click({ timeout: 20_000 });
    await this.confirm(detail);
  }

  /**
   * Stage 2 → Approved, as the APPROVER.
   *
   * The approver's controls at this point are
   * `Re-evaluate | Save | Reject | Approve`. Approving stamps the Approved
   * Date and makes the **Registration Documents** tab appear.
   */
  @step("Approve an Application (approver)")
  async approveApplication(detail: Page): Promise<void> {
    await detail.locator("#to-approve-ucd").click({ timeout: 20_000 });
    await this.confirm(detail);
  }

  /**
   * One listing row as `{ column header: cell text }`, for the row whose text
   * contains `match`.
   *
   * Read by HEADER, not by position or a regex over the row's text: the
   * Application listing has 23 columns, several share values ("Pending UCD"
   * appears in three), and a positional read breaks silently the day a column
   * is added. Throws on "No records found" rather than returning it as data.
   */
  async readRow(match: string): Promise<Record<string, string>> {
    const row = await this.page.evaluate((m) => {
      const table = Array.from(document.querySelectorAll("table")).find((t) => t.querySelector("thead th"));
      if (!table) return null;
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        (th.textContent ?? "").replace(/\s+/g, " ").trim(),
      );
      const tr = Array.from(table.querySelectorAll("tbody tr")).find((r) => (r.textContent ?? "").includes(m));
      if (!tr) return null;
      const cells = Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent ?? "").replace(/\s+/g, " ").trim());
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
    }, match);
    if (!row) throw new Error(`No listing row containing "${match}".`);
    if (Object.values(row).some((v) => /no records found/i.test(v))) {
      throw new Error(`The listing returned "No records found" for "${match}".`);
    }
    return row;
  }

  /**
   * Find an Application in the listing and open its edit page.
   *
   * By Application No when there is one; by company name before submission,
   * because a Draft row's Application No is BLANK. Returns the tab and the
   * record's uuid, which is the one identifier every later BackOffice screen
   * shares.
   */
  @step("Open an Application in BackOffice")
  async openApplication(by: { applicationNo?: string; companyName?: string }): Promise<{
    detail: Page;
    uuid: string;
    row: Record<string, string>;
  }> {
    const key = by.applicationNo ?? by.companyName;
    if (!key) throw new Error("openApplication needs an Application No or a company name.");
    await this.openListing(BO_MENU.applicationListing);
    await this.search(by.applicationNo ? { applicationNo: by.applicationNo } : { companyName: by.companyName! });
    const row = await this.readRow(key);
    const detail = await this.openRow(key);
    await settleObs(detail);
    const uuid = /\/form\/edit(?:-registration-doc)?\/([0-9a-f-]{36})/i.exec(detail.url())?.[1];
    if (!uuid) throw new Error(`The edit page opened at ${detail.url()}, which carries no uuid.`);
    return { detail, uuid, row };
  }

  /**
   * The right-hand sidebar as `{ label: value }` — "Application Status",
   * "Registration Documents Submission Date", and so on.
   *
   * Labels end in a colon and the value is the next non-empty text; a select's
   * value is its CHOSEN option, never its whole option list.
   */
  async sidebar(detail: Page): Promise<Record<string, string>> {
    return detail.evaluate(() => {
      const out: Record<string, string> = {};
      for (const label of Array.from(document.querySelectorAll("label, dt, th, b, strong, span, div"))) {
        if (label.children.length) continue;
        const text = (label.textContent ?? "").replace(/\s+/g, " ").trim();
        if (!/^[A-Z][A-Za-z/ &()]{2,60}:$/.test(text)) continue;
        const key = text.slice(0, -1);
        if (key in out) continue;
        let node: Element | null = label;
        let value = "";
        for (let hops = 0; hops < 6 && node && !value; hops++) {
          node = node.nextElementSibling ?? node.parentElement?.nextElementSibling ?? null;
          if (!node) break;
          // Reached the NEXT label: this one's value is empty. Borrowing the
          // neighbour's would report a date that was never stamped.
          if (/^[A-Z][A-Za-z/ &()]{2,60}:/.test((node.textContent ?? "").trim())) break;
          const select = node.matches("select") ? (node as HTMLSelectElement) : node.querySelector("select");
          value = select
            ? (select.selectedOptions[0]?.textContent ?? "").trim()
            : (node.textContent ?? "").replace(/\s+/g, " ").trim();
        }
        // A validation hint beside an input is not the field's value.
        out[key] = /^this field is required$/i.test(value) ? "" : value;
      }
      return out;
    });
  }

  /**
   * Hand the record to a named assignee — the APPROVER's act, before the
   * assignee ever opens it.
   *
   * Why it is its own phase: the dealer's submission AUTO-assigns whoever is
   * next in rotation (one chain here landed on another tester's account), and
   * the assignee-only controls then belong to somebody else.
   *
   * The dropdown holds DISPLAY names, not logins. When it is not rendered the
   * record is not at a stage that offers it; that is reported, not thrown, so
   * the caller can come back later.
   */
  @step("Assign the Application")
  async assign(detail: Page, assigneeName: string): Promise<{ assigned: boolean; note: string }> {
    const select = detail.locator("select#assigneeUserId");
    if (!(await select.isVisible().catch(() => false))) {
      return { assigned: false, note: "the Assignee dropdown is not offered at this stage" };
    }
    const options = (await select.locator("option").allInnerTexts()).map((o) => o.trim());
    const label = options.find((o) => o.toUpperCase() === assigneeName.toUpperCase());
    if (!label) {
      throw new Error(`"${assigneeName}" is not an assignee option. Offered: ${options.slice(0, 15).join(", ")}…`);
    }
    const current = await select.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text.trim() ?? "");
    if (current === label) return { assigned: true, note: `already assigned to ${label}` };

    await select.selectOption({ label });
    await detail.locator("#to-edit, #to-edit-final").first().click({ timeout: 20_000 });
    await this.confirm(detail);
    const saved = await detail
      .getByText(/updated successfully/i)
      .first()
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    return { assigned: saved, note: saved ? `assigned to ${label}` : "Save pressed but no 'updated successfully'" };
  }

  /**
   * Open the Registration Documents tab from an Application's edit page.
   *
   * The tab exists only once the Application is Approved. Its route answers
   * 404 for a record whose documents were never submitted — so it is CLICKED,
   * and the absence of the tab is reported as the state it is.
   */
  @step("Open the Registration Documents tab")
  async openRegistrationDocuments(detail: Page): Promise<void> {
    const tab = detail.locator('a[href*="edit-registration-doc"]').first();
    if (!(await tab.count().catch(() => 0))) {
      throw new Error("No Registration Documents tab — the Application is not Approved yet.");
    }
    await tab.click();
    await detail.waitForURL(/edit-registration-doc/, { timeout: 30_000 });
    await settleObs(detail);
  }

  /**
   * The ASSIGNEE marks the dealer's registration documents Verified.
   *
   * Offered only once the dealer has submitted them. Returns the stamped
   * verification date, read back from the sidebar — the banner is not
   * evidence, the stamp is.
   */
  @step("Verify the registration documents (assignee)")
  async verifyRegistrationDocuments(detail: Page): Promise<string> {
    const verified = detail.getByRole("button", { name: /^verified$/i }).first();
    if (!(await verified.isVisible().catch(() => false))) {
      const side = await this.sidebar(detail);
      throw new Error(
        "No Verified button. Submission date reads " +
          `"${side["Registration Documents Submission Date"] ?? "?"}" — ` +
          "it is offered only to the assignee, after the dealer submits the documents.",
      );
    }
    await verified.click({ timeout: 20_000 });
    await this.confirm(detail);
    await detail.reload({ waitUntil: "commit" });
    await settleObs(detail);
    const stamp = (await this.sidebar(detail))["Registration Documents Verification Date"] ?? "";
    if (!stamp || stamp === "-") throw new Error("Verified was pressed but no verification date was stamped.");
    return stamp;
  }

  /**
   * The signed Application link a Pre-Application carries once approved.
   *
   * `Copy Link` writes it to the clipboard, but it is also sitting in an input
   * on the page — reading it is cheaper and needs no clipboard permission.
   * Shape: `/obs/form/<uuid>?id=<OLD-BRN>&s=<64 hex>&v=1`, and it needs NO
   * reCAPTCHA, so everything after approval runs unattended.
   */
  async applicationLink(detail: Page): Promise<string> {
    const link = await detail.evaluate(() => {
      const fromInput = Array.from(document.querySelectorAll("input,textarea"))
        .map((i) => (i as HTMLInputElement).value)
        .find((v) => /\/obs\/form\/[0-9a-f-]{36}\?/i.test(v || ""));
      if (fromInput) return fromInput;
      return (document.body.innerHTML.match(/https?:\/\/[^"'<>\s]*\/obs\/form\/[^"'<>\s]+/i) ?? [])[0] ?? "";
    });
    if (!link) throw new Error("No Application link on this page — is the Pre-Application approved?");
    return link.replace(/&amp;/g, "&");
  }
}
