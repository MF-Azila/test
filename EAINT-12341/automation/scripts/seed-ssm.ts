/**
 * Seed one company into eSim's SSM simulator — both rows, matched.
 *
 *   npx tsx scripts/seed-ssm.ts --type ROC --directors 2
 *   npx tsx scripts/seed-ssm.ts --type ROC --directors 4 --secretaries 1 --shareholders 3
 *   npx tsx scripts/seed-ssm.ts --type ROC --directors 2 --foreign 1
 *   npx tsx scripts/seed-ssm.ts --type ROC --roc 639691 --check-digit H --new-roc 200401001188 --directors 4
 *   npx tsx scripts/seed-ssm.ts --list
 *   npx tsx scripts/seed-ssm.ts --inspect
 *
 * Without `--roc`/`--new-roc` it invents a unique `QA` number, which is only
 * good for exploring. Onboarding runs use REAL numbers from the
 * company-details-checker sheet, and the CR chain specs seed those
 * themselves.
 *
 * `--inspect` prints how the existing enquiry rows store their keys, so the
 * split between `roc` and `checkDigit` is read off live data, not guessed.
 *
 * The shape of every row is in `@data/ssm-seed` — this file only reads flags.
 */
import { config as loadEnv } from "dotenv";
import * as path from "node:path";
loadEnv({ path: path.join(__dirname, "..", "env", `.${process.env.TEST_ENV ?? "staging"}.env-local`) });

import { EsimClient, type EsimRecord } from "@fixtures/esim";
import { SSM_ENQUIRY_ENTITY, SSM_SUBMISSION_ENTITY, type SsmType } from "@data/ssm";
import { seedCompany, inspectKeyFormat } from "@data/ssm-seed";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const num = (name: string, d: number): number => Number(arg(name, String(d)));

async function main(): Promise<void> {
  const type = (arg("type", "ROC") as SsmType) ?? "ROC";
  if (!SSM_SUBMISSION_ENTITY[type]) throw new Error(`--type ${type} is not ROB, ROC or LLP.`);

  const sim = new EsimClient();
  await sim.connect();

  try {
    if (flag("inspect")) {
      const byType = await inspectKeyFormat(sim);
      for (const [t, rows] of Object.entries(byType)) {
        console.log(`\n${t}  (${rows.length} non-QA enquiry rows sampled)`);
        for (const r of rows) {
          console.log(
            `  roc=${JSON.stringify(r.roc)}  checkDigit=${JSON.stringify(r.checkDigit)}  ` +
              `newRoc=${JSON.stringify(r.newRoc)}  ${r.companyName}`,
          );
        }
      }
      return;
    }

    if (flag("list")) {
      const enquiry = (await sim.list(SSM_ENQUIRY_ENTITY)) as (EsimRecord & Record<string, unknown>)[];
      const submissions = (await sim.list(SSM_SUBMISSION_ENTITY[type])) as (EsimRecord & Record<string, unknown>)[];
      console.log(`${SSM_ENQUIRY_ENTITY}: ${enquiry.length} rows`);
      console.log(`${SSM_SUBMISSION_ENTITY[type]}: ${submissions.length} rows`);
      const enqRoc = new Set(enquiry.map((r) => String(r.roc)));
      console.log(`matched pairs: ${submissions.filter((r) => enqRoc.has(String(r.roc))).length}`);
      for (const r of submissions.filter((x) => String(x.remark ?? "").includes("QA automation"))) {
        console.log(`  SEEDED  ${r.roc} / ${r.newRoc}  ${r.companyName}`);
      }
      return;
    }

    const roc = arg("roc");
    const newRoc = arg("new-roc");
    if (Boolean(roc) !== Boolean(newRoc)) {
      throw new Error("Pass --roc and --new-roc together — one without the other seeds half a company.");
    }

    const result = await seedCompany(sim, {
      type,
      keys: roc && newRoc ? { roc, newRoc, checkDigit: arg("check-digit") ?? null } : undefined,
      companyName: arg("company"),
      directors: num("directors", 2),
      foreign: num("foreign", 0),
      secretaries: num("secretaries", 0),
      shareholders: num("shareholders", 0),
    });

    console.log(`Seeded ${result.type}  roc=${result.roc}  newRoc=${result.newRoc}`);
    console.log(`  company      ${result.companyName}`);
    console.log(`  enquiry      ${result.enquiry.action} id=${result.enquiry.id}`);
    console.log(`  submission   ${result.submission.action} id=${result.submission.id}`);
    console.log(`  EXPECTED COUNT ON THE APPLICATION: ${result.expectedCount}`);
  } finally {
    await sim.close();
  }
}

main().catch((e) => {
  console.error("FAILED:", (e as Error).message);
  process.exit(1);
});
