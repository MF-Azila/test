/**
 * Seed one company into eSim's SSM simulator — both rows, matched.
 *
 * Shared by `scripts/seed-ssm.ts` (by hand) and the CR chain specs (inside a
 * run), so both write the same shape.
 *
 * ── Real registration numbers ─────────────────────────────────────────────
 * Onboarding now needs a REAL ROC/ROB/LLP number whose TIN matches, taken
 * from Azfar's company-details-checker sheet. So the keys are passed in rather
 * than invented. When none are given it still falls back to a unique `QA`
 * number, which is only good for exploring.
 *
 * A real number may already have rows in eSim (another tester seeded it, or
 * the simulator shipped with it). Those rows are UPDATED in place rather than
 * duplicated: two enquiry rows for one ROC make the lookup ambiguous, and the
 * screen that hits it cannot say why.
 *
 * ── How a ROC with a check letter is stored is NOT established ─────────────
 * A real ROC reads `639691-H`. eSim's enquiry row has both `roc` and a
 * `checkDigit` column, and every row seeded so far was a `QA` number with
 * `checkDigit: null`, which says nothing about the real format. So the split
 * is passed in explicitly by the caller, and `scripts/seed-ssm.ts --inspect`
 * prints how the existing rows do it. Nothing here guesses.
 */
import { EsimClient, type EsimRecord } from "@fixtures/esim";
import {
  SSM_ENQUIRY_ENTITY,
  SSM_SUBMISSION_ENTITY,
  SSM_ITEM_TYPE,
  SSM_OK,
  SAMPLE_IC,
  countedOwners,
  clonePeople,
  type CloneReport,
  type OwnerConfig,
  type SsmType,
} from "@data/ssm";

type Row = EsimRecord & Record<string, unknown>;

export interface SeedPeople {
  /** Counted people: ROB CURRENT_OWNER, ROC DIRECTOR, LLP PT. */
  directors: number;
  /** How many of `directors` carry a passport instead of a MyKad. */
  foreign?: number;
  /** Seeded and NOT counted: ROC SECRETARY, LLP CO. Refused for ROB. */
  secretaries?: number;
  /** Seeded and NOT counted: ROC SHAREHOLDERS, ROB PREVIOUS_OWNER. */
  shareholders?: number;
}

export interface SeedKeys {
  /** `roc` on both rows, exactly as eSim should hold it. */
  roc: string;
  /** `newRoc` on both rows — the 12-digit number. */
  newRoc: string;
  /** `checkDigit` on the enquiry row. `null` when the format has none. */
  checkDigit?: string | null;
}

export interface SeedRequest extends SeedPeople {
  type: SsmType;
  /** Omit only when exploring — a unique QA number is invented. */
  keys?: SeedKeys;
  companyName?: string;
  /** Written into eSim's `remark`, so a row says who seeded it and why. */
  remark?: string;
  /** Build the rows and return them WITHOUT writing anything to eSim. */
  dryRun?: boolean;
}

export interface SeedResult {
  type: SsmType;
  roc: string;
  newRoc: string;
  companyName: string;
  /** What the Application should render — `countedOwners()` of the seed. */
  expectedCount: number;
  /** Whether each row was created fresh or an existing one updated. */
  enquiry: { id: number | undefined; action: "created" | "updated" };
  submission: { id: number | undefined; action: "created" | "updated" };
  /** Template tags the donor lacked (see `forceTags`). Empty when all were set. */
  warnings: string[];
  /** How the people were copied from the donor (see `clonePeople`). */
  people: Record<string, CloneReport>;
  /** The donor row the templates were copied from. */
  donorId: number | undefined;
  /** The rows as written (or, on a dry run, as they WOULD be written). */
  rows: { enquiry: Record<string, unknown>; submission: Record<string, unknown> };
}

/** Which column carries the people, per type — also the donor test. */
const PEOPLE_COLUMN: Record<SsmType, string> = {
  ROB: "currentOwnerInfo",
  ROC: "page3",
  LLP: "involvements",
};

const SUFFIX: Record<SsmType, string> = { ROB: "ENTERPRISE", ROC: "SDN BHD", LLP: "PLT" };

/** A ROC number nothing else uses, on both sides. Exploring only. */
function inventKeys(taken: Set<string>): SeedKeys {
  for (let attempt = 0; attempt < 500; attempt++) {
    const n = Math.floor(100000 + Math.random() * 899999);
    const roc = `QA${n}`;
    const newRoc = `2026${String(n).padStart(8, "0")}`;
    if (!taken.has(roc) && !taken.has(newRoc)) return { roc, newRoc, checkDigit: null };
  }
  throw new Error("Could not find an unused ROC after 500 tries.");
}

