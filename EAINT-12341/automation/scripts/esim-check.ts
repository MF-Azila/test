/**
 * READ-ONLY. Proves the robot can talk to eSim before any run writes to it.
 *
 *   npm run esim:check
 *
 * 1. logs in to eSim with ESIM_USERNAME / ESIM_PASSWORD
 * 2. reads the SSM entities (count only)
 * 3. saves ONE sample record of each type to test-results/esim-sample.json
 *    so the person-block format can be checked (send that file to QA support)
 *
 * Writes NOTHING to eSim.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadSettings } from "./load-env";
const settings = loadSettings();

import { EsimClient } from "@fixtures/esim";
import { SSM_ENQUIRY_ENTITY, SSM_SUBMISSION_ENTITY, IC_TAGS, type SsmType } from "@data/ssm";

const PEOPLE: Record<SsmType, string> = { ROC: "page3", ROB: "currentOwnerInfo", LLP: "involvements" };

async function main(): Promise<void> {
  console.log(`settings file: ${settings}`);
  const sim = new EsimClient();
  console.log(`eSim: ${sim.base}`);
  await sim.connect();
  console.log("  ✔ login OK");

  const sample: Record<string, unknown> = {};
  const enquiry = await sim.list(SSM_ENQUIRY_ENTITY);
  console.log(`  ✔ ${SSM_ENQUIRY_ENTITY}: ${enquiry.length} rows`);
  sample.enquiry = enquiry.find((r) => !String(r.roc ?? "").startsWith("QA")) ?? enquiry[0];

  for (const [type, entity] of Object.entries(SSM_SUBMISSION_ENTITY) as [SsmType, string][]) {
    try {
      const rows = await sim.list(entity);
      const col = PEOPLE[type];
      const withPeople = rows.filter((r) => String(r[col] ?? "").length > 50);
      const icTag = IC_TAGS[type].find((t) => withPeople.some((r) => String(r[col]).includes(`<${t}>`)));
      console.log(
        `  ✔ ${entity}: ${rows.length} rows, ${withPeople.length} with people in "${col}", ` +
          `IC tag ${icTag ? `<${icTag}>` : "NOT FOUND"}`,
      );
      sample[type] = withPeople[0] ?? rows[0] ?? null;
    } catch (e) {
      console.log(`  ✘ ${entity}: ${(e as Error).message}`);
      sample[type] = { error: (e as Error).message };
    }
  }
  const out = path.join(__dirname, "..", "test-results", "esim-sample.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sample, null, 2), "utf8");
  console.log(`\nSaved one sample record per type to:\n  ${out}\nSend this file to QA support. Nothing was written to eSim.`);
}

main().catch((e) => {
  console.error(`\n✘ eSim check FAILED: ${(e as Error).message}`);
  console.error("Send this whole window's text to QA support.");
  process.exit(1);
});
