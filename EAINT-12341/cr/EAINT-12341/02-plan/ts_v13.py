"""
EAINT-12341 — test design for SRD v1.3 (29.09.2026), single source of truth.

`build_workbook.py` renders this into the team workbook and `scenarios.yaml`.
Edit the data here, then re-run:   python build_workbook.py

Sources (all in ../00-input/):
  SRD_EAINT-12341_v1.3_20260929.docx                       — baseline
  EMAIL TEMPLATE - RHB ACCOUNT OPENING_v3.0_20260929.docx  — Yeng, 29.09.2026
  eAuto_UCD_Appointment_Letter_Template_v2.0_20260918.docx
  Sample_Appointment_Letter_v2.0_20260918.docx
"""

SRD = "SRD_EAINT-12341_v1.3_20260929 (v1.3, 29.09.2026, Chee Mei Jia)"
RHB_LINK = "https://smecaonline.rhbgroup.com/sme/online?tag=campaign"

# ── Verbatim expected content (SRD v1.3) ─────────────────────────────────────
T1_SUBJECT = "RHB Online / Branch Account Opening - [Application No] - [Company Name]"
T1_BODY = """Dear Sir/Madam,

We are pleased to confirm that your company's registration with eAuto has been approved.

Application No: [Application No]
Company Name: [Company Name]

Please find the Appointment Letter attached for your reference.

eAuto has notified the RHB Support Team regarding your approved registration. Kindly wait for RHB to provide the Letter of Offer and the relevant onboarding documents by email.

If you do not receive the documents from RHB within three (3) working days, please contact us at apply@eauto.my.

Once you have received the required documents from RHB, you may choose from the following two (2) options to apply for an RHB Islamic Current Account:

Option 1 – Online Account Opening
You may register online via the following link:
[RHB Online Registration Link]

Please note that the online account-opening option is applicable to companies with a maximum of four (4) authorised or main users. The account opening remains subject to RHB's prevailing eligibility requirements and approval.

Upon completing the online application, please visit the RHB branch selected during your application within seven (7) days to complete the required verification and documentation process.

Option 2 – Account Opening at RHB Branch
Alternatively, you may visit your preferred RHB branch to apply for an RHB Islamic Current Account directly. The account opening will be subject to RHB's prevailing requirements, documentation and approval process.

Once the RHB Islamic Current Account has been successfully opened, kindly provide eAuto with the relevant account confirmation document for the next stage of account activation through the Application Link below:

[Application Link]

For further assistance or inquiries, please contact us at apply@eauto.my.

Thank you.

Best regards,
eAuto Sdn Bhd
Level 15 Sunway Tower
Jalan Ampang, 50450 Kuala Lumpur
Customer Service: 03-27798899
WhatsApp: 012-2001324"""

T3_SUBJECT = "Approved eAuto Registration - [Company Name] - [BRN Number]"
T3_BODY = """Dear RHB Support Team,

We wish to inform you that the following company's registration with eAuto has been approved:

Company Name: [Company Name]
Business Registration Number: [BRN Number]
UCD Contact Person: [Name]
Contact Number: [Contact Number]
Email Address: [UCD Email Address]

Please find the Appointment Letter attached for your reference and further action.

Kindly issue the Letter of Offer and relevant onboarding documents to the UCD within one (1) working day. The UCD has been copied in this email to ensure that it receives the documents directly.

When responding, please use Reply All so that the UCD and eAuto remain included in the correspondence and can proceed with the subsequent account-opening arrangements.

For further assistance or inquiries, please contact us at apply@eauto.my.

Thank you.

Best regards,
eAuto Sdn Bhd
Level 15 Sunway Tower
Jalan Ampang, 50450 Kuala Lumpur
Customer Service: 03-27798899
WhatsApp: 012-2001324"""

LETTER = [
    ("Document Title", "LETTER OF CONFIRMATION OF REGISTRATION AS A USED CAR DEALER (UCD) UNDER eAUTO SDN. BHD. PLATFORM"),
    ("Letterhead", "eAuto logo; eAuto Sdn Bhd 200401038456 (676967-T); Level 15 Sunway Tower, Jalan Ampang, 50450 Kuala Lumpur; Tel: 03-2779 8893"),
    ("Date", "[DD/MM/YYYY] — the date the Application is approved"),
    ("Our Ref", "[eAuto/OPS/UCD/[Application No]/[YYYY]]  — [YYYY] = year of the Application approval date"),
    ("Recipient", "To: [UCD Company Name] / [Old BRN] ([New BRN]) / [Company Address]"),
    ("Salutation", "Dear Sir / Madam,  ·  We refer to the above matter."),
    ("Clause 1", "We are pleased to confirm that [UCD Company Name], Company Registration No. [Old BRN] ([New BRN]), has been approved and registered as a Used Car Dealer (UCD) under the eAuto Sdn. Bhd. (“eAuto”) platform (“eAuto Platform”)."),
    ("Clause 2", "For the avoidance of doubt, this registration confirms the UCD's status on the eAuto platform for operational and administrative purposes only. ... (verbatim per SRD §2.2.5.2 item 6)"),
    ("Clause 3", "This registration enables the company to access and utilise the services and facilities provided through the eAuto Platform ... (including the Motor Vehicle Dealer License Agreement ...) ..."),
    ("Clause 4 — table", "UCD Name: [UCD Company Name]  |  Company Registration No.: [Old BRN] ([New BRN])  |  UCD / Dealer Reference No.: [Pre-Application No] / [Application No]"),
    ("Clause 5", "This letter is issued as an official confirmation of the company's status ... may be presented to RHB Bank Berhad ..."),
    ("Clause 6", "This letter is issued solely for the purpose stated in Clause 5 ... (clause numbering must render so the 'Clause 5' reference is valid)"),
    ("Clause 7", "The company's registration as a UCD shall remain subject to ... suspend, revoke or vary ..."),
    ("Clause 8", "This confirmation is accurate as at the date of this letter only ..."),
    ("Closing", "Thank you.  ·  Yours faithfully,  ·  for and on behalf of eAuto Sdn. Bhd."),
    ("Signatory", "Signature of the authorised officer — CHIA KET MING, COO"),
    ("Footer", "Website: www.eauto.my | Customer Service: 03-2779 8899 | Email: support@eauto.my"),
]