/** The people to seed, from the counts. */
function buildOwners(p: SeedPeople): OwnerConfig[] {
  const out: OwnerConfig[] = [];
  const foreign = p.foreign ?? 0;
  for (let i = 0; i < p.directors; i++) {
    out.push({
      name: `QA DIRECTOR ${String.fromCharCode(65 + i)}`,
      // A foreign director carries a passport, and that is what makes the
      // system read them as foreign — there is no nationality field.
      // Malaysians first, foreigners LAST — same people as chainPeople() in
      // cr/EAINT-12341/03-spec/chain-scenarios.ts and the eSim setup sheet.
      ic: i >= p.directors - foreign ? `${SAMPLE_IC.foreignA}${i}` : `${690501 + i}-13-${7631 + i}`,
      designation: "DIRECTOR",
    });
  }
  for (let i = 0; i < (p.secretaries ?? 0); i++) {
    out.push({
      name: `QA SECRETARY ${String.fromCharCode(65 + i)}`,
      ic: `${700101 + i}-13-${1000 + i}`,
      designation: "SECRETARY",
    });
  }
  return out;
}

/**
 * The same people, shaped for the type. ROC ICs are dashed, ROB and LLP are
 * twelve plain digits; `secretaries` means SECRETARY on ROC and CO on LLP.
 */
function shapeForType(type: SsmType, people: OwnerConfig[]): OwnerConfig[] {
  return people.map((o) => {
    const plain = o.ic.replace(/-/g, "");
    const excluded = o.designation === "SECRETARY";
    if (type === "ROC") return o;
    if (type === "ROB") return { name: o.name, ic: plain };
    return { name: o.name, ic: plain, involveType: excluded ? ("CO" as const) : ("PT" as const) };
  });
}

/**
 * Swap the donor's own identity out of a cloned column.
 *
 * The profile columns (`page1`, `businessInfo`, `basicProfile`) are copied
 * verbatim from a real record, and they carry THAT record's registration
 * number and name. Left alone, the seeded company's document would name a
 * different company inside it.
 */
function rebrand(value: unknown, donor: Row, keys: SeedKeys, companyName: string): unknown {
  if (typeof value !== "string" || !value) return value;
  let out = value;
  const swaps: [unknown, string][] = [
    [donor.newRoc, keys.newRoc],
    [donor.roc, keys.roc],
    [donor.companyName, companyName],
  ];
  for (const [from, to] of swaps) {
    const f = String(from ?? "").trim();
    if (f.length >= 4) out = out.split(f).join(to);
  }
  return out;
}

/**
 * Set the tags the eSimulator guide (eAuto_eSimulator_Guides.xlsx, SSM_SIM_1 /
 * SSM_SIM_2) says the submission template must carry, instead of trusting the
 * cloned donor:
 *
 *   ROC page1:        <REF_NO>{roc}-{check}</REF_NO> <NEW_REF_NO>{newRoc}</NEW_REF_NO> <ROC_STATUS>EXISTING</ROC_STATUS>
 *   ROB businessInfo: <BUSINESS_REF_NO>{roc}-{check}</BUSINESS_REF_NO> <NEW_REF_NO>{newRoc}</NEW_REF_NO> <ROB_STATUS>ACTIVE</ROB_STATUS>
 *
 * `rebrand` swaps the donor's ROC but leaves the donor's CHECK LETTER behind
 * (`123456-A` → `639691-A` for a real `639691-H`), and a donor cloned from a
 * negative-test row can carry `WINDING UP` / `DISSOLVED` (SSM_SIM_4) into the
 * company. Both are forced here. A tag the donor does not have is reported,
 * not invented — the guide says copy a full template from an existing record.
 */
function forceTags(xml: unknown, tags: Record<string, string>, where: string, warnings: string[]): unknown {
  if (typeof xml !== "string" || !xml) {
    warnings.push(`${where} is empty on the donor — tags ${Object.keys(tags).join(", ")} not set.`);
    return xml;
  }
  let out = xml;
  for (const [tag, value] of Object.entries(tags)) {
    const re = new RegExp(`(<${tag}>)[\\s\\S]*?(</${tag}>)`, "g");
    if (!re.test(out)) {
      warnings.push(`${where} has no <${tag}> — left as cloned.`);
      continue;
    }
    out = out.replace(re, `$1${value}$2`);
  }
  return out;
}

