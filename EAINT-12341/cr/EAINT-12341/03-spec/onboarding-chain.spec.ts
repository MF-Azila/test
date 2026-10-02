// EAINT-12341 (SRD v1.3) — the onboarding chain, per chain, up to the approval
// that fires the new emails. EMAIL CHECKS ARE NOT HERE: they are done by hand in
// Mailtrap against the expected sheet each run writes to 04-runs/.
//
//   (PowerShell)  $env:HEADED=1; $env:CHAIN_SCENARIO="12341_CH1"; npx playwright test --project=cr
//
// One chain per run, named in CHAIN_SCENARIO — every other chain is skipped,
// so a bare `--project=cr` spends nothing. Each run SPENDS a real company
// (see company-ledger.ts) and a one-shot approval, and needs a human for one
// reCAPTCHA tick.
//
// eSim is SET UP BY HAND by the tester before the run (ESIM_SETUP=manual,
// the default) from 02-plan/EAINT-12341_eSim_Setup.xlsx. ESIM_SETUP=robot
// makes the robot write it instead (rebuilt client, unverified).
// Payment is done BY HAND (PAYMENT=manual, the default): the robot opens the
// payment window and waits for the Pre-Application summary page.
//
// Optional identity (open question Q-21), defaults in brackets:
//   QA_TESTER        name typed as Admin In Charge          ["QA AUTOMATION"]
//   QA_EMAIL_PREFIX  local part prefix of every address     ["qa.eaint12341"]
//   QA_EMAIL_DOMAIN  domain of every address                ["modefair.com"]
//
// Steps:
//   1. seed the company's SSM document in eSim (SSM types only)
//   2. submit the Pre-Application and pay
//   3. approve the Pre-Application in BackOffice
//   4. open the Application, fill it (directors from SSM or typed)
//   5. upload, acknowledge, submit
//   6. assignee submits for approval, approver approves   (CH5 stops before)
//   7. write 04-runs/<chain>_<run>.md — the expected emails and letter
import { test } from "@fixtures";
import * as fs from "node:fs";
import * as path from "node:path";
import { PreApplicationPage, BUSINESS_TYPE, type BusinessType } from "@pages/obs/pre-application.page";
import { BackOfficePage, BO_MENU } from "@pages/obs/backoffice.page";
import { ApplicationPage } from "@pages/obs/application.page";
import { completePayment } from "@pages/obs/fiuu.page";
import { LoginPage } from "@auth/login";
import { EsimClient } from "@fixtures/esim";
import { seedCompany, type SeedKeys } from "@data/ssm-seed";
import { SCENARIOS, chainPeople, type ChainScenario, type ChainType, type Company } from "./chain-scenarios";
import { claim, record } from "./company-ledger";
import { companyFromSheet } from "@data/company-sheet";

/** The tester fills tab "1 Companies" here; the robot reads it. */
const COMPANY_SHEET = path.join(__dirname, "..", "02-plan", "EAINT-12341_eSim_Setup.xlsx");
import { renderExpected, stamp, type RunFacts } from "./expected-emails";

const FIXTURES = path.join(__dirname, "..", "..", "..", "automation", "fixtures", "uploads");
const RUNS = path.join(__dirname, "..", "04-runs");
const NL = String.fromCharCode(10);
const log = (s: string) => console.log(s);

const TESTER = (process.env.QA_TESTER ?? "QA AUTOMATION").toUpperCase();
const EMAIL_PREFIX = (process.env.QA_EMAIL_PREFIX ?? "qa.eaint12341").toLowerCase();
const EMAIL_DOMAIN = (process.env.QA_EMAIL_DOMAIN ?? "modefair.com").toLowerCase();

/**
 * Admin In Charge and Director in Charge get DIFFERENT name, mobile and email
 * on purpose: SRD v1.3 does not say which one is "the UCD email captured in
 * the Application" or Template 3's contact person (Q-04), so the emails will
 * show which source the system took.
 */
const ADMIN_MOBILE = "0123456789";
const DIRECTOR_MOBILE = "0129876543";

const RADIO: Record<ChainType, BusinessType> = {
  ROB: BUSINESS_TYPE.ROB,
  ROC: BUSINESS_TYPE.ROC,
  LLP: BUSINESS_TYPE.LLP,
  TRADING: BUSINESS_TYPE.TRADING_SABAH,
};