LETTER_FIELDS = [
    ("[DD/MM/YYYY]", "Date of Application approval"),
    ("[Application No]", "Application No (NAxxxxxxxx)"),
    ("[YYYY]", "Year of the Application approval date"),
    ("[UCD Company Name]", "Company name captured in the Application"),
    ("[Old BRN]", "Old BRN in the SSM details of the Pre-Application summary"),
    ("[New BRN]", "New BRN in the SSM details of the Pre-Application summary"),
    ("[Company Address]", "Company address captured in the Application (which field — Q-06)"),
    ("[Pre-Application No]", "Pre-Application No (Pyymmdd/nnnnn)"),
]

# ── Test data chains ─────────────────────────────────────────────────────────
# One chain = one Pre-Application → payment → BO approval → Application →
# submit → assignee → approver. Under v1.3 the template no longer depends on the
# company structure, so ONE approved chain carries all content checks; the
# other chains exist to prove "same template regardless" (REQ-005 Ex.1/Ex.2)
# across business types.
CHAINS = [
    dict(id="12341_CH1", type="ROB", btype="Sole Proprietorship / Partnership", count="4 business owners",
         nationality="All Malaysian", stop="Application Approved",
         purpose="Primary chain. REQ-005 Example 1. Carries every content check (Email Template 1, Email Template 3, Appointment Letter, old-email suppression, no duplicates, Pre-Application approval silence). Afterwards reused by the hardcopy regression (TS25).",
         data="New PASS ROB company (Partnership, TIN prefix D) from a fresh company-details-checker sheet. eSim seed: 4 CURRENT_OWNER, all 12-digit IC."),
    dict(id="12341_CH2", type="ROB", btype="Sole Proprietorship / Partnership", count="5 business owners",
         nationality="All Malaysian", stop="Application Approved",
         purpose="REQ-005 Example 2 (count). Proves the former Branch-only template is no longer sent for 5+ owners.",
         data="New PASS ROB company (TIN prefix D). eSim seed: 5 CURRENT_OWNER, all 12-digit IC."),
    dict(id="12341_CH3", type="ROC", btype="Sdn Bhd / Bhd", count="3 directors",
         nationality="2 Malaysian, 1 Foreigner", stop="Application Approved",
         purpose="REQ-005 Example 2 (foreign director) + Sdn Bhd business type.",
         data="New PASS ROC company (TIN prefix C). eSim seed: 3 DIRECTOR, 1 with a non-12-digit (passport) ID."),
    dict(id="12341_CH8", type="ROC", btype="Sdn Bhd / Bhd", count="4 directors",
         nationality="All Malaysian", stop="Application Approved",
         purpose="Sdn Bhd normal case (REQ-005 Example 1), added at the QA's request so Sdn Bhd / Bhd is covered without a foreign director too.",
         data="New PASS ROC company (TIN prefix C). eSim: 4 DIRECTOR, all 12-digit IC."),
    dict(id="12341_CH4", type="LLP", btype="LLP", count="4 partners",
         nationality="All Malaysian", stop="Application Approved",
         purpose="LLP business type: same template; Appointment Letter renders an LLP registration number.",
         data="New PASS LLP company (TIN prefix PT). eSim seed: 4 PT. (Only 1 LLP was usable on the 23.09 sheet.)"),
    dict(id="12341_CH5", type="TRADING", btype="Business Trading (Sabah)", count="2 directors (typed)",
         nationality="All Malaysian", stop="Application Approved",
         purpose="Non-SSM business type: 'the same email is sent to every UCD' (SRD §2.2.2). Appointment Letter BRN fields TBC (Q-09).",
         data="Unique trading licence number (robot generates) + licence file (sample provided). TIN to use: Q-20. No eSim setup."),
    dict(id="12341_CH7", type="TRADING", btype="Business Trading (Sarawak)", count="2 directors (typed)",
         nationality="All Malaysian", stop="Application Approved",
         purpose="Second non-SSM business type (Sarawak) — every business type on the Pre-Application form is covered once.",
         data="Same as CH5, region Sarawak. TIN to use: Q-20. No eSim setup."),
    dict(id="12341_CH6", type="ROB", btype="Sole Proprietorship / Partnership", count="4 business owners",
         nationality="All Malaysian", stop="Application Submitted (then manual Revert to UCD)",
         purpose="Negative trigger: no new email at Submitted or on Revert to UCD (REQ-001).",
         data="New PASS ROB company. eSim seed: 4 CURRENT_OWNER."),
]

PRE_CHAIN = ("Precondition: chain {chain} has been executed by the automation up to {stop} "
             "(see the 'Test Data & Chains' sheet). The run log's READY FOR MANUAL EMAIL CHECK block "
             "gives the UCD email, Application No, Pre-Application No, company name, BRNs and the "
             "approval timestamp used below.")

def _pre(chain, stop="Application Approved"):
    return PRE_CHAIN.format(chain=chain, stop=stop)

# ── Test scenarios ───────────────────────────────────────────────────────────
# fields: id, section, chain, title, req, type, prio, pre, steps, expected, remarks, red (expected TBC)
TS = []
def ts(**kw):
    kw.setdefault("red", False)
    TS.append(kw)

A = "A — RHB Account Registration Guideline email to the UCD (Email Template 1, combined)"
B = "B — Same template regardless of company structure (REQ-005 Example 1 / Example 2)"
C = "C — Appointment Letter email to RHB Support (Email Template 3)"
D = "D — Appointment Letter document"
E = "E — Trigger, suppression and regression"

