/**
 * One company, one use — enforced, not remembered.
 *
 * `../company-ledger.json` holds every real company this ticket has spent. A
 * company goes in BEFORE anything is written to eSim, and it never comes out:
 * a chain that fails half way can still have registered the BRN or the TIN
 * somewhere, and reusing it then tests a duplicate-registration path instead
 * of the scenario.
 *
 * If a run fails and the company genuinely was not consumed, taking it off
 * the ledger is a human decision — edit the JSON by hand and say why in
 * `note`.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { Company } from "./chain-scenarios";

export const LEDGER_PATH = path.join(__dirname, "..", "company-ledger.json");

export type LedgerStatus =
  | "seeded"
  | "pre-application-paid"
  | "pre-application-approved"
  | "application-submitted"
  | "application-approved"
  | "failed";

export interface LedgerEntry {
  scenario: string;
  roc: string;
  newRoc: string;
  tin: string;
  sheetRow: number;
  status: LedgerStatus;
  firstUsed: string;
  updated: string;
  companyName?: string;
  ucdEmail?: string;
  preApplicationNo?: string;
  applicationNo?: string;
  error?: string;
  note?: string;
}

function read(): LedgerEntry[] {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")) as LedgerEntry[];
}

function write(rows: LedgerEntry[]): void {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(rows, null, 2) + "\n", "utf8");
}

/** The entry already holding any of this company's keys, if one does. */
export function findUse(c: Company): LedgerEntry | undefined {
  // Empty keys never match: a Business Trading chain has no new BRN, and two of
  // them must not collide on "".
  const same = (a: string, b: string) => !!a && a === b;
  return read().find((e) => same(e.roc, c.roc) || same(e.newRoc, c.newRoc) || same(e.tin, c.tin));
}

/**
 * Claim a company for a scenario, or throw naming who already has it.
 *
 * Called before the seed, so even a seed that fails leaves the claim behind.
 */
export function claim(scenario: string, c: Company): void {
  const prior = findUse(c);
  if (prior) {
    throw new Error(
      `${c.roc} / ${c.newRoc} / ${c.tin} was already used by ${prior.scenario} ` +
        `(status "${prior.status}", ${prior.firstUsed}). One company, one use — assign a new ` +
        "PASS row from the company-details-checker sheet in chain-scenarios.ts.",
    );
  }
  const now = new Date().toISOString();
  write([
    ...read(),
    {
      scenario,
      roc: c.roc,
      newRoc: c.newRoc,
      tin: c.tin,
      sheetRow: c.sheetRow,
      status: "seeded",
      firstUsed: now,
      updated: now,
    },
  ]);
}

/** Move a claimed company on, recording whatever the chain has learned. */
export function record(
  scenario: string,
  status: LedgerStatus,
  extra: Partial<Omit<LedgerEntry, "scenario" | "status">> = {},
): void {
  const rows = read();
  const row = rows.find((e) => e.scenario === scenario);
  if (!row) throw new Error(`${scenario} has no ledger entry — claim() must run first.`);
  Object.assign(row, extra, { status, updated: new Date().toISOString() });
  write(rows);
}
