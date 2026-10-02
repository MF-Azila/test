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

# ── Runs ─────────────────────────────────────────────────────────────────────
# Defined in build_test_cases.py (workbook) and build_esim_setup.py (eSim sheet),
# in execution priority: Sdn Bhd > Sole Prop / Partnership > LLP > BT Sabah > BT Sarawak.
# CH1 Sdn Bhd 4 MY (main) · CH2 Sdn Bhd 3 incl. 1 foreign · CH3 ROB 4 · CH4 ROB 5 ·
# CH5 ROB 4 stops at Submitted · CH6 LLP 4 · CH7 BT Sabah · CH8 BT Sarawak.

# ── Test cases ───────────────────────────────────────────────────────────────
# Defined per run in build_test_cases.py (sorted by business type). TS ids of
# the first v1.3 draft map to the new ids as in TS_TO_TC below.
TS_TO_TC = {
    "TS01": "xx-05", "TS02": "xx-06", "TS03": "xx-07", "TS04": "xx-08", "TS05": "xx-09",
    "TS06": "CH3-05–10", "TS07": "CH4-05–10", "TS08": "CH2-05–10", "TS08A": "CH1-05–10", "TS09": "CH6-05–10",
    "TS10": "CH7/CH8-05–10", "TS11": "xx-11", "TS12": "xx-12", "TS13": "xx-13", "TS14": "xx-14",
    "TS15": "xx-11–14", "TS16": "xx-15", "TS17": "xx-16", "TS18": "xx-17", "TS19": "CH1/CH2/CH6-16",
    "TS20": "CH7/CH8-16", "TS21": "xx-18", "TS22": "CH1-20", "TS23": "xx-19", "TS24": "xx-04",
    "TS25": "CH5-05/06", "TS26": "CH1-21",
}

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
    ("12341_E2E12", "Business Trading → TBC", "Replaced by TS10 (template now confirmed, Sabah CH7 + Sarawak CH8) + TS20 (letter BRN TBC)."),
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
    ("Q-20", "Test data: please share a fresh company-details-checker sheet (PASS rows) — needed: 3 ROB (TIN D), 2 ROC (TIN C), 1 LLP (TIN PT). For Business Trading (CH7 Sabah, CH8 Sarawak): which TINs may be used (Application step 1 makes TIN mandatory)?", "Chains refuse to run without an assigned company.", "CH1–CH8", "QA (Azila)", "Open"),
    ("Q-21", "Run identity: which name / email prefix should the automation use for the Admin In Charge and Director (previously 'AZFAR QA' / azfar.qa.*@modefair.com)? Now configurable via QA_TESTER / QA_EMAIL_PREFIX.", "Defaults: 'QA AUTOMATION' / qa.eaint12341.", "CH1–CH8", "QA (Azila)", "Open"),
    ("Q-22", "'Clean existing data': which records? The 3 failed v1.1 chains (P260924/00874 etc.) in staging and their eSim rows? The ledger keeps those companies as spent by rule (one company, one use).", "Nothing has been deleted.", "—", "QA (Azila) / Azfar", "Open"),
    ("Q-23", "Subject line of the OLD approved-application email (to prove it is no longer sent).", "TS22 needs it.", "TS22", "QA / Dev", "Open"),
]