ts(id="12341_TS01", section=A, chain="12341_CH1", req="REQ-001, REQ-002",
   title="Guideline email is sent to the UCD on Application approval, To = UCD email, CC = apply@eauto.my",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open Mailtrap (staging inbox).\n2. Search for the UCD email address from the run log.\n3. Locate the email whose subject starts with 'RHB Online / Branch Account Opening'.\n4. Open the email headers (To, CC).\n5. Note the received time and compare it with the 'application approved' timestamp in the run log.",
   expected="• Exactly one RHB Account Registration Guideline email exists for this Application.\n• To: the UCD email address recorded in the approved Application.\n• CC: apply@eauto.my.\n• Received after the Application approval timestamp (not before).",
   remarks="Which field is the 'UCD email captured in the Application' (Admin In Charge email on the Pre-Application vs Director/Business Owner in Charge email on Application step 3) is Q-04. The chain uses DIFFERENT addresses for the two so the To field shows which one the system took — record it in Actual Result.\nSender is 'Pending confirmation from Operations' — do not assert From (Q-12).")
ts(id="12341_TS02", section=A, chain="12341_CH1", req="REQ-005",
   title="Guideline email subject uses the combined subject line with real values",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the guideline email found in TS01.\n2. Read the subject line exactly as displayed.",
   expected=f"• Subject = '{T1_SUBJECT}' with [Application No] = the Application No in the run log (NAxxxxxxxx) and [Company Name] = the company name in the Application.\n  e.g. 'RHB Online / Branch Account Opening - NA50000802 - ABC Motors Sdn Bhd'.\n• The subject is NOT 'RHB Online Account Opening - …' or 'RHB Branch Account Opening - …' (v1.1 subjects, withdrawn in v1.3).",
   remarks="SRD v1.3 §2.2.4.1 item 3. The email template document V3.0 has no subject line, so the SRD is the only source for it.")
ts(id="12341_TS03", section=A, chain="12341_CH1", req="REQ-005",
   title="Guideline email body matches the combined template (Option 1 online + Option 2 branch) word for word",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the guideline email body (HTML view).\n2. Compare it paragraph by paragraph with the 'Expected Templates' sheet, row 'Email Template 1 — Body'.\n3. Also check the Text view if Mailtrap shows one.",
   expected="• Every paragraph of the expected body is present, in order, with the same wording, including:\n  – 'Please find the Appointment Letter attached for your reference.' (no 'and further action')\n  – 'eAuto has notified the RHB Support Team …' + 'Kindly wait for RHB …'\n  – 'If you do not receive the documents from RHB within three (3) working days …'\n  – 'Option 1 – Online Account Opening' with the online link and the four (4) authorised or main users note and the seven (7) days branch visit\n  – 'Option 2 – Account Opening at RHB Branch'\n  – 'Once the RHB Islamic Current Account has been successfully opened …' + [Application Link]\n  – signature block (Thank you / Best regards / eAuto Sdn Bhd / address / Customer Service 03-27798899 / WhatsApp 012-2001324).\n• [Application No] and [Company Name] show the run's values.\n• The withdrawn v1.1 sentence 'As your company meets the eligibility requirements for RHB's online account-opening process …' does NOT appear.\n• No text from the removed Email Template 2 (e.g. 'Please bring the documents provided by RHB …') appears.",
   remarks="SRD v1.3 §2.2.4.1 item 4. The email template document V3.0 ends at 'For further assistance …' with no signature block — Q-01. Until answered, the SRD (with signature) is the expected result; record any difference.")
ts(id="12341_TS04", section=A, chain="12341_CH1", req="REQ-005",
   title="Links in the guideline email: RHB online registration link and Application Link",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps=f"1. In the guideline email, hover over / inspect the link under 'Option 1 – Online Account Opening'.\n2. Click it (opens the external RHB site).\n3. Hover over / inspect the [Application Link] near the end of the email.\n4. Click it in a fresh browser session.",
   expected=f"• The Option 1 link is rendered as a clickable link whose target is exactly {RHB_LINK} and it opens the RHB SME online page.\n• The Application Link is rendered as a clickable URL (not the literal text '[Application Link]').\n• Opening the Application Link lands on the page agreed in Q-03 for this Application (not an error page, not another company's Application).",
   remarks=f"RHB link source: SRD §2.2.1 item 5. Where the Application Link must land is not stated in the SRD — Q-03. Clicking the external RHB link from staging is allowed? (carried Q11).")
ts(id="12341_TS05", section=A, chain="12341_CH1", req="REQ-008",
   title="Appointment Letter is attached to the guideline email sent to the UCD",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH1"),
   steps="1. In the guideline email, open the Attachments tab.\n2. Note the file name, type and size.\n3. Download and open the attachment.",
   expected="• Exactly one Appointment Letter attachment is present.\n• It opens without error and is the Appointment Letter for THIS Application (company name and Application No match).\n• No RHB documents (Offer Letter, Direct Debit Application form, Board of Resolution) are attached.",
   remarks="SRD v1.3 REQ-008 (updated in v1.2). File format and file name are not specified — Q-08; record what is received.")

ts(id="12341_TS06", section=B, chain="12341_CH1", req="REQ-005 (Example 1), REQ-003/REQ-004 removed",
   title="ROB, 4 owners, all Malaysian → combined guideline email",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH1"),
   steps="1. Use the guideline email from TS01–TS03 (chain CH1).\n2. Confirm the subject and the presence of both Option 1 and Option 2.",
   expected="• Subject starts 'RHB Online / Branch Account Opening - '.\n• Body contains both 'Option 1 – Online Account Opening' and 'Option 2 – Account Opening at RHB Branch'.",
   remarks="REQ-005 acceptance criteria Example 1 (≤4 owners and no foreigner → Email Template 1).")
ts(id="12341_TS07", section=B, chain="12341_CH2", req="REQ-005 (Example 2)",
   title="ROB, 5 owners, all Malaysian → the same combined guideline email (no Branch-only email)",
   type="Functional / Negative of old rule", prio="High", pre=_pre("12341_CH2"),
   steps="1. In Mailtrap, search for chain CH2's UCD email.\n2. Open the guideline email; check To/CC, subject and body against TS01–TS03 and TS05.\n3. Search the same UCD email for any subject starting 'RHB Branch Account Opening'.",
   expected="• The guideline email is the combined Email Template 1 exactly as in TS02/TS03 (with CH2's Application No and company name).\n• To = UCD email, CC = apply@eauto.my, Appointment Letter attached.\n• No email with subject 'RHB Branch Account Opening - …' (old Email Template 2) is received.",
   remarks="REQ-005 Example 2 by count. Catches the old determination code (REQ-003) still running and selecting the removed template.")