/**
 * How a real registration number is split between eSim's `roc` and
 * `checkDigit`, and what the Pre-Application's Old BRN field takes.
 *
 * SPLIT, settled 2026-09-24 (corrected the same day — "whole" was wrong).
 * eAuto builds the Old BRN as `roc + "-" + checkDigit`, and a blank check
 * digit comes out as "A" (QA243107 seeded blank displayed "QA243107-A").
 * Seeded WHOLE, a real number doubles its letter: `IP0581553-U` became
 * `IP0581553-U-A` in the BackOffice listing, the SSM document fetch missed and
 * SSM Status read Failed — which is what sent the v1.1 E2E1 run
 * (P260924/00874) to typed directors and a locked step-3 MyKad. An LLP's
 * `-LGN` is part of its number and stays whole. NOT YET PROVEN BY A RUN.
 */
const KEY_FORMAT: "unconfirmed" | "split" | "whole" = "split";

function esimKeys(c: Company): SeedKeys {
  if (KEY_FORMAT === "unconfirmed") {
    throw new Error(
      "KEY_FORMAT is unconfirmed. Run `npx tsx scripts/seed-ssm.ts --inspect` and set KEY_FORMAT in " +
        "onboarding-chain.spec.ts. Nothing has been written.",
    );
  }
  const m = c.roc.match(/^(.+)-([A-Z])$/);
  if (KEY_FORMAT === "split" && m) return { roc: m[1], newRoc: c.newRoc, checkDigit: m[2] };
  return { roc: c.roc, newRoc: c.newRoc, checkDigit: null };
}

function companyName(s: ChainScenario): string {
  const suffix: Record<ChainType, string> = { ROB: "ENTERPRISE", ROC: "SDN BHD", LLP: "PLT", TRADING: "TRADING" };
  return `QA ${s.id.replace("_", " ")} ${suffix[s.type]}`;
}

/**
 * The company to claim — from chain-scenarios.ts, else from the tester's eSim
 * setup sheet. For Business Trading a generated licence stands in for the BRN.
 */
async function companyFor(s: ChainScenario, runId: string): Promise<Company> {
  if (s.type === "TRADING") {
    const tin = s.trading?.tin ?? (await companyFromSheet(s.id, COMPANY_SHEET, { tinOnly: true }))?.tin;
    if (!tin) {
      throw new Error(
        `${s.id}: no TIN for the Business Trading run. Fill the TIN cell of its row in tab "1 Companies" of ` +
          `${COMPANY_SHEET}. Nothing has been written.`,
      );
    }
    // Licence: min 4 chars, letters / digits / "/" (pre-application.page.ts).
    return { roc: `QA/12341/${runId.toUpperCase()}`, newRoc: "", tin, sheetRow: 0 };
  }
  const company = s.company ?? (await companyFromSheet(s.id, COMPANY_SHEET));
  if (!company) {
    throw new Error(
      `${s.id}: no company assigned. Fill its row in tab "1 Companies" of ${COMPANY_SHEET} ` +
        "(PASS row from the company-details-checker sheet). Nothing has been written.",
    );
  }
  // A company in the wrong row (e.g. a sole proprietor typed in a Sdn Bhd row)
  // would spend it on the wrong test. The TIN prefix gives the type away.
  const prefix: Record<string, RegExp> = { ROC: /^C/, ROB: /^(D|IG)/, LLP: /^PT/ };
  if (!prefix[s.type].test(company.tin)) {
    throw new Error(
      `${s.id} is a ${s.businessType} run, but TIN ${company.tin} does not start with ` +
        `${{ ROC: "C", ROB: "D or IG", LLP: "PT" }[s.type as "ROC" | "ROB" | "LLP"]} — is the company in the right row? ` +
        "Nothing has been written.",
    );
  }
  if (s.type === "LLP" && !/^LLP/i.test(company.roc)) {
    throw new Error(`${s.id} is an LLP run, but ${company.roc} is not an LLP number. Nothing has been written.`);
  }
  return company;
}

