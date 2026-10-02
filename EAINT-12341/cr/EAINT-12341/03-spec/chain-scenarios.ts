/**
 * EAINT-12341 — the chains (test data) for SRD v1.3, and which real company
 * each one spends.
 *
 * SRD v1.3 (29.09.2026) removed the guideline determination (REQ-003/004):
 * every UCD gets the same combined Email Template 1. So the template no longer
 * depends on the company structure, and ONE approved chain feeds many test
 * scenarios. The chains below exist to prove "same template regardless"
 * (REQ-005 Example 1 / Example 2) across business types — see the workbook
 * `02-plan/EAINT-12341_Test_Cases_v1.3.xlsx`, sheet "Test Data & Runs".
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
  /** The workbook test cases (sheet "Test Cases", sorted by business type) this run feeds. */
  covers: string[];
  /** People to seed in eSim (SSM types), or to type (Business Trading). */
  seed: { directors: number; foreign?: number; secretaries?: number; shareholders?: number };
  /** Where the chain stops. CH5 must stop at Submitted (no-email checks, then a manual revert). */
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

// Order = execution priority agreed with the QA (02.10.2026):
// Sdn Bhd / Bhd → Sole Proprietorship / Partnership → LLP → Business Trading (Sabah) → (Sarawak).
// CH1 is the main run: it also carries CH1-20 (old email) and CH1-21 (hardcopy regression).
export const SCENARIOS: ChainScenario[] = [
  // ── 1. Sdn Bhd / Bhd ────────────────────────────────────────────────────
  {
    id: "12341_CH1", businessType: "Sdn Bhd / Bhd", type: "ROC", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["CH1-01 … CH1-21"],
    seed: { directors: 4 }, stopAt: "approved",
    note: "Main run — do it first. After the email checks, the same Application is used for CH1-21 (hardcopy resubmission, manual).",
  },
  {
    id: "12341_CH2", businessType: "Sdn Bhd / Bhd", type: "ROC", sheetCount: "3", sheetNationality: "2 Malaysian, 1 Foreigner",
    covers: ["CH2-01 … CH2-19"],
    seed: { directors: 3, foreign: 1 }, stopAt: "approved",
    note: "REQ-005 Example 2 (foreign director) — must get the same email as CH1.",
  },
  // ── 2. Sole Proprietorship / Partnership ────────────────────────────────
  {
    id: "12341_CH3", businessType: ROB, type: "ROB", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["CH3-01 … CH3-19"],
    seed: { directors: 4 }, stopAt: "approved",
  },
  {
    id: "12341_CH4", businessType: ROB, type: "ROB", sheetCount: "5", sheetNationality: "All Malaysian",
    covers: ["CH4-01 … CH4-19"],
    seed: { directors: 5 }, stopAt: "approved",
    note: "REQ-005 Example 2 (5 or more owners) — must get the same email as CH1.",
  },
  {
    id: "12341_CH5", businessType: ROB, type: "ROB", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["CH5-01 … CH5-06"],
    seed: { directors: 4 }, stopAt: "submitted",
    note: "Stops at Submitted. Check Mailtrap (quiet window), then Revert to UCD by hand and check again.",
  },
  // ── 3. LLP ──────────────────────────────────────────────────────────────
  {
    id: "12341_CH6", businessType: "LLP", type: "LLP", sheetCount: "4", sheetNationality: "All Malaysian",
    covers: ["CH6-01 … CH6-19"],
    seed: { directors: 4 }, stopAt: "approved",
    // LLP0035174-LGN (row 37 of the 23.09 sheet) was never spent — reuse only if still PASS.
    note: "LLP is not in the eSimulator guide — confirm the eSim screen first.",
  },
  // ── 4. Business Trading (Sabah) ─────────────────────────────────────────
  {
    id: "12341_CH7", businessType: "Business Trading (Sabah)", type: "TRADING", sheetCount: "2 (typed)",
    sheetNationality: "All Malaysian",
    covers: ["CH7-01 … CH7-19"],
    seed: { directors: 2 }, stopAt: "approved",
    trading: { region: "SABAH", licenceFile: "trading-licence.pdf" /* , tin: or tab "1 Companies" */ },
    note: "Non-SSM. Letter BRN fields expected TBC (Q-09). First run of the Business Trading path — watch it.",
  },
  // ── 5. Business Trading (Sarawak) ───────────────────────────────────────
  {
    id: "12341_CH8", businessType: "Business Trading (Sarawak)", type: "TRADING", sheetCount: "2 (typed)",
    sheetNationality: "All Malaysian",
    covers: ["CH8-01 … CH8-19"],
    seed: { directors: 2 }, stopAt: "approved",
    trading: { region: "SARAWAK", licenceFile: "trading-licence.pdf" /* , tin: or tab "1 Companies" */ },
    note: "Non-SSM, Sarawak. Run after CH7 has worked.",
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