ts(id="12341_TS08", section=B, chain="12341_CH3", req="REQ-005 (Example 2)",
   title="Sdn Bhd, 3 directors incl. 1 foreigner → the same combined guideline email",
   type="Functional / Negative of old rule", prio="High", pre=_pre("12341_CH3"),
   steps="1. In Mailtrap, search for chain CH3's UCD email.\n2. Open the guideline email; check To/CC, subject and body against TS01–TS03 and TS05.\n3. Search for any 'RHB Branch Account Opening' email.",
   expected="• Combined Email Template 1 received, identical in content to TS02/TS03 apart from CH3's values.\n• To = UCD email, CC = apply@eauto.my, Appointment Letter attached.\n• No 'RHB Branch Account Opening' email.",
   remarks="REQ-005 Example 2 by nationality. The foreign director may not display in SSM Details — no longer relevant to the outcome.")
ts(id="12341_TS08A", section=B, chain="12341_CH8", req="REQ-005 (Example 1)",
   title="Sdn Bhd, 4 directors, all Malaysian → the same combined guideline email",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH8"),
   steps="1. In Mailtrap, search for chain CH8's UCD email.\n2. Open the guideline email; check To/CC, subject and body against TS01–TS03 and TS05.",
   expected="• Combined Email Template 1 received with CH8's values; To = UCD email, CC = apply@eauto.my, Appointment Letter attached.",
   remarks="Added 02.10.2026 at the QA's request: Sdn Bhd / Bhd covered by a normal case as well as the foreign-director case (TS08).")
ts(id="12341_TS09", section=B, chain="12341_CH4", req="REQ-005",
   title="LLP, 4 partners → the same combined guideline email",
   type="Functional / Positive", prio="Medium", pre=_pre("12341_CH4"),
   steps="1. In Mailtrap, search for chain CH4's UCD email.\n2. Open the guideline email; check To/CC, subject and body against TS01–TS03 and TS05.",
   expected="• Combined Email Template 1 received with CH4's values; To = UCD email, CC = apply@eauto.my, Appointment Letter attached.",
   remarks="Business-type coverage for 'the same email is sent to every UCD' (SRD §2.2.2).")
ts(id="12341_TS10", section=B, chain="12341_CH5, CH7", req="REQ-005",
   title="Business Trading (Sabah) and Business Trading (Sarawak) (non-SSM) → the same combined guideline email",
   type="Functional / Positive", prio="Medium", pre="Precondition: chains CH5 (Sabah) and CH7 (Sarawak) executed to Application Approved.",
   steps="For each of CH5 and CH7:\n1. In Mailtrap, search for the chain's UCD email.\n2. Open the guideline email; check To/CC, subject and body against TS01–TS03 and TS05.",
   expected="• For both: combined Email Template 1 received with that chain's values; To = UCD email, CC = apply@eauto.my, Appointment Letter attached.",
   remarks="v1.1 had this case TBC (no SSM data for the determination). v1.3 removes the determination, and SRD §2.2.2 says the same email is sent to every UCD, so the expected result is now confirmed by the SRD.")

ts(id="12341_TS11", section=C, chain="12341_CH1", req="REQ-006",
   title="Appointment Letter email: To = BIS.Support@rhbgroup.com, CC = UCD email + apply@eauto.my",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH1"),
   steps="1. In Mailtrap, search for the UCD email address from the run log (it is in CC of this email).\n2. Open the email whose subject starts 'Approved eAuto Registration'.\n3. Inspect To and CC.",
   expected="• To: BIS.Support@rhbgroup.com.\n• CC contains the UCD email address recorded in the approved Application AND apply@eauto.my.\n• Received after the Application approval timestamp.",
   remarks="Staging mail must be captured by Mailtrap so nothing reaches RHB — confirm (Q-17). Do not assert From (Q-12).")
ts(id="12341_TS12", section=C, chain="12341_CH1", req="REQ-009",
   title="Appointment Letter email subject with real values",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the email from TS11.\n2. Read the subject line.",
   expected=f"• Subject = '{T3_SUBJECT}' with [Company Name] = company name in the Application and [BRN Number] = the BRN agreed in Q-05.\n  e.g. 'Approved eAuto Registration - ABC Motors Sdn Bhd - 202401234567'.",
   remarks="The SRD example uses a 12-digit number (new BRN format) but the field is not defined — Q-05. Record which BRN is shown.")
ts(id="12341_TS13", section=C, chain="12341_CH1", req="REQ-009",
   title="Appointment Letter email body matches Email Template 3 word for word, with correct values",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the email body.\n2. Compare with the 'Expected Templates' sheet, row 'Email Template 3 — Body'.\n3. Compare each value line with the run log / Application.",
   expected="• Every paragraph is present, in order, with the same wording, including the one (1) working day request, the Reply All instruction and the signature block.\n• Company Name = Application company name; Business Registration Number = per Q-05; UCD Contact Person = per Q-04; Contact Number = per Q-04; Email Address = UCD email.\n• The withdrawn sentence 'The above company is not eligible for RHB's online account-opening process and will complete the account opening at an RHB branch.' does NOT appear.",
   remarks="SRD v1.3 §2.2.5.1. The chain uses different name / mobile / email for the Admin In Charge and the Director in Charge so the email shows which source the system used (Q-04).")
ts(id="12341_TS14", section=C, chain="12341_CH1", req="REQ-008",
   title="Appointment Letter is attached to the RHB Support email",
   type="Functional / Positive", prio="High", pre=_pre("12341_CH1"),
   steps="1. In the email from TS11, open Attachments.\n2. Download and open the attachment.",
   expected="• Exactly one Appointment Letter attachment, opens without error, for THIS Application.",
   remarks="")
