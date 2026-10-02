/**
 * EAINT-12341 — what Mailtrap should show for one chain, rendered from SRD v1.3
 * with the run's own values, so the manual check is a side-by-side comparison
 * instead of a re-read of the SRD.
 *
 * Text is verbatim from SRD_EAINT-12341_v1.3_20260929 §2.2.4.1 (Email
 * Template 1, combined), §2.2.5.1 (Email Template 3) and §2.2.5.2 (Appointment
 * Letter). Where the SRD does not say which field feeds a placeholder, BOTH
 * candidates are printed and the open question is named — never a guess.
 *
 * Also the future home of Mailtrap assertions: the same strings can be
 * asserted once MAILTRAP_TOKEN is available and the open questions are closed.
 */

export const RHB_ONLINE_LINK = "https://smecaonline.rhbgroup.com/sme/online?tag=campaign";

export const T1_SUBJECT = "RHB Online / Branch Account Opening - [Application No] - [Company Name]";
export const T1_BODY = [
  "Dear Sir/Madam,",
  "We are pleased to confirm that your company's registration with eAuto has been approved.",
  "Application No: [Application No]",
  "Company Name: [Company Name]",
  "Please find the Appointment Letter attached for your reference.",
  "eAuto has notified the RHB Support Team regarding your approved registration. Kindly wait for RHB to provide the Letter of Offer and the relevant onboarding documents by email.",
  "If you do not receive the documents from RHB within three (3) working days, please contact us at apply@eauto.my.",
  "Once you have received the required documents from RHB, you may choose from the following two (2) options to apply for an RHB Islamic Current Account:",
  "Option 1 – Online Account Opening",
  "You may register online via the following link:",
  "[RHB Online Registration Link]",
  "Please note that the online account-opening option is applicable to companies with a maximum of four (4) authorised or main users. The account opening remains subject to RHB's prevailing eligibility requirements and approval.",
  "Upon completing the online application, please visit the RHB branch selected during your application within seven (7) days to complete the required verification and documentation process.",
  "Option 2 – Account Opening at RHB Branch",
  "Alternatively, you may visit your preferred RHB branch to apply for an RHB Islamic Current Account directly. The account opening will be subject to RHB's prevailing requirements, documentation and approval process.",
  "Once the RHB Islamic Current Account has been successfully opened, kindly provide eAuto with the relevant account confirmation document for the next stage of account activation through the Application Link below:",
  "[Application Link]",
  "For further assistance or inquiries, please contact us at apply@eauto.my.",
  // Q-01: the template document V3.0 stops above; the SRD keeps the block below.
  "Thank you.",
  "Best regards,",
  "eAuto Sdn Bhd",
  "Level 15 Sunway Tower",
  "Jalan Ampang, 50450 Kuala Lumpur",
  "Customer Service: 03-27798899",
  "WhatsApp: 012-2001324",
];

/** Text that must NOT appear in the guideline email (v1.1 wording / removed Template 2). */
export const T1_MUST_NOT_CONTAIN = [
  "As your company meets the eligibility requirements for RHB's online account-opening process",
  "Please bring the documents provided by RHB",
  "RHB Branch Account Opening -",
];

export const T3_TO = "BIS.Support@rhbgroup.com";
export const T3_SUBJECT = "Approved eAuto Registration - [Company Name] - [BRN Number]";
export const T3_BODY = [
  "Dear RHB Support Team,",
  "We wish to inform you that the following company's registration with eAuto has been approved:",
  "Company Name: [Company Name]",
  "Business Registration Number: [BRN Number]",
  "UCD Contact Person: [Name]",
  "Contact Number: [Contact Number]",
  "Email Address: [UCD Email Address]",
  "Please find the Appointment Letter attached for your reference and further action.",
  "Kindly issue the Letter of Offer and relevant onboarding documents to the UCD within one (1) working day. The UCD has been copied in this email to ensure that it receives the documents directly.",
  "When responding, please use Reply All so that the UCD and eAuto remain included in the correspondence and can proceed with the subsequent account-opening arrangements.",
  "For further assistance or inquiries, please contact us at apply@eauto.my.",
  "Thank you.",
  "Best regards,",
  "eAuto Sdn Bhd",
  "Level 15 Sunway Tower",
  "Jalan Ampang, 50450 Kuala Lumpur",
  "Customer Service: 03-27798899",
  "WhatsApp: 012-2001324",
];

