/**
 * EAINT-12341 — the chains (test data) for SRD v1.3, and which real company
 * each one spends.
 *
 * SRD v1.3 (29.09.2026) removed the guideline determination (REQ-003/004):
 * every UCD gets the same combined Email Template 1. So the template no longer
 * depends on the company structure, and ONE approved chain feeds many test
 * scenarios. The chains below exist to prove "same template regardless"
 * (REQ-005 Example 1 / Example 2) across business types — see the workbook
 * `02-plan/EAINT-12341_Test_Case_v1.3.xlsx`, sheet "Test Data & Chains".
 *
 * ONE COMPANY, ONE USE. `company-ledger.json` beside this folder records every
 * company the moment it is claimed, and the chain refuses one already in it.
 * The three companies spent by the v1.1 attempts stay spent.
 *
 * COMPANIES ARE NOT ASSIGNED YET (open question Q-20): take PASS rows from a
 * fresh company-details-checker sheet. A chain with no company refuses to run.
 *
 * Email checks are manual, in Mailtrap, against what the run prints.
 */
import type { SsmType } from "@data/ssm";

export interface Company {
  /** As the checker sheet prints it, e.g. `639691-H`, `LLP0035174-LGN`. For Business Trading: the licence no. */
  roc: string;
  /** 12-digit new number. Empty for Business Trading. */
  newRoc: string;
  tin: string;
  /** The checker-sheet row, so a human can find it again. 0 for Business Trading. */
  sheetRow: number;
}

export type ChainType = SsmType | "TRADING";

export interface ChainScenario {
  id: string;
  /** The workbook's Business Type column, for the run log. */
  businessType: string;
  type: ChainType;
  sheetCount: string;
  sheetNationality: string;
  /** The workbook test scenarios this chain's approval feeds. */
  covers: string[];
  /** People to seed in eSim (SSM types), or to type (Business Trading). */
  seed: { directors: number; foreign?: number; secretaries?: number; shareholders?: number };
  /** Where the chain stops. CH6 must stop at Submitted (no-email checks, then a manual revert). */
  stopAt: "approved" | "submitted";
  /** Unset until a PASS row is assigned (Q-20). */
  company?: Company;
  /** Business Trading only. */
  trading?: {
    region: "SABAH" | "SARAWAK";
    /** File under automation/fixtures/uploads/ — pdf/png/jpg, max 5MB. */
    licenceFile: string;
    /** TIN to use — Application step 1 makes TIN mandatory (Q-20). */
    tin?: string;
  };
  note?: string;
}

const ROB = "Sole Proprietorship / Partnership";

export interface Person {
  name: string;
  /** 12 digits, no dashes (ROB Current Owner Info / LLP). */
  icPlain: string;
  /** With dashes (ROC Page 3): 690501-13-7631. */
  icDashed: string;
  foreign: boolean;
}

/**
 * The people the TESTER types into eSim for a chain (eSim is set up by hand —
 * see 02-plan/EAINT-12341_eSim_Setup.xlsx, generated from the same rule).
 * Malaysians first, foreigners LAST, so "QA DIRECTOR A" is always a Malaysian
 * with a 12-digit MyKad — the Main User the robot picks on Application step 3.
 *
 * Foreign ID format is NOT confirmed (asked 02.10.2026): a passport-style
 * "A1234567x" is used.
 */
export function chainPeople(s: ChainScenario): Person[] {
  const foreign = s.seed.foreign ?? 0;
  return Array.from({ length: s.seed.directors }, (_, i) => {
    const isForeign = i >= s.seed.directors - foreign;
    const ic = isForeign ? `A1234567${i}` : `${690501 + i}13${7631 + i}`;
    return {
      name: `QA DIRECTOR ${String.fromCharCode(65 + i)}`,
      icPlain: ic,
      icDashed: isForeign ? ic : `${ic.slice(0, 6)}-${ic.slice(6, 8)}-${ic.slice(8)}`,
      foreign: isForeign,
    };
  });
}

