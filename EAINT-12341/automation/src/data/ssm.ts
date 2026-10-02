/**
 * SSM simulator vocabulary: entity names, response codes, and how the people
 * (directors / owners / partners) are written into a submission row.
 *
 * ⚠ REBUILT 02.10.2026 — the original file was not in the handover.
 *
 * Sources:
 *   - eAuto_eSimulator_Guides.xlsx (SSM_SIM_1 ROC, SSM_SIM_2 ROB): response
 *     codes 004 / 005, ROC Page 3 `<IC>` WITH dashes, ROB Current Owner Info
 *     `<IC_NEW>` WITHOUT dashes.
 *   - The handover's ssm-seed.ts: column names (page1..page6, businessInfo,
 *     currentOwnerInfo, previousOwnerInfo, basicProfile, involvements, …).
 *
 * NOT KNOWN, so NOT INVENTED: the XML element that wraps one person, the name
 * tag, the LLP IC tag. The builders below therefore CLONE the first person
 * block of an existing (donor) record and change only the IC and the name.
 * `npm run esim:preview` shows the result before anything is written.
 */

export type SsmType = "ROB" | "ROC" | "LLP";

/** JHipster REST names of the eSim entities (UNVERIFIED — `npm run esim:check`). */
export const SSM_ENQUIRY_ENTITY = "ssm-enquiry-resps";
export const SSM_SUBMISSION_ENTITY: Record<SsmType, string> = {
  ROC: "ssm-roc-submission-resps",
  ROB: "ssm-rob-submission-resps",
  LLP: "ssm-llp-submission-resps",
};

/** Guide: Ssm Enquiry Resp → Response Code 004; Submission Resp → 005. */
export const SSM_OK = { enquiry: "004", submission: "005" } as const;

/**
 * The enquiry row's `itemType` per company type. The guide does not set it,
 * so it is left as it is on an existing row and not sent on a new one.
 */
export const SSM_ITEM_TYPE: Partial<Record<SsmType, string>> = {};

/**
 * Foreign director ID. Format NOT confirmed (asked 02.10.2026); a
 * passport-like letter + digits is used so it is clearly not a 12-digit MyKad.
 */
export const SAMPLE_IC = { foreignA: "A1234567" } as const;

export interface OwnerConfig {
  name: string;
  /** ROC: dashed (901010-10-1010). ROB / LLP: 12 digits. Passport for a foreigner. */
  ic: string;
  /** ROC only. */
  designation?: "DIRECTOR" | "SECRETARY";
  /** LLP only. */
  involveType?: "PT" | "CO";
}

/** The people that count: ROC DIRECTOR, ROB every CURRENT_OWNER, LLP PT. */
export function countedOwners(type: SsmType, owners: OwnerConfig[]): OwnerConfig[] {
  if (type === "ROC") return owners.filter((o) => (o.designation ?? "DIRECTOR") === "DIRECTOR");
  if (type === "LLP") return owners.filter((o) => (o.involveType ?? "PT") === "PT");
  return owners;
}

/** Where the IC sits, per type. LLP is not in the guide — first match wins. */
export const IC_TAGS: Record<SsmType, string[]> = {
  ROC: ["IC"],
  ROB: ["IC_NEW"],
  LLP: ["IC_NEW", "NEW_IC", "IC", "ID_NO", "IDNO"],
};

const NAME_TAG = /^(NAME|[A-Z_]*_NAME)$/;

export interface CloneReport {
  personTag: string;
  icTag: string;
  nameTag: string | null;
  donorPeople: number;
  written: number;
}

function blockAround(xml: string, at: number): { tag: string; start: number; end: number } | null {
  // Innermost element that opens before `at` and closes after it.
  const opens = [...xml.slice(0, at).matchAll(/<([A-Za-z_][\w.-]*)(\s[^>]*)?>/g)];
  for (let i = opens.length - 1; i >= 0; i--) {
    const m = opens[i];
    const tag = m[1];
    // Skip an element that already closed before `at` (a sibling field such
    // as <NAME>…</NAME> just before the IC).
    const closedEarly = xml.indexOf(`</${tag}>`, m.index!);
    if (closedEarly !== -1 && closedEarly < at) continue;
    const close = xml.indexOf(`</${tag}>`, at);
    if (close === -1) continue;
    return { tag, start: m.index!, end: close + tag.length + 3 };
  }
  return null;
}

/**
 * Rewrite the people in a donor column: keep everything around them, repeat
 * the donor's FIRST person block once per person, set IC and name.
 * Throws (writing nothing) when the donor has no recognisable person block.
 */
export function clonePeople(
  donorXml: unknown,
  people: OwnerConfig[],
  type: SsmType,
  where: string,
): { xml: string; report: CloneReport } {
  if (typeof donorXml !== "string" || !donorXml.trim()) {
    throw new Error(`${where}: the donor record is empty — nothing to copy the people from.`);
  }
  const icTag = IC_TAGS[type].find((t) => donorXml.includes(`<${t}>`));
  if (!icTag) {
    throw new Error(`${where}: no ${IC_TAGS[type].map((t) => `<${t}>`).join(" / ")} in the donor record.`);
  }
  const icAt = donorXml.indexOf(`<${icTag}>`);
  // The person block is the innermost element around the IC that is not the IC itself.
  let person = blockAround(donorXml, icAt);
  while (person && person.tag === icTag) person = blockAround(donorXml, person.start);
  if (!person) throw new Error(`${where}: could not find the element around <${icTag}>.`);

  const template = donorXml.slice(person.start, person.end);
  const siblings = [...donorXml.matchAll(new RegExp(`<${person.tag}(\\s[^>]*)?>[\\s\\S]*?</${person.tag}>`, "g"))];
  const first = siblings[0].index!;
  const last = siblings[siblings.length - 1];
  const lastEnd = last.index! + last[0].length;

  const nameTag =
    [...template.matchAll(/<([A-Z_]+)>[^<]*<\/\1>/g)].map((m) => m[1]).find((t) => NAME_TAG.test(t)) ?? null;
  const set = (xml: string, tag: string, value: string) =>
    xml.replace(new RegExp(`(<${tag}>)[^<]*(</${tag}>)`), `$1${value}$2`);

  const blocks = people.map((p) => {
    let b = set(template, icTag, p.ic);
    if (nameTag) b = set(b, nameTag, p.name);
    return b;
  });
  const sep = siblings.length > 1 ? donorXml.slice(siblings[0].index! + siblings[0][0].length, siblings[1].index!) : "\n";
  return {
    xml: donorXml.slice(0, first) + blocks.join(sep) + donorXml.slice(lastEnd),
    report: { personTag: person.tag, icTag, nameTag, donorPeople: siblings.length, written: people.length },
  };
}