/** Withdrawn from Template 3 in SRD v1.1 — must not appear. */
export const T3_MUST_NOT_CONTAIN = ["is not eligible for RHB's online account-opening process"];

export const LETTER_TITLE =
  "LETTER OF CONFIRMATION OF REGISTRATION AS A USED CAR DEALER (UCD) UNDER eAUTO SDN. BHD. PLATFORM";

/** Everything the chain knows about one run. */
export interface RunFacts {
  chainId: string;
  covers: string[];
  stoppedAt: string;
  applicationNo?: string;
  preApplicationNo?: string;
  companyName: string;
  /** Old BRN as the SSM details should show it (sheet value, e.g. 639691-H). Licence no. for Business Trading. */
  oldBrn: string;
  newBrn: string;
  tin: string;
  admin: { name: string; mobile: string; email: string };
  director: { name: string; mobile: string; email: string };
  showroomAddress: string;
  preApprovedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
}

const MYT = "Asia/Kuala_Lumpur";

/** DD/MM/YYYY in Malaysia time (Q-11 asks whether MYT is right). */
export function ddmmyyyy(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: MYT, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function stamp(d?: Date): string {
  if (!d) return "(not reached)";
  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: MYT, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(d);
  return `${t} MYT (${d.toISOString()})`;
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\[[^\]]+\]/g, (m) => values[m] ?? m);
}