ts(id="12341_TS15", section=C, chain="12341_CH2, CH3, CH4, CH5, CH7, CH8", req="REQ-006, REQ-009",
   title="Appointment Letter email is sent for every approved Application, whatever the company structure",
   type="Functional / Positive", prio="Medium", pre="Precondition: chains CH2, CH3, CH4, CH5, CH7 and CH8 executed to Application Approved.",
   steps="For each chain:\n1. In Mailtrap, search for the chain's UCD email.\n2. Open the 'Approved eAuto Registration' email.\n3. Check To/CC, subject, body values and the attachment as in TS11–TS14.",
   expected="• For every chain: one Appointment Letter email, To = BIS.Support@rhbgroup.com, CC = UCD email + apply@eauto.my, subject/body per Email Template 3 with that chain's values, Appointment Letter attached.",
   remarks="Business Trading (CH5, CH7): what [BRN Number] shows is Q-05 / Q-09 — record it.")

ts(id="12341_TS16", section=D, chain="12341_CH1", req="REQ-007",
   title="Appointment Letter layout and fixed text match the SRD template",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the Appointment Letter attached to the UCD email (TS05).\n2. Compare it with the 'Expected Templates' sheet, section 'Appointment Letter', and with Sample_Appointment_Letter_v2.0_20260918.docx.\n3. Check page header, body, signatory and footer on every page.",
   expected="• Title: 'LETTER OF CONFIRMATION OF REGISTRATION AS A USED CAR DEALER (UCD) UNDER eAUTO SDN. BHD. PLATFORM'.\n• Letterhead: eAuto logo, 'eAuto Sdn Bhd 200401038456 (676967-T)', 'Level 15 Sunway Tower, Jalan Ampang, 50450 Kuala Lumpur', 'Tel: 03-2779 8893'.\n• Clauses 1–8 present with their numbers displayed, wording as the template (Clause 6 refers to 'Clause 5').\n• Registration details table (UCD Name / Company Registration No. / UCD / Dealer Reference No.).\n• Closing 'Yours faithfully, for and on behalf of eAuto Sdn. Bhd.', signature image, 'CHIA KET MING', 'COO'.\n• Footer: 'Website: www.eauto.my | Customer Service: 03-2779 8899 | Email: support@eauto.my'.\n• No layout break (text cut off, overlapping, blank page).",
   remarks="SRD v1.3 §2.2.5.2 items 1–8. Title spacing differs between the SRD ('SDN. BHD. PLATFORM') and the template .docx ('SDN. BHD.PLATFORM') — Q-10.")
ts(id="12341_TS17", section=D, chain="12341_CH1", req="REQ-007",
   title="Appointment Letter pre-populated fields carry the approved Application's data without manual input",
   type="Functional / Data", prio="High", pre=_pre("12341_CH1"),
   steps="1. Open the Appointment Letter.\n2. For each field below, compare the letter with its source:\n   a. Date vs the Application approval date (run log, Asia/Kuala_Lumpur).\n   b. Our Ref vs Application No and approval year.\n   c. Recipient company name vs Application company name.\n   d. Old BRN / New BRN vs BackOffice > Pre-Application summary > SSM details.\n   e. Company Address vs the Application (field per Q-06).\n   f. Clause 1 company name and registration no.\n   g. Clause 4 table: UCD Name, Company Registration No., UCD / Dealer Reference No.",
   expected="• Date = approval date in DD/MM/YYYY.\n• Our Ref = eAuto/OPS/UCD/<Application No>/<approval year> (bracket rendering per Q-07).\n• [UCD Company Name] = Application company name (recipient block, Clause 1, Clause 4).\n• Company Registration No. = '<Old BRN> (<New BRN>)' from the SSM details, e.g. '1511229-A (202301017307)', identical in recipient block, Clause 1 and Clause 4.\n• [Company Address] = the Application's company address.\n• UCD / Dealer Reference No. = '<Pre-Application No> / <Application No>', e.g. 'P260827/00542 / NA69001196'.\n• No placeholder (text in [ ]) remains unresolved.",
   remarks="SRD v1.3 §2.2.5.2 item 9. The sample letter keeps square brackets around Our Ref and around the registration no. in the recipient block and Clause 1 but not in the table — Q-07.")
ts(id="12341_TS18", section=D, chain="12341_CH1", req="REQ-008",
   title="The same Appointment Letter is attached to both emails",
   type="Functional / Data", prio="Medium", pre=_pre("12341_CH1"),
   steps="1. Download the attachment from the UCD guideline email (TS05) and from the RHB Support email (TS14).\n2. Compare file name, size and content.",
   expected="• Both attachments are the same letter (same Our Ref, date, company, BRNs, reference numbers).",
   remarks="")
ts(id="12341_TS19", section=D, chain="12341_CH3, CH4, CH8", req="REQ-007",
   title="Appointment Letter registration number for Sdn Bhd and LLP formats",
   type="Functional / Data", prio="Medium", pre="Precondition: chains CH3, CH8 and CH4 executed to Application Approved.",
   steps="1. Open the Appointment Letter of CH3 and CH8 (Sdn Bhd) and of CH4 (LLP).\n2. Check the registration number in the recipient block, Clause 1 and Clause 4 against the SSM details of each Pre-Application.",
   expected="• Sdn Bhd: '<old ROC with check letter> (<12-digit new ROC>)', e.g. '639691-H (200401001188)'.\n• LLP: '<LLP number, e.g. LLP0035174-LGN> (<12-digit new number>)'.\n• Values identical to the Pre-Application summary SSM details; nothing truncated or doubled (e.g. no '-H-A').",
   remarks="The 24.09 run showed eAuto can render a doubled check letter ('IP0581553-U-A') when eSim is seeded whole — the chain now seeds split; this check catches a regression of that in the letter.")
ts(id="12341_TS20", section=D, chain="12341_CH5, CH7", req="REQ-007",
   title="Appointment Letter for a Business Trading (non-SSM) company — Sabah and Sarawak",
   type="Functional / Data", prio="Medium", pre="Precondition: chains CH5 and CH7 executed to Application Approved.", red=True,
   steps="1. Open the Appointment Letter of CH5 and of CH7.\n2. Check the recipient block, Clause 1 and Clause 4 'Company Registration No.'.",
   expected="• TBC — the SRD sources [Old BRN] / [New BRN] from the SSM details, which a Business Trading company does not have (Q-09).\n• In any case: the letter is generated and attached, and contains no unresolved placeholder or empty brackets such as '()'.",
   remarks="RED — expected result pending Q-09.")