/** The REF_NO the guide wants: the ROC with its check letter, e.g. `639691-H`. */
function refNo(keys: SeedKeys): string {
  return keys.checkDigit ? `${keys.roc}-${keys.checkDigit}` : keys.roc;
}

/** Existing rows for these keys, if any. */
function existing(rows: Row[], keys: SeedKeys): Row[] {
  return rows.filter((r) => String(r.roc) === keys.roc || String(r.newRoc) === keys.newRoc);
}

async function upsert(
  sim: EsimClient,
  entity: string,
  current: Row[],
  row: Row,
): Promise<{ id: number | undefined; action: "created" | "updated" }> {
  if (current.length > 1) {
    throw new Error(
      `${entity} already has ${current.length} rows for roc=${row.roc} / newRoc=${row.newRoc} ` +
        `(ids ${current.map((r) => r.id).join(", ")}). Which one the lookup uses is not known — ` +
        "clean them up in eSim before seeding.",
    );
  }
  if (current.length === 1) {
    const saved = await sim.update(entity, { ...current[0], ...row, id: Number(current[0].id) });
    return { id: saved.id, action: "updated" };
  }
  const saved = await sim.create(entity, row);
  return { id: saved.id, action: "created" };
}

/**
 * Seed one company. Returns what was written and the count to expect.
 *
 * Takes a connected client so a spec can reuse its fixture. The caller
 * closes it.
 */