/** The Markdown sheet a tester keeps open beside Mailtrap. */
export function renderExpected(f: RunFacts): string {
  const app = f.applicationNo ?? "[Application No — not reached]";
  const regNo = f.newBrn ? `${f.oldBrn} (${f.newBrn})` : `${f.oldBrn} (Q-09: no new BRN for Business Trading)`;
  const year = f.approvedAt
    ? new Intl.DateTimeFormat("en-GB", { timeZone: MYT, year: "numeric" }).format(f.approvedAt)
    : "[YYYY]";
  const t1 = { "[Application No]": app, "[Company Name]": f.companyName, "[RHB Online Registration Link]": RHB_ONLINE_LINK,
               "[Application Link]": "(a working link — where it lands is Q-03)" };
  const t3 = {
    "[Company Name]": f.companyName,
    "[BRN Number]": `${f.newBrn || f.oldBrn}   ← Q-05: new BRN per the SRD example; old BRN is ${f.oldBrn}`,
    "[Name]": `${f.admin.name} (Admin In Charge) OR ${f.director.name} (Director in Charge)   ← Q-04, record which`,
    "[Contact Number]": `${f.admin.mobile} (Admin) OR ${f.director.mobile} (Director)   ← Q-04`,
    "[UCD Email Address]": `${f.admin.email} (Admin) OR ${f.director.email} (Director)   ← Q-04`,
  };
  const ucdTo = `${f.admin.email} (Admin In Charge) — or ${f.director.email} (Director in Charge) — Q-04, record which`;
  const L = (s: string) => `    ${s}`;

  return [
    `# ${f.chainId} — expected emails and Appointment Letter (SRD v1.3)`,
    ``,
    `Covers: ${f.covers.join(", ")}   ·   stopped at: ${f.stoppedAt}`,
    ``,
    `| Fact | Value |`,
    `|---|---|`,
    `| Company name | ${f.companyName} |`,
    `| Old BRN / New BRN | ${f.oldBrn} / ${f.newBrn || "—"} |`,
    `| TIN | ${f.tin} |`,
    `| Pre-Application No | ${f.preApplicationNo ?? "(not reached)"} |`,
    `| Application No | ${app} |`,
    `| Admin In Charge | ${f.admin.name} · ${f.admin.mobile} · ${f.admin.email} |`,
    `| Director in Charge | ${f.director.name} · ${f.director.mobile} · ${f.director.email} |`,
    `| Showroom address typed | ${f.showroomAddress} |`,
    `| Pre-Application approved | ${stamp(f.preApprovedAt)} |`,
    `| Application submitted | ${stamp(f.submittedAt)} |`,
    `| Application approved | ${stamp(f.approvedAt)} |`,
    ``,
    `Search Mailtrap for **${f.admin.email}** and **${f.director.email}**.`,
    ``,
    `## No-email windows (xx-04; CH5-05 / CH5-06)`,
    `- Between "Pre-Application approved" and "Application approved": NO guideline email and NO Appointment Letter email.`,
    f.stoppedAt.includes("Submitted")
      ? `- After "Application submitted" (and after the manual Revert to UCD): NO guideline email and NO Appointment Letter email.`
      : `- After approval: exactly ONE of each email (xx-19). The old approved-application email with the 3 RHB documents must NOT arrive (CH1-20).`,
    ``,
    `## Email 1 — RHB Account Registration Guideline (Email Template 1, combined)`,
    `- From: not asserted (Q-12)`,
    `- To: ${ucdTo}`,
    `- CC: apply@eauto.my`,
    `- Subject: **${fill(T1_SUBJECT, t1)}**`,
    `- Attachment: the Appointment Letter for ${app} (format/name: Q-08)`,
    `- Body:`,
    ``,
    ...T1_BODY.map((p) => L(fill(p, t1))),
    ``,
    `- Must NOT contain: ${T1_MUST_NOT_CONTAIN.map((s) => `"${s}"`).join("; ")}`,
    ``,
    `## Email 2 — Appointment Letter to RHB Support (Email Template 3)`,
    `- To: ${T3_TO}`,
    `- CC: ${ucdTo}; apply@eauto.my`,
    `- Subject: **${fill(T3_SUBJECT, { "[Company Name]": f.companyName, "[BRN Number]": f.newBrn || f.oldBrn })}**   (BRN: Q-05)`,
    `- Attachment: the same Appointment Letter`,
    `- Body:`,
    ``,
    ...T3_BODY.map((p) => L(fill(p, t3))),
    ``,
    `- Must NOT contain: ${T3_MUST_NOT_CONTAIN.map((s) => `"${s}"`).join("; ")}`,
    ``,
    `## Appointment Letter (SRD §2.2.5.2)`,
    `- Title: ${LETTER_TITLE}   (template .docx has "BHD.PLATFORM" — Q-10)`,
    `- Letterhead: eAuto logo · eAuto Sdn Bhd 200401038456 (676967-T) · Level 15 Sunway Tower, Jalan Ampang, 50450 Kuala Lumpur · Tel: 03-2779 8893`,
    `- Date: ${f.approvedAt ? ddmmyyyy(f.approvedAt) : "[DD/MM/YYYY — not approved]"}   (approval date)`,
    `- Our Ref: eAuto/OPS/UCD/${app}/${year}   (outer [ ] literal or not — Q-07)`,
    `- To: ${f.companyName} / ${regNo} / company address from the Application (Q-06; typed showroom: ${f.showroomAddress})`,
    `- Clause 1: "...that ${f.companyName}, Company Registration No. ${regNo}, has been approved and registered as a Used Car Dealer (UCD)..."`,
    `- Clause 4 table: UCD Name = ${f.companyName} · Company Registration No. = ${regNo} · UCD / Dealer Reference No. = ${f.preApplicationNo ?? "[Pre-Application No]"} / ${app}`,
    `- Clauses 1–8 numbered (Clause 6 refers to "Clause 5"); signature image, CHIA KET MING, COO`,
    `- Footer: Website: www.eauto.my | Customer Service: 03-2779 8899 | Email: support@eauto.my`,
    `- No unresolved [placeholder] anywhere (xx-18)`,
    ``,
  ].join("\n");
}