ts(id="12341_TS21", section=D, chain="12341_CH1 (and every chain)", req="REQ-005, REQ-007, REQ-009",
   title="No unresolved placeholders in any subject, body or letter",
   type="Functional / Content", prio="High", pre=_pre("12341_CH1"),
   steps="1. In each email (guideline + RHB Support) search the subject and body for '[' and ']'.\n2. In the Appointment Letter search for '[' and ']'.\n3. Repeat for every chain executed.",
   expected="• None of these appear literally: [Application No], [Company Name], [BRN Number], [Name], [Contact Number], [UCD Email Address], [RHB Online Registration Link], [Application Link], [DD/MM/YYYY], [YYYY], [UCD Company Name], [Old BRN], [New BRN], [Company Address], [Pre-Application No].\n• No empty value (e.g. 'Company Name: ' with nothing after it).",
   remarks="Brackets kept around a resolved value in the letter (Our Ref, registration no.) are Q-07, not a placeholder failure.")

ts(id="12341_TS22", section=E, chain="12341_CH1", req="REQ-001",
   title="Old approved-application email (3 RHB documents) is no longer sent",
   type="Regression / Negative", prio="High", pre=_pre("12341_CH1"),
   steps="1. In Mailtrap, list every email to the UCD email address of CH1.\n2. Look for the existing approved-application email (the one that carried the Offer Letter, Direct Debit Application form and Board of Resolution) — use the production subject from a pre-CR approval as reference (Q-23).",
   expected="• The old approved-application email is not received.\n• No email from eAuto on this approval carries the Offer Letter, Direct Debit Application form or Board of Resolution.",
   remarks="Negative assertion — passes silently if only the arriving emails are looked at. Needs the old email's subject (Q-23).")
ts(id="12341_TS23", section=E, chain="12341_CH1", req="REQ-001",
   title="One approval sends exactly one guideline email and one Appointment Letter email (no duplicates)",
   type="Functional / Negative", prio="High", pre=_pre("12341_CH1"),
   steps="1. In Mailtrap, list every email for CH1's UCD email address received from the Application approval time until the quiet window has passed (Q-16).\n2. Count emails by subject.",
   expected="• Exactly 1 × 'RHB Online / Branch Account Opening - …' and exactly 1 × 'Approved eAuto Registration - …'.\n• No other new email triggered by the approval (apart from any existing, unchanged notification — list it if one appears).",
   remarks="")
ts(id="12341_TS24", section=E, chain="12341_CH1", req="REQ-001",
   title="Pre-Application approval does not send the new emails",
   type="Functional / Negative", prio="Medium", pre=_pre("12341_CH1"),
   steps="1. From the run log, take the 'pre-application approved' timestamp and the 'application approved' timestamp.\n2. In Mailtrap, list emails for CH1's UCD email received between those two times.",
   expected="• No 'RHB Online / Branch Account Opening' or 'Approved eAuto Registration' email is received before the Application approval.\n• The existing Pre-Application approval email (Application Link) is still received as before.",
   remarks="Gap noted by the previous QA (not in the v1.1 sheet). No extra test data: uses CH1's timestamps.")
ts(id="12341_TS25", section=E, chain="12341_CH6", req="REQ-001",
   title="No new email at Application Submitted, nor on Revert to UCD",
   type="Functional / Negative", prio="High", pre=_pre("12341_CH6", "Application Submitted"),
   steps="1. In Mailtrap, list emails for CH6's UCD email after the 'application submitted' timestamp; wait the quiet window (Q-16).\n2. In BackOffice > Application, open CH6's Application and Revert to UCD (role/control per Q-15). Note the time.\n3. In Mailtrap, list emails again after the revert; wait the quiet window.",
   expected="• No guideline email and no Appointment Letter email after submission.\n• No guideline email and no Appointment Letter email after Revert to UCD.\n• Existing revert notification (if any) unchanged.",
   remarks="The trigger is Application approval only (REQ-001).")
ts(id="12341_TS26", section=E, chain="12341_CH1", req="REQ-001 ('existing Application approval handling shall remain unchanged')",
   title="Application approval handling unchanged: status, Registration Document step, hardcopy resubmission",
   type="Regression", prio="Medium", pre=_pre("12341_CH1") + " Run AFTER TS01–TS24 so their mailbox counts are not disturbed.",
   steps="1. In BackOffice > Application listing, search CH1's Application No and check its status.\n2. Open the Application > Registration Document.\n3. Set Hardcopy Doc status to 'Pending UCD - Incomplete Docs' and click Update.\n4. Click 'Request Hardcopy Resubmission', select documents, enter remarks and confirm.\n5. In Mailtrap, open the resubmission email.",
   expected="• Status shows Approved, as before the CR.\n• The Request Hardcopy Resubmission popup and its document checklist display and work as before.\n• The resubmission email is sent to the UCD with apply@eauto.my in CC and the Assignee in BCC.\n• The Reverted Reason displays on the Registration Document page.",
   remarks="EAINT-11763 regression (old R4). 'As before' needs that ticket's SRD/test sheet as the reference (Q-14). The checklist still lists RHB Offer Letter / Direct Debit / BoD Reso — out of scope here, note only.")

# ── Requirements (v1.3) ──────────────────────────────────────────────────────
REQS = [
    ("EAINT-12341-REQ-001", "Email Trigger", "Active", "Upon Application approval the UCD receives the guideline email; the existing approved application email with the 3 RHB documents is no longer sent; existing approval handling unchanged."),
    ("EAINT-12341-REQ-002", "Email Recipient", "Active", "Guideline email addressed to the UCD email recorded in the approved Application."),
    ("EAINT-12341-REQ-003", "Guideline Determination", "REMOVED in v1.3", "Single email template, no template selection needed."),
    ("EAINT-12341-REQ-004", "Data Source", "REMOVED in v1.3", "Director count and nationality no longer read."),
    ("EAINT-12341-REQ-005", "Email Template Content", "Updated in v1.3", "Guideline email content matches Email Template 1 (§2.2.4.1) regardless of number of directors/owners and nationality (Example 1 and Example 2 both → Template 1)."),
    ("EAINT-12341-REQ-006", "Recipient and Copy", "Active", "Appointment Letter email To BIS.Support@rhbgroup.com; UCD email in CC."),
    ("EAINT-12341-REQ-007", "Letter Generation", "Updated in v1.2", "Appointment Letter per §2.2.5.2 generated with Application details pre-populated, no manual input."),
    ("EAINT-12341-REQ-008", "Letter Attachment", "Updated in v1.2", "Appointment Letter attached to the RHB Support email AND to the guideline email to the UCD."),
    ("EAINT-12341-REQ-009", "Email Template Content", "Active (sentence withdrawn v1.1)", "RHB Support email content matches Email Template 3 (§2.2.5.1)."),
]

