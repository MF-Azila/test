import type { Page } from "@playwright/test";
import * as path from "node:path";
import { step } from "@fixtures/step";
import { settleObs, confirmObsDialog, submitUntilConfirmed, visibleFormStep, type FormStep } from "./obs-page";

/**
 * The Application form — the dealer's half, reached by the signed link a
 * Pre-Application carries once BackOffice approves it.
 *
 * `/obs/form/<uuid>?id=<OLD-BRN>&s=<token>&v=1`, and **no reCAPTCHA**: the gate
 * is only on the public Pre-Application form, so everything here is unattended.
 *
 * Three steps: `1 Business Information · 2 Upload Files · 3 Acknowledgement`.
 * Step 1 arrives prefilled from the Pre-Application — business type, company
 * name, both BRNs, address, postcode, state, city.
 *
 * ── The cycle that every step needs ────────────────────────────────────────
 * Observed 2026-09-22: the TIN check runs inside the "Unsaved
 * Changes" dialog's confirm handler, acknowledges on the
 * FIRST press and only saves on the second. So advancing
 * is a CYCLE of attempts, not a fixed run of clicks — and the same is true of
 * **Submit** on step 3, which cost a run here before it was understood.
 *
 * The TIN warning is non-blocking by design; the page's own copy says "Click
 * Next to proceed". The "TIN verification failed" text that then rides along
 * in the listing's Remarks column is cosmetic.
 */

/** The upload inputs, by id, and what each one wants. Read off staging 2026-09-22. */
export const UPLOAD = {
  businessProfile: "businessProfiles",
  showroomPictures: ["showroom-pic-input-1", "showroom-pic-input-2", "showroom-pic-input-3", "showroom-pic-input-4"],
  showroomVideo: "showroom-vid-input",
  businessCard: "upload-business-card-input",
  businessStamp: "upload-business-stamp-input",
  depositCarsome: "deposit-carsome-input",
  depositCarro: "deposit-carro-input",
  associationFmc: "association-receipt-fmc-input",
  associationMmsda: "association-receipt-mmsda-input",
  associationPekema: "association-receipt-pekema-input",
  rhbOfferLetter: "upload-rhb-offer-letter-input",
  rhbDirectDebit: "upload-rhb-direct-debit-input",
  rhbBodReso: "upload-rhb-bod-reso-input",
  rhbBankStatement: "upload-rhb-bank-statement-input",
  eautoBodReso: "upload-eauto-bod-reso-input",
  lhdnTaxCert: "upload-lhdn-tax-cert-input",
} as const;

/**
 * The director rows are generated — one per COUNTED director from the SSM
 * document — so they are matched by prefix rather than listed.
 */
export const DIRECTOR_UPLOAD_PREFIX = "director-identity-browse-file";

export interface ApplicationDetails {
  /** Mandatory here, though optional on the Pre-Application. */
  tin: string;
  /** Contact details for the director chosen as Main User. */
  directorMobile: string;
  directorEmail: string;
  /**
   * Business Trading only: typed, because there is no SSM document to pick
   * the director from. An SSM company takes both from the dropdown.
   */
  directorName?: string;
  directorMyKad?: string;
  /** The person in charge's MyKad. */
  picMyKad: string;
}

export class ApplicationPage {
  constructor(private readonly page: Page) {}

  /** Open the signed link. It carries its own session; nothing else is needed. */
  @step("Open the Application form")
  async open(link: string): Promise<void> {
    await this.page.goto(link, { waitUntil: "commit" });
    await this.settle();
  }

  /** See `settleObs` — these pages never finish loading. */
  async settle(minChars = 15_000, timeout = 30_000): Promise<number> {
    return settleObs(this.page, minChars, timeout);
  }

  /** See `confirmObsDialog`. Returns "" when no dialog was open. */
  private async clearDialog(names: RegExp): Promise<string> {
    return confirmObsDialog(this.page, names);
  }