export async function seedCompany(sim: EsimClient, req: SeedRequest): Promise<SeedResult> {
  const { type } = req;
  if (!SSM_SUBMISSION_ENTITY[type]) throw new Error(`type ${type} is not ROB, ROC or LLP.`);

  // ROB has no secretary: every CURRENT_OWNER counts, so a "secretary" would
  // silently become one more owner and inflate the number the test asserts.
  if (type === "ROB" && (req.secretaries ?? 0) > 0) {
    throw new Error(
      "secretaries has no meaning for ROB: every CURRENT_OWNER is counted. Use shareholders, " +
        "which seeds PREVIOUS_OWNER — the block ROB actually excludes.",
    );
  }
  // The rebuilt seeder copies the donor's first person block and changes IC
  // and name only — it cannot set a DESIGNATION / involveType whose tag is not
  // known, so a "secretary" would land as one more director. Refuse.
  if ((req.secretaries ?? 0) > 0) {
    throw new Error("secretaries are not supported by the rebuilt seeder (designation tag unknown).");
  }
  if ((req.foreign ?? 0) > req.directors) {
    throw new Error(`foreign (${req.foreign}) cannot exceed directors (${req.directors}).`);
  }

  const enquiry = (await sim.list(SSM_ENQUIRY_ENTITY)) as Row[];
  const submissions = (await sim.list(SSM_SUBMISSION_ENTITY[type])) as Row[];

  const keys =
    req.keys ??
    inventKeys(
      new Set([
        ...enquiry.flatMap((r) => [String(r.roc), String(r.newRoc)]),
        ...submissions.flatMap((r) => [String(r.roc), String(r.newRoc)]),
      ]),
    );

  // A donor that actually has people in it, and is not the row being
  // overwritten — cloning yourself carries your old people forward.
  const donor = submissions.find(
    (r) =>
      String(r[PEOPLE_COLUMN[type]] ?? "").trim().length > 50 &&
      String(r.roc) !== keys.roc &&
      String(r.newRoc) !== keys.newRoc,
  );
  if (!donor) {
    throw new Error(
      `No ${SSM_SUBMISSION_ENTITY[type]} row has a populated "${PEOPLE_COLUMN[type]}" to clone.`,
    );
  }

  const companyName = req.companyName ?? `QA AUTOMATION ${keys.roc} ${SUFFIX[type]}`;
  const remark = req.remark ?? `QA automation ${type}`;
  const owners = shapeForType(type, buildOwners(req));
  const shareholders: OwnerConfig[] = Array.from({ length: req.shareholders ?? 0 }, (_, i) => ({
    name: `QA SHAREHOLDER ${String.fromCharCode(65 + i)}`,
    ic: `${800101 + i}-13-${2000 + i}`,
  }));

  const enquiryRow: Row = {
    responseCode: SSM_OK.enquiry,
    roc: keys.roc,
    newRoc: keys.newRoc,
    companyName,
    ...(SSM_ITEM_TYPE[type] ? { itemType: SSM_ITEM_TYPE[type] } : {}),
    remark,
    delayMiliSeconds: 0,
    checkDigit: keys.checkDigit ?? null,
  };

  const common: Row = {
    responseCode: SSM_OK.submission,
    roc: keys.roc,
    newRoc: keys.newRoc,
    companyName,
    backupLink: donor.backupLink,
    remark,
    delayMiliSeconds: 0,
    checkDigit: keys.checkDigit ?? null,
  };
  const keep = (col: string) => rebrand(donor[col], donor, keys, companyName);
  const warnings: string[] = [];
  const people: Record<string, CloneReport> = {};
  const clone = (col: string, who: OwnerConfig[]) => {
    const { xml, report } = clonePeople(keep(col), who, type, col);
    people[col] = report;
    if (!report.nameTag) warnings.push(`${col}: no name tag found in the person block — names left as the donor's.`);
    return xml;
  };

  let submissionRow: Row;
  if (type === "ROC") {
    submissionRow = {
      ...common,
      page1: forceTags(
        keep("page1"),
        { REF_NO: refNo(keys), NEW_REF_NO: keys.newRoc, ROC_STATUS: "EXISTING" },
        "page1",
        warnings,
      ),
      page2: keep("page2"),
      page3: clone("page3", owners),
      page4: shareholders.length ? clone("page4", shareholders) : keep("page4"),
      page5: keep("page5"),
      page6: keep("page6"),
    };
  } else if (type === "ROB") {
    submissionRow = {
      ...common,
      businessInfo: forceTags(
        keep("businessInfo"),
        { BUSINESS_REF_NO: refNo(keys), NEW_REF_NO: keys.newRoc, ROB_STATUS: "ACTIVE" },
        "businessInfo",
        warnings,
      ),
      currentOwnerInfo: clone("currentOwnerInfo", owners),
      previousOwnerInfo: shareholders.length ? clone("previousOwnerInfo", shareholders) : keep("previousOwnerInfo"),
    };
  } else {
    submissionRow = {
      ...common,
      basicProfile: keep("basicProfile"),
      regOfficeAdd: keep("regOfficeAdd"),
      regBizAddresses: keep("regBizAddresses"),
      bizCodes: keep("bizCodes"),
      involvements: clone("involvements", owners),
    };
  }

  const base = {
    type,
    roc: keys.roc,
    newRoc: keys.newRoc,
    companyName,
    expectedCount: countedOwners(type, owners).length,
    warnings,
    people,
    donorId: donor.id,
    rows: { enquiry: enquiryRow, submission: submissionRow },
  };
  if (req.dryRun) {
    const would = (rows: Row[]) => ({ id: rows[0]?.id, action: rows.length ? ("updated" as const) : ("created" as const) });
    return { ...base, enquiry: would(existing(enquiry, keys)), submission: would(existing(submissions, keys)) };
  }

  const enq = await upsert(sim, SSM_ENQUIRY_ENTITY, existing(enquiry, keys), enquiryRow);
  const sub = await upsert(
    sim,
    SSM_SUBMISSION_ENTITY[type],
    existing(submissions, keys),
    submissionRow,
  ).catch((err) => {
    // A company findable but unreadable is worse than none, and the screen
    // that hits it cannot say what went wrong. Say so loudly.
    throw new Error(
      `Enquiry row ${enq.action} (id=${enq.id}) but the submission row FAILED — ` +
        `fix or remove the enquiry row for ${keys.roc} in eSim. Cause: ${(err as Error).message}`,
    );
  });

  return { ...base, enquiry: enq, submission: sub };
}

/**
 * How the existing rows store their keys — the answer to "split or whole".
 *
 * Prints nothing itself; returns a few real rows per type so a human can read
 * the convention off live data rather than have it guessed.
 */
export async function inspectKeyFormat(
  sim: EsimClient,
  sample = 8,
): Promise<Record<string, Pick<Row, "roc" | "newRoc" | "checkDigit" | "itemType" | "companyName">[]>> {
  const enquiry = (await sim.list(SSM_ENQUIRY_ENTITY)) as Row[];
  const out: Record<string, Pick<Row, "roc" | "newRoc" | "checkDigit" | "itemType" | "companyName">[]> = {};
  // itemType values are not known (SSM_ITEM_TYPE is empty), so group by
  // whatever the rows carry.
  const types = [...new Set(enquiry.map((r) => String(r.itemType ?? "(none)")))];
  for (const item of types) {
    out[item] = enquiry
      .filter((r) => String(r.itemType ?? "(none)") === item && !String(r.roc).startsWith("QA"))
      .slice(0, sample)
      .map((r) => ({
        roc: r.roc,
        newRoc: r.newRoc,
        checkDigit: r.checkDigit,
        itemType: r.itemType,
        companyName: r.companyName,
      }));
  }
  return out;
}