# ── v1.1 → v1.3 change analysis ──────────────────────────────────────────────
CHANGES = [
    ("v1.2", "REQ-008", "Appointment Letter attached to the UCD emails as well as the RHB Support email.", "Closes v1.1 intake Q5 and the 'raise for SRD v1.2' note. TS05, TS14, TS18."),
    ("v1.2", "REQ-007 / §2.2.5.2", "Appointment Letter template added (title, letterhead, date, Our Ref, recipient, 8 clauses, signatory, footer, pre-populated fields).", "Closes v1.1 intake Q4 (fields pending Operations). New TS16, TS17, TS19, TS20."),
    ("v1.3", "REQ-003", "Guideline determination by director count / nationality REMOVED.", "v1.1 E2E1–E2E12 (template selection, 4 vs 5 boundary, foreigner, secretary/shareholder/CO exclusion) RETIRED. Replaced by TS06–TS10 'same template regardless'."),
    ("v1.3", "REQ-004", "Reading director count and nationality from SSM details REMOVED.", "Intake Q2 (count source rules) and Q7 (seed a CO) no longer needed; Q12 (IG vs D TIN) no longer affects the result."),
    ("v1.3", "REQ-005 / §2.2.4.1", "One combined Email Template 1 to every UCD; new subject 'RHB Online / Branch Account Opening - …'; new body with Option 1 (online) and Option 2 (branch), 3-working-day line; 'and further action' removed.", "TS02, TS03, TS04 rewritten against the new text."),
    ("v1.3", "§2.2.4.2", "Email Template 2 (Branch) REMOVED.", "Negative checks: no 'RHB Branch Account Opening' email (TS07, TS08)."),
    ("v1.3", "§2.1 / §2.2.2", "Text updated to 'the same RHB Account Registration Guideline email is sent to every UCD'.", "Business Trading (old E2E12, TBC) now has a confirmed expected template → TS10. Letter BRN still TBC (TS20)."),
    ("—", "Unchanged", "REQ-001, REQ-002, REQ-006, REQ-009, Out-of-scope list (UCD upload + BO verification of RHB docs remains OUT of scope).", "TS01, TS11–TS15, TS22–TS25 carried over."),
]

RETIRED = [
    ("12341_E2E1", "ROB 4 MY → Template 1", "Covered by TS06 (same template). Boundary no longer meaningful."),
    ("12341_E2E2", "ROB 5 MY → Template 2", "Replaced by TS07 (5 owners → same combined template)."),
    ("12341_E2E3", "ROB 3 incl. 1 foreigner → Template 2", "Retired — REQ-003/004 removed. Foreigner coverage kept once in TS08 (ROC)."),
    ("12341_E2E4", "ROB 5 incl. 1 foreigner → Template 2", "Retired — REQ-003/004 removed."),
    ("12341_E2E5", "ROC 4 dir + 1 sec → Template 1", "Retired — secretary exclusion no longer affects the outcome."),
    ("12341_E2E6", "ROC 5 dir → Template 2", "Retired — covered by TS07 (count) and TS08 (ROC)."),
    ("12341_E2E7", "ROC 3 incl. 1 foreigner → Template 2", "Replaced by TS08."),
    ("12341_E2E8", "ROC 2 dir + 3 sh → Template 1", "Retired — shareholder exclusion no longer affects the outcome."),
    ("12341_E2E9", "LLP 4 PT → Template 1", "Replaced by TS09."),
    ("12341_E2E10", "LLP 5 PT → Template 2", "Retired — REQ-003 removed (also no usable LLP)."),
    ("12341_E2E11", "LLP 3 incl. 1 foreigner → Template 2", "Retired — REQ-003 removed."),
    ("12341_E2E12", "Business Trading → TBC", "Replaced by TS10 (template now confirmed, Sabah CH5 + Sarawak CH7) + TS20 (letter BRN TBC)."),
    ("12341_E2E13", "Template 3 To/CC", "Carried over as TS11."),
    ("12341_E2E14", "Template 3 attachment", "Carried over as TS14 + TS16/TS17 (letter now specified)."),
    ("12341_E2E15", "Template 3 subject/body", "Carried over as TS12, TS13."),
    ("12341_E2E16", "Both emails from one approval", "Carried over as TS23."),
    ("12341_E2E17", "Template 3 without ineligibility sentence", "Folded into TS13."),
    ("12341_R1", "Old email suppressed", "Carried over as TS22."),
    ("12341_R2", "No email at Submitted / Revert", "Carried over as TS25."),
    ("12341_R3", "No unresolved placeholders", "Carried over as TS21 (extended to the letter)."),
    ("12341_R4", "Hardcopy resubmission unaffected", "Carried over as TS26."),
]