  /**
   * Press a control and ride out the acknowledge-then-save cycle.
   *
   * `tries` is a ceiling, not a count: the loop stops as soon as `done()` says
   * the step advanced. A fixed run of clicks stops one short and leaves a
   * dialog open, which reads as a hung form.
   */
  private async pressUntil(
    controlId: string,
    done: () => Promise<boolean>,
    tries = 5,
  ): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
      if (await done()) return true;
      await this.page.locator(`#${controlId}`).click({ timeout: 15_000 }).catch(() => undefined);
      await this.page.waitForTimeout(1_800);
      await this.clearDialog(/^(save & continue|yes|ok|continue|proceed|submit|confirm)$/i);
    }
    return done();
  }

  /**
   * Step 1. TIN is mandatory here, optional on the Pre-Application.
   *
   * A TIN given on the Pre-Application CARRIES OVER: `#tinNo` arrives filled
   * and DISABLED (observed 2026-09-23). Typing into it then waits the full
   * action timeout on a field that will never enable. So the TIN is typed only
   * when the field is editable, and a locked value must be the one sent.
   */
  @step("Complete step 1 — business information")
  async fillBusinessInformation(d: ApplicationDetails): Promise<void> {
    const tin = this.page.locator("#tinNo");
    if (await tin.isEditable().catch(() => false)) {
      await tin.fill(d.tin);
    } else {
      const carried = await tin.inputValue().catch(() => "");
      if (carried !== d.tin) {
        throw new Error(`TIN is locked at "${carried}", but "${d.tin}" was given on the Pre-Application.`);
      }
    }
    // No association: keeps step 2 free of membership-receipt rows
    // (step 1 choices CREATE step 2 upload rows).
    await this.page.locator("#isNoAssociation1").check().catch(() => undefined);
  }

  /** See `visibleFormStep`. The form restores a draft to the step it reached. */
  async currentStep(): Promise<FormStep | 0> {
    return visibleFormStep(this.page);
  }

  /** True once the upload step is on screen — by its container, not its inputs, which are all hidden. */
  private async onUploads(): Promise<boolean> {
    return (await this.currentStep()) === 2;
  }

  @step("Advance to the upload step")
  async goToUploads(): Promise<void> {
    if (!(await this.pressUntil("to-next-step", () => this.onUploads()))) {
      throw new Error("Never reached the upload step — the Unsaved Changes cycle did not clear.");
    }
  }

  /**
   * True when step 2 asks the dealer for the directors instead of taking them
   * from the SSM document: `#numOfDirector` is offered and the first row's
   * name is empty.
   *
   * Observed from 2026-09-23 ~17:40 on SSM companies too (before that, a
   * seeded ROC arrived with its directors' rows already named).
   */
  async directorEntryIsManual(): Promise<boolean> {
    if (!(await this.page.locator("#numOfDirector").isVisible().catch(() => false))) return false;
    return !(await this.page.locator("#director-identity-name1").inputValue().catch(() => ""));
  }

  /**
   * Manual director entry: choose the count, wait for the rows, name them.
   * Returns how many rows ended up on the page.
   *
   * Choosing a count SAVES it at once (`POST /obs/f/draft/no-of-director/save`)
   * and the rows are rebuilt from the answer, so the rows are waited for
   * rather than assumed. Each row is a name box `#director-identity-name<N>`
   * beside a MyKad/passport upload — there is NO IC or nationality field; a
   * foreign director differs only by the document uploaded. Observed
   * 2026-09-24.
   */
  @step("Enter the directors (manual)")
  async setDirectors(names: string[]): Promise<number> {
    const rows = this.page.locator(`[id^="${DIRECTOR_UPLOAD_PREFIX}"]`);
    await this.page.selectOption("#numOfDirector", String(names.length));
    for (let i = 0; i < 30 && (await rows.count()) !== names.length; i++) await this.page.waitForTimeout(500);
    const shown = await rows.count();
    if (shown !== names.length) {
      throw new Error(`Chose ${names.length} director(s) but the page shows ${shown} row(s).`);
    }
    for (let i = 0; i < names.length; i++) {
      const box = this.page.locator(`#director-identity-name${i + 1}`);
      if (!(await box.inputValue().catch(() => ""))) await box.fill(names[i]);
    }
    return shown;
  }

  /**
   * Type a name into every director row whose Name box is empty. Returns how
   * many were typed.
   *
   * Each director row carries a Name box beside its Browse control, validated
   * as letters and spaces ("Invalid characters"). SSM chains have submitted
   * without anything typed here (2026-09-22); the team's notes say a Business
   * Trading row is incomplete until named, since there is no SSM document to
   * name the director from. Only EMPTY boxes are touched either way.
   */
  @step("Name the director rows")
  async fillDirectorNames(name: string): Promise<number> {
    const clean = name.replace(/[^A-Za-z ]+/g, " ").replace(/\s+/g, " ").trim() || "QA DIRECTOR";
    const boxes = await this.page.evaluate((prefix) => {
      const out: string[] = [];
      for (const file of Array.from(document.querySelectorAll(`[id^="${prefix}"]`))) {
        let row: Element | null = file;
        for (let i = 0; i < 4 && row; i++) {
          const text = Array.from(row.querySelectorAll<HTMLInputElement>("input[type=text], input:not([type])")).find(
            (t) => t.offsetParent !== null && !t.value && t.id,
          );
          if (text) {
            out.push(text.id);
            break;
          }
          row = row.parentElement;
        }
      }
      return out;
    }, DIRECTOR_UPLOAD_PREFIX);
    for (const id of boxes) await this.page.fill(`#${id}`, clean);
    return boxes.length;
  }

  /**
   * Put a file into every upload input ON STEP 2.
   *
   * Scoped to `#step2` on purpose: the step-4 Registration Documents inputs
   * share this DOM, hidden, and upload to the server the moment they are
   * given a file — an unscoped loop files registration documents before the
   * Application is even approved.
   *
   * Routing is by what the page says each input wants, not by a fixed list,
   * because the director rows are generated per counted director and the
   * association rows depend on step 1.
   *
   * Limits printed on the page: 1 file, pdf/png/jpg/jpeg, max 5MB. The video
   * input accepts `video/mp4` ONLY.
   */
  @step("Upload the supporting documents")
  async uploadAll(fixtureDir: string): Promise<number> {
    const inputs = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll("#step2 input[type=file]")).map((e, index) => {
        const el = e as HTMLInputElement;
        const near =
          (el.closest("div,td,li,section") as HTMLElement | null)?.innerText?.replace(/\s+/g, " ").trim().slice(0, 80) ?? "";
        return { index, id: el.id, accept: el.accept, near };
      }),
    );

    const file = (name: string) => path.join(fixtureDir, name);
    const pick = (i: { accept: string; near: string }): string => {
      const what = i.near.toLowerCase();
      if (/video/.test(i.accept)) return file("showroom-signboard.mp4");
      if (/picture|showroom/.test(what)) return file("showroom-1.png");
      if (/card/.test(what)) return file("business-card.png");
      if (/stamp/.test(what)) return file("company-stamp.png");
      if (/carsome|carro|auction|deposit/.test(what)) return file("auction-deposit-receipt.pdf");
      if (/fmc|mmsda|pekema|association|membership/.test(what)) return file("mva-receipt.pdf");
      return file("ic-director-1.png");
    };

    let uploaded = 0;
    for (const input of inputs) {
      await this.page
        .locator("#step2 input[type=file]")
        .nth(input.index)
        .setInputFiles(pick(input))
        .then(() => {
          uploaded++;
        })
        .catch(() => undefined);
      await this.page.waitForTimeout(200);
    }
    await this.page.waitForTimeout(2_500);
    return uploaded;
  }

  /** True once the acknowledgement step is on screen. */
  private async onAcknowledgement(): Promise<boolean> {
    return (await this.currentStep()) === 3;
  }

  @step("Advance to the acknowledgement step")
  async goToAcknowledgement(): Promise<void> {
    if (!(await this.pressUntil("to-next-step", () => this.onAcknowledgement()))) {
      throw new Error("Never reached the acknowledgement step.");
    }
  }

  /**
   * Step 3 — choose the Main User and fill the contact blocks.
   *
   * For an SSM company `#directorNameDropdown` is populated FROM THE SSM
   * DOCUMENT, so a seeded ROC drives it. Choosing a director auto-fills
   * `#directorMyKad` with that director's seeded IC, which is the cheapest
   * proof the seeding took.
   *
   * Nothing on this step carries a `required` attribute — all validation is
   * JavaScript, same as the Pre-Application.
   */
  @step("Complete step 3 — acknowledgement")
  async fillAcknowledgement(d: ApplicationDetails): Promise<string> {
    // Two shapes, observed 2026-09-23. An SSM company offers
    // `#directorNameDropdown`, populated from the SSM document, and picking a
    // director auto-fills `#directorMyKad`. A Business Trading company has no
    // dropdown at all: `#directorNameInput` and `#directorMyKad` are typed.
    const dropdown = this.page.locator("#directorNameDropdown");
    if (await dropdown.isVisible().catch(() => false)) {
      await dropdown.selectOption({ index: 1 });
      await this.page.waitForTimeout(1_200);
    } else {
      if (!d.directorName || !d.directorMyKad) {
        throw new Error("No director dropdown (not an SSM company) — a director name and MyKad must be typed.");
      }
      await this.page.fill("#directorNameInput", d.directorName);
      await this.page.fill("#directorMyKad", d.directorMyKad);
    }
    const director = await this.page.evaluate(() => ({
      name:
        (document.getElementById("directorNameDropdown") as HTMLSelectElement | null)?.selectedOptions[0]?.text?.trim() ||
        (document.getElementById("directorNameInput") as HTMLInputElement | null)?.value ||
        "",
      mykad: (document.getElementById("directorMyKad") as HTMLInputElement)?.value ?? "",
    }));

    await this.page.fill("#directorMobile", d.directorMobile).catch(() => undefined);
    await this.page.fill("#directorEmail", d.directorEmail).catch(() => undefined);
    await this.page.fill("#picMyKad", d.picMyKad).catch(() => undefined);
    // "Same as Director/Business Owner in Charge" fills the e-invoice block.
    await this.page.locator("#eInvoicePersonInCharge").check().catch(() => undefined);
    await this.page.waitForTimeout(800);

    return `${director.name} (${director.mykad})`;
  }

  /**
   * Submit. The same acknowledge-then-save cycle as advancing a step — see
   * `submitUntilConfirmed`. Returns the confirmation text, or throws.
   */
  @step("Submit the application")
  async submit(): Promise<string> {
    return submitUntilConfirmed(this.page, "to-submit");
  }
}