for (const s of SCENARIOS) {
  test(`${s.id} — ${s.type}, ${s.sheetCount}, ${s.sheetNationality} → ${s.stopAt} [${s.covers.join(" ")}]`, async ({
    page,
    context,
    browser,
  }) => {
    test.skip(
      process.env.CHAIN_SCENARIO !== s.id,
      `CHAIN_SCENARIO is "${process.env.CHAIN_SCENARIO ?? ""}" — only the named chain runs`,
    );
    test.setTimeout(40 * 60 * 1000);
    const runId = Date.now().toString(36);
    const tag = s.id.toLowerCase().replace("12341_", "");
    const adminEmail = `${EMAIL_PREFIX}.${tag}.${runId}@${EMAIL_DOMAIN}`;
    const directorEmail = `${EMAIL_PREFIX}.dir.${tag}.${runId}@${EMAIL_DOMAIN}`;
    const name = companyName(s);
    const trading = s.type === "TRADING";
    const company = await companyFor(s, runId);
    const showroom = { address: "NO 1, JALAN QA AUTOMATION", postcode: "43000", state: "SELANGOR", city: "BATU CAVES" };
    // The people in eSim, exactly as the eSim setup sheet lists them.
    // Malaysians first, so person 0 (QA DIRECTOR A) is the Main User.
    const people = chainPeople(s);
    const names = people.map((p) => p.name);
    const mainUserIndex = 0;
    const esimByHand = (process.env.ESIM_SETUP ?? "manual").toLowerCase() !== "robot";
    const payByHand = (process.env.PAYMENT ?? "manual").toLowerCase() !== "auto";

    const facts: RunFacts = {
      chainId: s.id,
      covers: s.covers,
      stoppedAt: "(failed before the end — see the ledger)",
      companyName: name,
      oldBrn: company.roc,
      newBrn: company.newRoc,
      tin: company.tin,
      admin: { name: `${TESTER} ADMIN`, mobile: ADMIN_MOBILE, email: adminEmail },
      director: { name: names[mainUserIndex], mobile: DIRECTOR_MOBILE, email: directorEmail },
      showroomAddress: `${showroom.address}, ${showroom.postcode} ${showroom.city}, ${showroom.state}`,
    };
    const writeExpected = () => {
      fs.mkdirSync(RUNS, { recursive: true });
      const file = path.join(RUNS, `${s.id}_${runId}.md`);
      fs.writeFileSync(file, renderExpected(facts), "utf8");
      return file;
    };

    // ── 1. claim the company, then seed it ─────────────────────────────────
    claim(s.id, company);
    let stage = "seed";
    try {
      if (!trading && esimByHand) {
        log(
          `${NL}=== ${s.id} · eSim set up BY HAND (ESIM_SETUP=manual) — the robot does not touch eSim.` +
            `${NL}    Expected in eSim: ${company.roc} / ${company.newRoc}, ${people.length} people: ` +
            people.map((p) => `${p.name} ${s.type === "ROC" ? p.icDashed : p.icPlain}`).join(", "),
        );
      } else if (!trading) {
        const esim = new EsimClient();
        await esim.connect();
        const seeded = await seedCompany(esim, {
          type: s.type as Exclude<ChainType, "TRADING">,
          keys: esimKeys(company),
          companyName: name,
          remark: `${TESTER} - QA automation EAINT-12341 ${s.id}`,
          ...s.seed,
        }).finally(() => esim.close());
        log(
          `${NL}=== ${s.id} · seeded ${s.type} ${seeded.roc} / ${seeded.newRoc} ` +
            `(enquiry ${seeded.enquiry.action}, submission ${seeded.submission.action}) · ` +
            `people counted ${seeded.expectedCount}`,
        );
        for (const w of seeded.warnings) log(`  eSim template warning: ${w}`);
      } else {
        log(`${NL}=== ${s.id} · Business Trading — no eSim seed, licence ${company.roc}`);
      }
      record(s.id, "seeded", { companyName: name, ucdEmail: adminEmail });

      // ── 2. Pre-Application ───────────────────────────────────────────────
      stage = "pre-application";
      const preApp = new PreApplicationPage(page);
      const gateMs = Number(process.env.GATE_MINUTES ?? 20) * 60_000;
      if ((await preApp.open()) === "recaptcha") await preApp.waitForHuman(gateMs);
      const keys = trading ? undefined : esimKeys(company);
      let licenceFile: string | undefined;
      if (trading) {
        licenceFile = path.join(FIXTURES, s.trading!.licenceFile);
        if (!fs.existsSync(licenceFile)) throw new Error(`Licence file not found: ${licenceFile}`);
      }
      await preApp.fillForm({
        businessName: name,
        businessType:
          s.type === "TRADING" && s.trading?.region === "SARAWAK" ? BUSINESS_TYPE.TRADING_SARAWAK : RADIO[s.type],
        // What eSim holds as `roc` — WITHOUT its check letter when split.
        // eAuto appends the letter itself; typing it too doubles it.
        oldBrn: keys?.roc,
        newBrn: trading ? undefined : company.newRoc,
        tradingLicenceNo: trading ? company.roc : undefined,
        tradingLicenceFile: licenceFile,
        tin: company.tin,
        showroomAddress: showroom.address,
        showroomPostcode: showroom.postcode,
        showroomState: showroom.state,
        showroomCity: showroom.city,
        adminName: facts.admin.name,
        mobileNo: ADMIN_MOBILE,
        adminEmail,
      });
      // A real ROC / new ROC / TIN must pass LHDN; its warning means the trio
      // does not match — stop BEFORE paying rather than chain on a bad record.
      const warnings = await preApp.next();
      if (warnings.some((w) => /TIN is invalid/i.test(w))) {
        throw new Error(`LHDN rejected TIN ${company.tin} for ${company.roc} / ${company.newRoc || "(trading)"}.`);
      }
      await page.locator("#business-review-section").waitFor({ state: "visible", timeout: 20_000 });
      const review = (await page.locator("#business-review-section").innerText()).replace(/\s+/g, " ");
      if (!trading) {
        // The review shows "<new BRN> (<old BRN as eAuto built it>)". It must
        // be the sheet's number exactly — a doubled letter ("…-U-A") makes the
        // SSM document fetch fail. Checked BEFORE paying.
        const shownOld = new RegExp(`${company.newRoc}\\s*\\(([^)]+)\\)`).exec(review)?.[1]?.trim() ?? "";
        log(`  review shows old BRN "${shownOld || "(not found)"}" — expected "${company.roc}"`);
        if (shownOld !== company.roc) {
          throw new Error(
            `The review shows old BRN "${shownOld || "(none)"}" for ${company.newRoc}, not "${company.roc}". ` +
              "Stopped before paying — the SSM document fetch would miss.",
          );
        }
        if (/Business Trading/i.test(review)) {
          throw new Error(`The SSM lookup did not resolve ${company.newRoc} — the form fell back to Business Trading.`);
        }
      }

      await preApp.choosePayment("Online Banking (Personal)");
      const gatewayOpens = context.waitForEvent("page", { timeout: 60_000 }).catch(() => null);
      await preApp.submitAndPay(30_000);
      const gateway = await gatewayOpens;
      if (payByHand) {
        log(
          `${NL}*** PAYMENT — please complete the payment in the payment window${gateway ? "" : " (or the main window)"}. ***` +
            `${NL}    The robot waits up to ${Math.round(gateMs / 60_000)} minutes for the Pre-Application summary page.${NL}`,
        );
        await page.waitForURL(/\/obs\/preOnb\/summary\//, { timeout: gateMs });
      } else {
        if (!gateway) throw new Error("The FPX gateway never opened its window.");
        await gateway.waitForLoadState("domcontentloaded").catch(() => undefined);
        await completePayment(gateway);
        await page.waitForURL(/\/obs\/preOnb\/summary\//, { timeout: 180_000 });
      }
      const summary = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      const preAppNo = summary.match(/P\d{6}\/\d{5}/)?.[0];
      if (!preAppNo) throw new Error("Paid, but no Pre-Application number on the summary page.");
      facts.preApplicationNo = preAppNo;
      record(s.id, "pre-application-paid", { preApplicationNo: preAppNo });
      log(`  pre-application ${preAppNo} paid`);

      // ── 3. BackOffice approves the Pre-Application (approver) ────────────
      stage = "pre-application approval";
      const boPage = await context.newPage();
      await new LoginPage(boPage).as("bo");
      const bo = new BackOfficePage(boPage, context);
      await bo.settle();
      await bo.openListing(BO_MENU.preApplicationListing);
      await bo.search({ preOnboardingNo: preAppNo });
      // SSM Status: whether eAuto fetched the SSM document from eSim. "Failed"
      // means the Application falls back to typed directors and its step-3
      // MyKad stays locked (v1.1 E2E1, P260924/00874). Stop before approving.
      const ssmStatus = (await bo.readRow(preAppNo))["SSM Status"] ?? "(no column)";
      log(`  SSM Status ${ssmStatus}`);
      record(s.id, "pre-application-paid", { note: `SSM Status ${ssmStatus}` });
      if (!trading && !/^OK$/i.test(ssmStatus)) {
        throw new Error(
          `SSM Status is "${ssmStatus}" for ${preAppNo}: eAuto did not fetch the SSM document from eSim, ` +
            "so the Application would fall back to typed directors and cannot be submitted.",
        );
      }
      const preDetail = await bo.openRow(preAppNo);
      await bo.approvePreApplication(preDetail);
      facts.preApprovedAt = new Date();
      const link = await bo.applicationLink(preDetail);
      record(s.id, "pre-application-approved");
      log(`  pre-application approved ${stamp(facts.preApprovedAt)}`);

      // ── 4–5. the Application ─────────────────────────────────────────────
      stage = "application";
      const appPage = await context.newPage();
      const application = new ApplicationPage(appPage);
      await application.open(link);
      const details = {
        tin: company.tin,
        directorMobile: DIRECTOR_MOBILE,
        directorEmail,
        picMyKad: "690501137631",
        directorName: names[mainUserIndex],
        directorMyKad: people[mainUserIndex].icPlain,
      };
      await application.fillBusinessInformation(details);
      await application.goToUploads();

      // Step 2 may ask for the directors instead of taking them from SSM
      // (always for Business Trading; seen on SSM companies since 2026-09-23).
      const manual = await application.directorEntryIsManual();
      if (manual) await application.setDirectors(names);
      log(`  director entry: ${manual ? "MANUAL — count chosen and names typed" : "prefilled from SSM"}`);
      test.info().annotations.push({ type: "director-entry", description: manual ? "manual" : "ssm-prefill" });

      // Reported, not asserted: under v1.3 the director count no longer
      // decides anything, but a mismatch is still worth a look.
      const rows = await appPage.locator('[id^="director-identity-browse-file"]').count();
      log(`  director upload rows ${rows}, people seeded/typed ${s.seed.directors}` +
        (s.seed.foreign ? ` (${s.seed.foreign} foreign)` : ""));

      await application.uploadAll(FIXTURES);
      await application.goToAcknowledgement();
      const mainUser = await application.fillAcknowledgement(details);
      facts.director.name = mainUser.replace(/\s*\(.*\)\s*$/, "") || facts.director.name;
      log(`  main user ${mainUser}`);
      await application.submit();
      facts.submittedAt = new Date();

      await bo.openListing(BO_MENU.applicationListing);
      const appRow = await bo.search({ companyName: name });
      const appNo = appRow.match(/NA\d{8}/)?.[0];
      if (!appNo) throw new Error(`Submitted, but no NA number in the Application listing for "${name}".`);
      facts.applicationNo = appNo;
      record(s.id, "application-submitted", { applicationNo: appNo });
      log(`  application ${appNo} submitted ${stamp(facts.submittedAt)}`);
      facts.stoppedAt = "Application Submitted";

      // ── 6. assignee → approver ───────────────────────────────────────────
      if (s.stopAt === "approved") {
        stage = "application approval";
        const adminContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1920, height: 1080 } });
        const adminPage = await adminContext.newPage();
        await new LoginPage(adminPage).as("boAdmin");
        const assignee = new BackOfficePage(adminPage, adminContext);
        await assignee.settle();
        await assignee.openListing(BO_MENU.applicationListing);
        await assignee.search({ companyName: name });
        await assignee.submitForApproval(await assignee.openRow(appNo));
        log(`  submitted for approval (assignee)`);
        await adminContext.close();

        await bo.openListing(BO_MENU.applicationListing);
        await bo.search({ companyName: name });
        await bo.approveApplication(await bo.openRow(appNo));
        facts.approvedAt = new Date();
        facts.stoppedAt = "Application Approved";
        record(s.id, "application-approved");
        log(`  application approved (approver) ${stamp(facts.approvedAt)}`);
      }

      // ── 7. what the tester needs for Mailtrap ────────────────────────────
      const file = writeExpected();
      log(
        [
          ``,
          `=== ${s.id} — READY FOR MANUAL EMAIL CHECK ===`,
          `  stopped at        ${facts.stoppedAt}`,
          `  covers            ${s.covers.join(", ")}`,
          `  admin email       ${adminEmail}`,
          `  director email    ${directorEmail}`,
          `  application no    ${appNo}`,
          `  pre-application   ${preAppNo}`,
          `  company name      ${name}`,
          `  BRN / licence     ${company.roc}${company.newRoc ? ` / ${company.newRoc}` : ""}`,
          `  TIN               ${company.tin}`,
          `  pre-app approved  ${stamp(facts.preApprovedAt)}`,
          `  submitted         ${stamp(facts.submittedAt)}`,
          `  approved          ${stamp(facts.approvedAt)}`,
          `  expected sheet    ${file}`,
          s.note ? `  note              ${s.note}` : ``,
        ].join(NL),
      );
      test.info().annotations.push(
        { type: "application-no", description: appNo },
        { type: "ucd-email", description: adminEmail },
        { type: "expected-sheet", description: file },
      );
    } catch (err) {
      record(s.id, "failed", { error: `${stage}: ${(err as Error).message}`.slice(0, 500) });
      // Whatever was reached is still useful for the manual check / defect.
      try {
        log(`  partial expected sheet ${writeExpected()}`);
      } catch {
        /* never mask the real failure */
      }
      throw err;
    }
  });
}