# ── Open questions ───────────────────────────────────────────────────────────
# (id, question, why it matters / what QA does meanwhile, blocks, owner, status)
QUESTIONS = [
    ("Q-01", "The email template document V3.0 (Yeng, 29.09) ends at 'For further assistance or inquiries, please contact us at apply@eauto.my.' with no 'Thank you / Best regards / eAuto Sdn Bhd / address / Customer Service / WhatsApp' block. SRD v1.3 §2.2.4.1 keeps that block. Which one is expected?", "Until answered the SRD is used (it is the baseline). A missing signature will be reported, not failed silently.", "TS03", "BA (Chee Mei Jia) / Operations", "Open"),
    ("Q-02", "The template document's heading 'UCD ONLINE REGISTRATION (ONLINE & BRANCH COMBINED)' — confirm it is only the document title and NOT the email subject (SRD subject: 'RHB Online / Branch Account Opening - [Application No] - [Company Name]').", "TS02 uses the SRD subject.", "TS02", "BA", "Open"),
    ("Q-03", "[Application Link] — which link is it and where should it land for an APPROVED Application (the same Application form link emailed at Pre-Application approval, the Registration Document step, something else)? Any expiry?", "TS04 can only check 'clickable, not an error' until answered.", "TS04", "BA / Dev", "Open"),
    ("Q-04", "Which fields feed (a) the 'UCD email address captured in the Application' (To of Email Template 1, CC of Email Template 3, Email Address in Template 3) and (b) Template 3 'UCD Contact Person: [Name]' and 'Contact Number': the Admin In Charge on the Pre-Application, or the Director / Business Owner in Charge on Application step 3?", "The chain now uses different name / mobile / email for the two, so the first run will SHOW what the system uses — but QA needs the intended answer to pass/fail.", "TS01, TS11, TS13", "BA / Dev", "Open"),
    ("Q-05", "Template 3 [BRN Number] — new BRN (12-digit, as the SRD example '202401234567' suggests) or old BRN? What is shown for Business Trading (licence no.)?", "TS12/TS13 record the value shown.", "TS12, TS13, TS15", "BA", "Open"),
    ("Q-06", "Appointment Letter [Company Address] — 'company address captured in the Application': which address (the showroom address carried from the Pre-Application, or another address field)? Single line or multi-line?", "TS17 compares against the showroom address until answered.", "TS17", "BA / Dev", "Open"),
    ("Q-07", "The sample letter keeps square brackets in the output: 'Our Ref: [eAuto/OPS/UCD/NA69001196/2026]' and '[1511229-A (202301017307)]' in the recipient block and Clause 1, but not in the Clause 4 table. Are the outer brackets literal (expected in the generated letter) or a sample artefact?", "Affects pass/fail of TS17 and TS21.", "TS17, TS21", "BA / Operations", "Open"),
    ("Q-08", "Appointment Letter file format (PDF or DOCX) and attachment file name convention?", "Record what is received.", "TS05, TS14, TS18", "BA / Dev", "Open"),
    ("Q-09", "Business Trading (no SSM details): what should the letter show for [Old BRN] ([New BRN]) — the trading licence number? blank?", "TS20 is RED until answered.", "TS20", "BA", "Open"),
    ("Q-10", "Letter title: SRD v1.3 'UNDER eAUTO SDN. BHD. PLATFORM' vs template .docx 'UNDER eAUTO SDN. BHD.PLATFORM' (no space). Which is correct?", "Minor — will be raised as cosmetic if the output differs from the SRD.", "TS16", "BA", "Open"),
    ("Q-11", "Letter date / [YYYY]: in which time zone is the 'Application approval date' taken (MYT)? Any rule for approvals around midnight / year end?", "Low risk; noted.", "TS17", "Dev", "Open"),
    ("Q-12", "Sender (From) for all three emails is still 'Pending confirmation from Operations' in v1.3. Has it been decided?", "No case asserts From until confirmed.", "TS01, TS11", "Operations", "Open"),
    ("Q-13", "The Jira description (item 5) still describes the v1.1 determination rule (≤4 / ≥5 / foreigner) and a UCD upload + BackOffice verification step. SRD v1.3 removes the rule and keeps the upload OUT of scope. Confirm SRD v1.3 is the test baseline (and ask the BA to update the ticket).", "Test design follows SRD v1.3.", "All", "BA", "Open"),
    ("Q-14", "(carried Q6) Hardcopy resubmission regression: where do the 'as before' expectations come from — please add the EAINT-11763 SRD or test sheet to 00-input/.", "TS26 checks the listed behaviour only.", "TS26", "QA / BA", "Open"),
    ("Q-15", "(carried Q9) Which BackOffice role and control performs Revert to UCD?", "Manual step in TS25.", "TS25", "QA / BA", "Open"),
    ("Q-16", "(carried Q10) Quiet window for 'no email' checks — proposed 10 minutes after the action. OK?", "Proposal only.", "TS23, TS24, TS25", "QA Lead", "Proposed"),
    ("Q-17", "Confirm staging mail is captured by Mailtrap (sandbox) so no live email reaches BIS.Support@rhbgroup.com during testing.", "Must be true before CH1 runs.", "All", "Dev / DevOps", "Open"),
    ("Q-18", "Applications approved before deployment: any back-fill / re-send of the new emails? (Assumed none — not in the SRD.)", "Not tested unless confirmed.", "—", "BA", "Open"),
    ("Q-19", "Can an Approved Application be reverted and approved again? If so, should the emails be sent again?", "Would add a scenario.", "—", "BA", "Open"),
    ("Q-20", "Test data: please share a fresh company-details-checker sheet (PASS rows) — needed: 3 ROB (TIN D), 2 ROC (TIN C), 1 LLP (TIN PT). For Business Trading (CH5 Sabah, CH7 Sarawak): which TINs may be used (Application step 1 makes TIN mandatory)?", "Chains refuse to run without an assigned company.", "CH1–CH8", "QA (Azila)", "Open"),
    ("Q-21", "Run identity: which name / email prefix should the automation use for the Admin In Charge and Director (previously 'AZFAR QA' / azfar.qa.*@modefair.com)? Now configurable via QA_TESTER / QA_EMAIL_PREFIX.", "Defaults: 'QA AUTOMATION' / qa.eaint12341.", "CH1–CH6", "QA (Azila)", "Open"),
    ("Q-22", "'Clean existing data': which records? The 3 failed v1.1 chains (P260924/00874 etc.) in staging and their eSim rows? The ledger keeps those companies as spent by rule (one company, one use).", "Nothing has been deleted.", "—", "QA (Azila) / Azfar", "Open"),
    ("Q-23", "Subject line of the OLD approved-application email (to prove it is no longer sent).", "TS22 needs it.", "TS22", "QA / Dev", "Open"),
]
