/**
 * DRY RUN. Shows what the robot WOULD write to eSim for one chain, and writes
 * nothing.
 *
 *   npm run preview -- 12341_CH1
 *
 * Saves the rows to test-results/preview-<chain>.json and prints a summary.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadSettings } from "./load-env";
loadSettings();

import { EsimClient } from "@fixtures/esim";
import { seedCompany } from "@data/ssm-seed";
import { SCENARIOS } from "../../cr/EAINT-12341/03-spec/chain-scenarios";

async function main(): Promise<void> {
  const id = process.argv[2];
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown chain "${id ?? ""}". Use one of: ${SCENARIOS.map((x) => x.id).join(", ")}`);
  if (s.type === "TRADING") throw new Error(`${id} is Business Trading — nothing is written to eSim for it.`);
  if (!s.company) throw new Error(`${id} has no company assigned yet in chain-scenarios.ts.`);

  const m = s.company.roc.match(/^(.+)-([A-Z])$/);
  const keys = m
    ? { roc: m[1], newRoc: s.company.newRoc, checkDigit: m[2] }
    : { roc: s.company.roc, newRoc: s.company.newRoc, checkDigit: null };

  const sim = new EsimClient();
  await sim.connect();
  const r = await seedCompany(sim, {
    type: s.type,
    keys,
    companyName: `QA ${s.id.replace("_", " ")} (preview)`,
    remark: "preview only",
    dryRun: true,
    ...s.seed,
  });
  const out = path.join(__dirname, "..", "test-results", `preview-${id}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(r, null, 2), "utf8");

  console.log(`\nPREVIEW ${id} — NOTHING WRITTEN`);
  console.log(`  company     ${s.company.roc} / ${s.company.newRoc}  (eSim roc=${keys.roc} checkDigit=${keys.checkDigit})`);
  console.log(`  template    copied from donor row id=${r.donorId}`);
  console.log(`  enquiry     would be ${r.enquiry.action}${r.enquiry.id ? ` (id=${r.enquiry.id})` : ""}`);
  console.log(`  submission  would be ${r.submission.action}${r.submission.id ? ` (id=${r.submission.id})` : ""}`);
  for (const [col, p] of Object.entries(r.people)) {
    console.log(`  people      ${col}: person block <${p.personTag}>, IC <${p.icTag}>, name <${p.nameTag ?? "?"}>, donor had ${p.donorPeople}, writing ${p.written}`);
  }
  for (const w of r.warnings) console.log(`  ⚠ ${w}`);
  console.log(`\nFull rows saved to:\n  ${out}\nSend that file to QA support before the first real run.`);
}

main().catch((e) => {
  console.error(`\n✘ Preview FAILED: ${(e as Error).message}`);
  process.exit(1);
});