export const SCENARIOS: ChainScenario[] = [
  {
    id: "12341_CH1", businessType: ROB, type: "ROB", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["TS01", "TS02", "TS03", "TS04", "TS05", "TS06", "TS11", "TS12", "TS13", "TS14", "TS16", "TS17",
             "TS18", "TS21", "TS22", "TS23", "TS24", "TS26"],
    seed: { directors: 4 }, stopAt: "approved",
    // company: { roc: "", newRoc: "", tin: "D…", sheetRow: 0 },   // Q-20: PASS row, TIN prefix D
    note: "Primary chain. After the email checks, the same Application is used for TS26 (hardcopy resubmission, manual).",
  },
  {
    id: "12341_CH2", businessType: ROB, type: "ROB", sheetCount: "5", sheetNationality: "All Malaysian",
    covers: ["TS07", "TS15", "TS21"],
    seed: { directors: 5 }, stopAt: "approved",
    // company: Q-20 — PASS row, TIN prefix D
  },
  {
    id: "12341_CH3", businessType: "Sdn Bhd / Bhd", type: "ROC", sheetCount: "3", sheetNationality: "2 Malaysian, 1 Foreigner",
    covers: ["TS08", "TS15", "TS19", "TS21"],
    seed: { directors: 3, foreign: 1 }, stopAt: "approved",
    // company: Q-20 — PASS row, TIN prefix C
  },
  {
    id: "12341_CH8", businessType: "Sdn Bhd / Bhd", type: "ROC", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["TS08A", "TS15", "TS19", "TS21"],
    seed: { directors: 4 }, stopAt: "approved",
    // company: tab "1 Companies" — PASS row, TIN prefix C (added 02.10.2026 at the QA's request)
  },
  {
    id: "12341_CH4", businessType: "LLP", type: "LLP", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["TS09", "TS15", "TS19", "TS21"],
    seed: { directors: 4 }, stopAt: "approved",
    // company: Q-20 — PASS row, TIN prefix PT. LLP0035174-LGN (row 37) was the only usable LLP on the 23.09 sheet
    // and has NOT been spent — it may be reused here if it is still PASS on the new sheet.
  },
  {
    id: "12341_CH5", businessType: "Business Trading (Sabah)", type: "TRADING", sheetCount: "2 (typed)",
    sheetNationality: "All Malaysian",
    covers: ["TS10", "TS15", "TS20", "TS21"],
    seed: { directors: 2 }, stopAt: "approved",
    trading: { region: "SABAH", licenceFile: "trading-licence.pdf" /* , tin: Q-20 — or tab "1 Companies" */ },
    note: "Non-SSM. Letter BRN fields expected TBC (Q-09). First run of the Business Trading path in this chain — watch it.",
  },
  {
    id: "12341_CH7", businessType: "Business Trading (Sarawak)", type: "TRADING", sheetCount: "2 (typed)",
    sheetNationality: "All Malaysian",
    covers: ["TS10", "TS15", "TS20", "TS21"],
    seed: { directors: 2 }, stopAt: "approved",
    trading: { region: "SARAWAK", licenceFile: "trading-licence.pdf" /* , tin: Q-20 — or tab "1 Companies" */ },
    note: "Non-SSM, Sarawak. Run after CH5 has worked.",
  },
  {
    id: "12341_CH6", businessType: ROB, type: "ROB", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["TS25"],
    seed: { directors: 4 }, stopAt: "submitted",
    // company: Q-20 — PASS row
    note: "Stops at Submitted. Check Mailtrap (quiet window), then Revert to UCD by hand and check again.",
  },
];

/** Every company assigned above is distinct — checked at load, not trusted. */
{
  const seen = new Map<string, string>();
  for (const s of SCENARIOS) {
    if (!s.company) continue;
    for (const key of [s.company.roc, s.company.newRoc, s.company.tin].filter(Boolean)) {
      const prior = seen.get(key);
      if (prior) throw new Error(`${key} is assigned to both ${prior} and ${s.id} — one company, one use.`);
      seen.set(key, s.id);
    }
  }
}
