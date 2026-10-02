"""EAINT-12341 — QA test case workbook (SRD v1.3), sorted by business type.

    pip install openpyxl pyyaml
    python build_test_cases.py

Writes EAINT-12341_Test_Cases_v1.3.xlsx and ../01-intake/scenarios.yaml.
Text constants, requirements, questions and history come from ts_v13.py.
"""
import os
import re

import yaml
from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, DataBarRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

import ts_v13 as d

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "EAINT-12341_Test_Cases_v1.3.xlsx")
YAML_OUT = os.path.join(HERE, "..", "01-intake", "scenarios.yaml")

FONT = "Arial"
THIN = Side(style="thin", color="A6A6A6")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
TOP = Alignment(wrap_text=True, vertical="top")
MID = Alignment(wrap_text=True, vertical="center", horizontal="center")
fill = lambda hex_: PatternFill("solid", fgColor=hex_)

# ── colours ──────────────────────────────────────────────────────────────
BUSINESS = {  # band colour, light tint for the run row — in execution priority order
    "Sdn Bhd / Bhd": ("375623", "E2EFDA"),
    "Sole Proprietorship / Partnership": ("1F4E78", "DDEBF7"),
    "LLP": ("7030A0", "EADCF4"),
    "Business Trading (Sabah)": ("C65911", "FCE4D6"),
    "Business Trading (Sarawak)": ("833C0B", "F8CBAD"),
}
AREA = {  # test area → cell colour
    "Setup & Flow": "D9D9D9",
    "Guideline Email (UCD)": "BDD7EE",
    "RHB Support Email": "C6EFCE",
    "Appointment Letter": "E4DFEC",
    "Negative & Regression": "FFE699",
}
RESULT_COLOURS = {  # result → (fill, font)
    "Pass": ("C6EFCE", "006100"),
    "Fail": ("FFC7CE", "9C0006"),
    "Blocked": ("FFEB9C", "9C5700"),
    "Not Run": ("F2F2F2", "595959"),
    "N/A": ("D9D9D9", "595959"),
}
RESULTS = list(RESULT_COLOURS)
QA_NAMES = ["Siti Nur Azila", "Muhammad Amirul Azfar"]
TBC_FILL = "FF7C80"


def tc_ref(text):
    """Replace first-draft TS ids with the new test case ids."""
    return re.sub(r"\bTS\d+A?\b", lambda m: d.TS_TO_TC.get(m.group(0), m.group(0)), text)


# ── runs, in business-type order ─────────────────────────────────────────
RUNS = [  # execution priority: Sdn Bhd > Sole Prop / Partnership > LLP > BT Sabah > BT Sarawak
    dict(id="CH1", btype="Sdn Bhd / Bhd", kind="ROC", people="4 directors, all Malaysian",
         tin="C", brn="<ROC no. with letter> (<12-digit no.>), e.g. 1511229-A (202301017307)",
         note="Main run — do it first. Carries the extra checks CH1-20 (old email) and CH1-21 (hardcopy regression).", main=True),
    dict(id="CH2", btype="Sdn Bhd / Bhd", kind="ROC", people="3 directors: 2 Malaysian + 1 foreigner",
         tin="C", brn="<ROC no. with letter> (<12-digit no.>), e.g. 1511229-A (202301017307)",
         note="REQ-005 Example 2 (foreign director) — must get the SAME email as CH1."),
    dict(id="CH3", btype="Sole Proprietorship / Partnership", kind="ROB", people="4 business owners, all Malaysian",
         tin="D", brn="<ROB no. with letter> (<12-digit no.>), e.g. 003123456-X (202103123456)",
         note="Sole Proprietorship / Partnership normal case (REQ-005 Example 1)."),
    dict(id="CH4", btype="Sole Proprietorship / Partnership", kind="ROB", people="5 business owners, all Malaysian",
         tin="D", brn="<ROB no. with letter> (<12-digit no.>), e.g. 003123456-X (202103123456)",
         note="REQ-005 Example 2 (5 or more owners) — must get the SAME email as CH1."),
    dict(id="CH5", btype="Sole Proprietorship / Partnership", kind="ROB", people="4 business owners, all Malaysian",
         tin="D (or IG)", brn="", note="Stops at Submitted — no-email checks, then a manual Revert to UCD.", negative=True),
    dict(id="CH6", btype="LLP", kind="LLP", people="4 partners, all Malaysian",
         tin="PT", brn="<LLP no. incl. -LGN> (<12-digit no.>), e.g. LLP0035174-LGN (202304001238)",
         note="LLP is not in the eSimulator guide — confirm the eSim screen first."),
    dict(id="CH7", btype="Business Trading (Sabah)", kind="TRADING", people="2 directors (typed by the robot)",
         tin="any valid (Q-20)", brn="TBC — no SSM details for Business Trading (Q-09)",
         note="Non-SSM. No eSim. Letter registration number expected result is TBC (red)."),
    dict(id="CH8", btype="Business Trading (Sarawak)", kind="TRADING", people="2 directors (typed by the robot)",
         tin="any valid (Q-20)", brn="TBC — no SSM details for Business Trading (Q-09)",
         note="Non-SSM, Sarawak. No eSim. Letter registration number expected result is TBC (red)."),
]

RUNLOG = ("the run log (black window) block READY FOR MANUAL EMAIL CHECK and the expected-email file "
          "04-runs/12341_{id}_<run>.md")


def steps(*items):
    return "\n".join(f"{i}. {s}" for i, s in enumerate(items, start=1))


def cases_for(r):
    """The test cases of one run, numbered <run>-01, -02, …"""
    rid, trading = r["id"], r["kind"] == "TRADING"
    src = RUNLOG.format(id=rid)
    pre_appr = f"{rid}-02 passed (Application Approved). Values from {src}."
    out = []

    def add(area, scenario, pre, st, exp, req, prio="High", ttype="Functional", remarks="", tbc=False):
        out.append(dict(area=area, scenario=scenario, pre=pre, steps=st, expected=exp, req=req, prio=prio,
                        ttype=ttype, remarks=tc_ref(remarks), tbc=tbc))

    # ── Setup & Flow ─────────────────────────────────────────────────────
    if trading:
        add("Setup & Flow", f"Test data ready for {rid} — {r['btype']} (no eSim)",
            "Tab '1 Companies' of EAINT-12341_eSim_Setup.xlsx open.",
            steps(f"In tab '1 Companies', find the row for {rid}.",
                  "Type the TIN to use in the TIN cell (Q-20).",
                  "Save and close the Excel."),
            steps("The TIN cell of the row is filled.", "The Excel is saved and closed (the robot reads it)."),
            "Test data", ttype="Setup")
    else:
        add("Setup & Flow", f"eSim set up for {rid} — {r['btype']}, {r['people']}",
            f"A PASS company from the checker sheet (TIN starts with {r['tin']}) typed in tab '1 Companies'. VPN on.",
            steps("Log in to eSim: https://172.30.202.114:9089/esim/login.",
                  f"Open tab '{rid}' of EAINT-12341_eSim_Setup.xlsx.",
                  "Screen 'Ssm Enquiry Resp': type every value of Part A, then Save.",
                  "Submission screen: type every value of Part B (including the tags and the people), then Save.",
                  "Screenshot both saved records."),
            steps("Ssm Enquiry Resp saved with Response Code 004, the ROC without its letter, the 12-digit number, Delay 0.",
                  f"Submission record saved with Response Code 005, status ACTIVE/EXISTING and exactly {r['people'].split(',')[0].split(':')[0]}.",
                  "No error message on save."),
            "Test data (eSimulator guide)", ttype="Setup")
    stop = "Application Submitted" if r.get("negative") else "Application Approved"
    add("Setup & Flow", f"Robot runs {rid} to {stop}",
        f"{rid}-01 passed. VPN on. Settings file filled. Mailtrap open.",
        steps("In the automation folder run: npm run " + rid.lower() + ".",
              "Tick 'I'm not a robot' when the window asks.",
              "Pay in the payment window when the window asks.",
              "Do not click anything else; wait for the end of the run.",
              "Copy the black-window text and keep it with the evidence."),
        steps("The Pre-Application is created, paid and approved (Pre-Application No P……/….. printed).",
              f"The Application is submitted{' (the run stops here by design)' if r.get('negative') else ' and approved by the Approver (Application No NA…….. printed)'}.",
              f"The window shows 'READY FOR MANUAL EMAIL CHECK' — stopped at {stop}.",
              "An expected-email file is created in 04-runs/."),
        "REQ-001 (trigger)", ttype="E2E flow (automation)")
    if trading:
        add("Setup & Flow", "Pre-Application record shows the Business Trading details",
            f"{rid}-02 reached at least Pre-Application approved.",
            steps("BackOffice > Pre-Application listing: search the Pre-Application No.", "Open the record."),
            steps(f"Business type = {r['btype']}.", "The licence number the robot typed is shown.", "Company name = the run's company name."),
            "Regression (existing behaviour)", prio="Medium", ttype="Regression")
    else:
        add("Setup & Flow", "Pre-Application summary shows the SSM details set up in eSim",
            f"{rid}-02 reached at least Pre-Application approved.",
            steps("BackOffice > Pre-Application listing: search the Pre-Application No.",
                  "Check the SSM Status column.", "Open the record and its SSM details."),
            steps("SSM Status = OK.",
                  f"Registration no. = {r['brn'].split(',')[0]} exactly as in tab '1 Companies' (letter not doubled, e.g. no '-U-A').",
                  f"The people listed match the eSim setup ({r['people']}).",
                  "These are the values the Appointment Letter must use (old / new BRN)."),
            "REQ-007 (letter data source)", prio="High", ttype="Data")
    add("Negative & Regression", "Pre-Application approval does NOT send the new emails",
        f"{rid}-02 reached at least Pre-Application approved.",
        steps("Take the 'pre-app approved' and 'approved' (or 'submitted') times from the run log.",
              "In Mailtrap, list all emails to the run's admin and director email addresses between those two times."),
        steps("No 'RHB Online / Branch Account Opening' email in that window.",
              "No 'Approved eAuto Registration' email in that window.",
              "The existing Pre-Application approval email (with the Application link) still arrives as before."),
        "REQ-001", prio="Medium", ttype="Negative")

    if r.get("negative"):
        add("Negative & Regression", "No new email while the Application is at Submitted",
            f"{rid}-02 passed (Application Submitted).",
            steps("Note the 'submitted' time from the run log.", "Wait 10 minutes (quiet window, Q-16).",
                  "In Mailtrap, list emails to the run's admin and director addresses after that time."),
            steps("No 'RHB Online / Branch Account Opening' email.", "No 'Approved eAuto Registration' email."),
            "REQ-001", ttype="Negative")
        add("Negative & Regression", "No new email after Revert to UCD",
            f"{rid}-03 passed.",
            steps("BackOffice > Application listing: open the run's Application.",
                  "Revert it to UCD (role / button per Q-15). Note the time.",
                  "Wait 10 minutes.", "In Mailtrap, list emails to the run's addresses after the revert."),
            steps("The Application status changes to the reverted status as before.",
                  "No 'RHB Online / Branch Account Opening' email.", "No 'Approved eAuto Registration' email.",
                  "Any existing revert notification is unchanged."),
            "REQ-001", ttype="Negative")
        return out

    # ── Guideline email to the UCD (Email Template 1, combined) ──────────
    G = "Guideline Email (UCD)"
    add(G, "Guideline email is received by the UCD — To and CC", pre_appr,
        steps("In Mailtrap, search the admin email and the director email from the run log.",
              "Open the email whose subject starts 'RHB Online / Branch Account Opening'.",
              "Open its headers (To, CC) and note the received time."),
        steps("Exactly one such email for this Application.",
              "To = the UCD email recorded in the Application — record WHICH address it is (admin or director, Q-04).",
              "CC = apply@eauto.my.",
              "Received after the 'approved' time in the run log."),
        "REQ-001, REQ-002", remarks="Sender (From) not checked — still pending Operations (Q-12).")
    add(G, "Guideline email subject", pre_appr,
        steps("Open the guideline email.", "Read the subject exactly as shown."),
        steps("Subject = 'RHB Online / Branch Account Opening - <Application No> - <Company Name>'.",
              "<Application No> = the NA number in the run log; <Company Name> = the run's company name.",
              "Not the old v1.1 subjects 'RHB Online Account Opening - …' or 'RHB Branch Account Opening - …'."),
        "REQ-005")
    add(G, "Guideline email body — same combined template (online + branch options)", pre_appr,
        steps("Open the email body (HTML view).",
              "Compare paragraph by paragraph with sheet 'Expected Templates' → 'Email Template 1 — Body' (or the 04-runs file).",
              "Check the Text view too if Mailtrap shows one."),
        steps("Every paragraph present, in order, same wording.",
              "Application No and Company Name show the run's values.",
              "Contains 'within three (3) working days', 'Option 1 – Online Account Opening' (with the four (4) users note and seven (7) days) and 'Option 2 – Account Opening at RHB Branch'.",
              "Ends with the signature block (Thank you / Best regards / eAuto Sdn Bhd / address / Customer Service / WhatsApp) — Q-01.",
              "Does NOT contain 'As your company meets the eligibility requirements…' nor 'Please bring the documents provided by RHB…'."),
        "REQ-005",
        remarks=f"Same expected text for every business type — REQ-005 Example 1 and Example 2 both send Email Template 1. {r['note']}")
    link_steps = ["Hover over the link under 'Option 1 – Online Account Opening' and note the target.",
                  "Hover over the Application Link near the end."]
    link_exp = ["Option 1 link target = https://smecaonline.rhbgroup.com/sme/online?tag=campaign.",
                "The Application Link is a clickable URL, not the text '[Application Link]'."]
    if r.get("main"):
        link_steps += ["Click the RHB link.", "Open the Application Link in a fresh browser window."]
        link_exp += ["The RHB link opens the RHB SME online page.",
                     "The Application Link opens the page agreed in Q-03 for THIS Application (no error page)."]
    add(G, "Links in the guideline email", pre_appr, steps(*link_steps), steps(*link_exp), "REQ-005",
        prio="High" if r.get("main") else "Medium",
        remarks="Where the Application Link must land is not in the SRD (Q-03).")
    add(G, "Appointment Letter attached to the guideline email", pre_appr,
        steps("Open the Attachments tab of the guideline email.", "Note file name, type and size.", "Download and open it."),
        steps("Exactly one attachment: the Appointment Letter.", "It opens without error.",
              "It is for THIS Application (company name and Application No match).",
              "No Offer Letter, Direct Debit form or Board of Resolution attached."),
        "REQ-008", remarks="File type and name not specified (Q-08) — record them.")
    add(G, "Removed templates are not sent", pre_appr,
        steps("In Mailtrap, list every email to the run's addresses after the 'approved' time."),
        steps("No email with subject 'RHB Branch Account Opening - …' (old Email Template 2).",
              "No email with subject 'RHB Online Account Opening - …' without '/ Branch' (old Email Template 1)."),
        "REQ-003 / REQ-004 removed, REQ-005", prio="Medium", ttype="Negative")

    # ── RHB Support email (Email Template 3) ─────────────────────────────
    R = "RHB Support Email"
    add(R, "RHB Support email — To and CC", pre_appr,
        steps("In Mailtrap, search the run's admin / director email (it is in CC of this email).",
              "Open the email whose subject starts 'Approved eAuto Registration'.", "Open its headers."),
        steps("To = BIS.Support@rhbgroup.com.", "CC contains the UCD email recorded in the Application AND apply@eauto.my.",
              "Received after the 'approved' time.", "The email is in Mailtrap only — nothing reached RHB (Q-17)."),
        "REQ-006")
    add(R, "RHB Support email subject", pre_appr,
        steps("Open the RHB Support email.", "Read the subject."),
        steps("Subject = 'Approved eAuto Registration - <Company Name> - <BRN Number>'.",
              "<Company Name> = the run's company name.",
              "<BRN Number> = the number agreed in Q-05 (SRD example shows the 12-digit new number) — record which one."),
        "REQ-009", tbc=r["kind"] == "TRADING",
        remarks="Business Trading: what replaces the BRN is TBC (Q-05 / Q-09)." if r["kind"] == "TRADING" else "")
    add(R, "RHB Support email body — values and wording", pre_appr,
        steps("Open the body.", "Compare with sheet 'Expected Templates' → 'Email Template 3 — Body'.",
              "Compare each value line with the Application."),
        steps("Every paragraph present, in order, same wording (1 working day request, Reply All instruction, signature block).",
              "Company Name / Business Registration Number / UCD Contact Person / Contact Number / Email Address show the Application's values (which contact: Q-04).",
              "Does NOT contain 'The above company is not eligible for RHB's online account-opening process…'."),
        "REQ-009", remarks="The robot uses different name / mobile / email for Admin and Director, so this email shows which one the system takes (Q-04).")
    add(R, "Appointment Letter attached to the RHB Support email", pre_appr,
        steps("Open the Attachments tab.", "Download and open the attachment."),
        steps("Exactly one attachment: the Appointment Letter for THIS Application.", "It opens without error."),
        "REQ-008")

    # ── Appointment Letter ───────────────────────────────────────────────
    L = "Appointment Letter"
    add(L, "Appointment Letter layout and fixed text", pre_appr,
        steps("Open the letter from the guideline email.",
              "Compare with sheet 'Expected Templates' → 'Appointment Letter' and with Sample_Appointment_Letter_v2.0.",
              "Check header, body, signature and footer on every page."),
        steps("Title 'LETTER OF CONFIRMATION OF REGISTRATION AS A USED CAR DEALER (UCD) UNDER eAUTO SDN. BHD. PLATFORM' (spacing: Q-10).",
              "Letterhead: eAuto logo, 'eAuto Sdn Bhd 200401038456 (676967-T)', address, 'Tel: 03-2779 8893'.",
              "Clauses 1–8 numbered, wording as the template; Clause 6 refers to 'Clause 5'.",
              "Registration details table (UCD Name / Company Registration No. / UCD / Dealer Reference No.).",
              "Signature image, 'CHIA KET MING', 'COO'; footer 'Website: www.eauto.my | Customer Service: 03-2779 8899 | Email: support@eauto.my'.",
              "No layout break (cut text, overlap, blank page)."),
        "REQ-007", prio="High" if r.get("main") else "Medium")
    add(L, "Appointment Letter pre-filled values", pre_appr + f" SSM details from {rid}-03.",
        steps("Open the letter.", "Compare each value with its source (run log, Application, Pre-Application SSM details)."),
        steps("Date = Application approval date, DD/MM/YYYY.",
              "Our Ref = eAuto/OPS/UCD/<Application No>/<approval year> (square brackets: Q-07).",
              "UCD Company Name = the Application's company name (recipient block, Clause 1, Clause 4).",
              f"Company Registration No. = {r['brn']} — identical in recipient block, Clause 1 and Clause 4.",
              "Company Address = the Application's company address (which field: Q-06).",
              "UCD / Dealer Reference No. = '<Pre-Application No> / <Application No>'."),
        "REQ-007", tbc=r["kind"] == "TRADING",
        remarks="RED: registration number for Business Trading is TBC (Q-09)." if r["kind"] == "TRADING" else "")
    add(L, "Same Appointment Letter on both emails", pre_appr,
        steps("Download the attachment of the guideline email and of the RHB Support email.", "Compare them."),
        steps("Same file name and size.", "Same Our Ref, date, company, registration number and reference numbers."),
        "REQ-008", prio="Medium")

    # ── Negative & regression ────────────────────────────────────────────
    N = "Negative & Regression"
    add(N, "No unresolved placeholders anywhere", pre_appr,
        steps("In both emails, search the subject and body for '[' and ']'.", "In the letter, search for '[' and ']'."),
        steps("None of these appear literally: [Application No], [Company Name], [BRN Number], [Name], [Contact Number], [UCD Email Address], [RHB Online Registration Link], [Application Link], [DD/MM/YYYY], [YYYY], [UCD Company Name], [Old BRN], [New BRN], [Company Address], [Pre-Application No].",
              "No empty value (e.g. 'Company Name: ' with nothing after it)."),
        "REQ-005, REQ-007, REQ-009", ttype="Negative",
        remarks="Brackets kept around a filled value in the letter are Q-07, not a failure here.")
    add(N, "Exactly one of each email per approval (no duplicates)", pre_appr,
        steps("Wait 10 minutes after the 'approved' time (Q-16).", "In Mailtrap, count the emails for this Application by subject."),
        steps("Exactly 1 × 'RHB Online / Branch Account Opening - …'.", "Exactly 1 × 'Approved eAuto Registration - …'."),
        "REQ-001", prio="Medium", ttype="Negative")
    if r.get("main"):
        add(N, "Old approved-application email (3 RHB documents) is NOT sent", pre_appr,
            steps("In Mailtrap, list every email to the run's addresses after the 'approved' time.",
                  "Look for the old approved-application email (subject per Q-23)."),
            steps("The old email is not received.", "No eAuto email carries the Offer Letter, Direct Debit form or Board of Resolution."),
            "REQ-001", ttype="Regression / Negative")
        add(N, "Hardcopy resubmission still works after approval (EAINT-11763)",
            pre_appr + " Run AFTER all other CH1 checks (it sends more emails).",
            steps("BackOffice > Application: open the run's Application > Registration Document.",
                  "Set Hardcopy Doc status to 'Pending UCD - Incomplete Docs' and click Update.",
                  "Click 'Request Hardcopy Resubmission', select documents, enter remarks, confirm.",
                  "In Mailtrap, open the resubmission email."),
            steps("Application status shows Approved, as before the CR.", "The popup and its document checklist work as before.",
                  "The resubmission email goes to the UCD, CC apply@eauto.my, BCC the Assignee.",
                  "The Reverted Reason shows on the Registration Document page."),
            "REQ-001 (approval handling unchanged)", prio="Medium", ttype="Regression",
            remarks="'As before' reference: EAINT-11763 SRD / test sheet (Q-14).")
    return out


ALL = []
for r in RUNS:
    for n, c in enumerate(cases_for(r), start=1):
        c.update(run=r["id"], btype=r["btype"], tc=f"{r['id']}-{n:02d}", runinfo=r)
        ALL.append(c)

# ── workbook ─────────────────────────────────────────────────────────────
wb = Workbook()


def put(ws, ref, v, bold=False, bg=None, color=None, align=TOP, border=True, size=10, italic=False):
    x = ws[ref]
    x.value = v
    x.font = Font(name=FONT, size=size, bold=bold, color=color, italic=italic)
    x.alignment = align
    if bg:
        x.fill = fill(bg)
    if border:
        x.border = BOX
    return x


def widths(ws, ws_w):
    for i, w in enumerate(ws_w, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


# 1. Cover ----------------------------------------------------------------
cv = wb.active
cv.title = "Cover"
widths(cv, [26, 110])
put(cv, "A1", "EAINT-12341 — Test Cases (SRD v1.3)", bold=True, size=14, border=False)
info = [
    ("Ticket", "EAINT-12341 — [eAuto-BackEnd & UCD] Replace Approved Application Email with New Emails to UCD and RHB Support"),
    ("Link", "https://mfservices.atlassian.net/browse/EAINT-12341"),
    ("Baseline", d.SRD + " · Email Template V3.0 (29.09.2026) · Appointment Letter Template v2.0 (18.09.2026)"),
    ("Release", "S34.X-20261008 (08.10.2026)"),
    ("Environment", "Staging — https://staging.eauto.my (VPN). Emails checked in Mailtrap only."),
    ("QA", ", ".join(QA_NAMES)),
    ("Objective", "On Application approval, every UCD gets ONE combined RHB Account Registration Guideline email (online + branch options) "
                  "with the Appointment Letter attached, whatever its business type, number of directors or nationality; and RHB Support gets "
                  "the Appointment Letter email with the UCD and apply@eauto.my copied."),
    ("How the sheet is ordered", "Sheet 'Test Cases' is sorted by BUSINESS TYPE (colour band), then by RUN (CH1, CH2…), then by test area. "
                                 "Test case id = <run>-<number>, e.g. CH1-07. 'xx-07' in notes means test 07 of every run."),
    ("How to execute", "1) Do the run's '-01' (test data) and '-02' (robot run). 2) Check the emails and letter for its other test cases. "
                       "3) Fill Actual Result, Test Result (dropdown), Tested By, Test Date, Evidence, Defect ID, Remarks. "
                       "Progress updates by itself in sheet 'Test Progress'."),
]
for i, (k, v) in enumerate(info, start=3):
    put(cv, f"A{i}", k, bold=True, bg="D9D9D9")
    put(cv, f"B{i}", v)
row = 3 + len(info) + 1
put(cv, f"A{row}", "Legend — business type (band colour)", bold=True, border=False)
row += 1
for b, (band, tint) in BUSINESS.items():
    put(cv, f"A{row}", b, bold=True, bg=band, color="FFFFFF")
    put(cv, f"B{row}", ", ".join(r["id"] for r in RUNS if r["btype"] == b), bg=tint)
    row += 1
row += 1
put(cv, f"A{row}", "Legend — test area (column 'Test Area')", bold=True, border=False)
row += 1
for a, col in AREA.items():
    put(cv, f"A{row}", a, bg=col)
    put(cv, f"B{row}", {"Setup & Flow": "Test data in eSim / sheet, and the robot run up to approval.",
                        "Guideline Email (UCD)": "Email Template 1 (combined) to the UCD.",
                        "RHB Support Email": "Email Template 3 to BIS.Support@rhbgroup.com.",
                        "Appointment Letter": "The generated letter attached to both emails.",
                        "Negative & Regression": "Things that must NOT happen, and existing behaviour that must not change."}[a])
    row += 1
row += 1
put(cv, f"A{row}", "Legend — test result", bold=True, border=False)
row += 1
for res, (bg, fg) in RESULT_COLOURS.items():
    put(cv, f"A{row}", res, bold=True, bg=bg, color=fg)
    put(cv, f"B{row}", {"Pass": "Actual = expected.", "Fail": "Actual ≠ expected — raise a QA issue and put its id in Defect ID.",
                        "Blocked": "Cannot be executed (environment, data, open question).", "Not Run": "Not executed yet (default).",
                        "N/A": "Does not apply (explain in Remarks)."}[res])
    row += 1
put(cv, f"A{row}", "TC id in red", bold=True, bg=TBC_FILL)
put(cv, f"B{row}", "Expected result still pending confirmation — see the question in Remarks and sheet 'Open Questions'.")

# 2. Test Cases -----------------------------------------------------------
ws = wb.create_sheet("Test Cases")
COLS = ["No.", "TC ID", "Business Type", "Run", "Test Area", "Test Scenario", "Pre-condition / Test Data",
        "Test Steps", "Expected Result", "Requirement", "Priority", "Test Type", "Actual Result", "Test Result",
        "Tested By (QA)", "Test Date", "Evidence (screenshot / file)", "Defect ID", "Remarks"]
widths(ws, [6, 10, 18, 7, 16, 34, 34, 52, 60, 16, 9, 14, 36, 11, 16, 11, 22, 12, 40])
HR = 1
for j, h in enumerate(COLS, start=1):
    put(ws, f"{get_column_letter(j)}{HR}", h, bold=True, bg="404040", color="FFFFFF", align=MID)
ws.row_dimensions[HR].height = 32
ws.freeze_panes = "G2"

row = HR + 1
no = 0
current_b = current_r = None
case_rows = []
for c in ALL:
    band, tint = BUSINESS[c["btype"]]
    if c["btype"] != current_b:
        current_b = c["btype"]
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=len(COLS))
        n_runs = sum(1 for r in RUNS if r["btype"] == current_b)
        put(ws, f"A{row}", f"{current_b.upper()}   —   {n_runs} run(s)", bold=True, bg=band, color="FFFFFF", size=11)
        ws.row_dimensions[row].height = 22
        row += 1
    if c["run"] != current_r:
        current_r = c["run"]
        ri = c["runinfo"]
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=len(COLS))
        put(ws, f"A{row}", f"Run {ri['id']}  ·  {ri['people']}  ·  TIN starts with {ri['tin']}  ·  {ri['note']}",
            bold=True, bg=tint, size=10)
        ws.row_dimensions[row].height = 18
        row += 1
    no += 1
    vals = [no, c["tc"], c["btype"], c["run"], c["area"], c["scenario"], c["pre"], c["steps"], c["expected"],
            c["req"], c["prio"], c["ttype"], "", "Not Run", "", "", "", "", c["remarks"]]
    for j, v in enumerate(vals, start=1):
        ref = f"{get_column_letter(j)}{row}"
        if j == 2:
            put(ws, ref, v, bold=True, bg=TBC_FILL if c["tbc"] else None, align=MID)
        elif j == 5:
            put(ws, ref, v, bold=True, bg=AREA[c["area"]], align=MID)
        elif j in (1, 4, 11, 14, 16):
            put(ws, ref, v, align=MID)
        else:
            put(ws, ref, v)
    lines = max(c["steps"].count("\n"), c["expected"].count("\n")) + 1
    longest = max(len(c["expected"]), len(c["steps"]))
    ws.row_dimensions[row].height = min(409, max(48, 14 * (lines + longest // 70)))
    case_rows.append(row)
    row += 1
first, last = case_rows[0], case_rows[-1]
ws.auto_filter.ref = f"A{HR}:{get_column_letter(len(COLS))}{last}"

dv_res = DataValidation(type="list", formula1='"' + ",".join(RESULTS) + '"', allow_blank=True)
dv_qa = DataValidation(type="list", formula1='"' + ",".join(QA_NAMES) + '"', allow_blank=True)
dv_date = DataValidation(type="date", operator="greaterThan", formula1="DATE(2026,1,1)", allow_blank=True,
                         error="Enter a date, e.g. 03/10/2026", errorTitle="Test Date")
for dv in (dv_res, dv_qa, dv_date):
    ws.add_data_validation(dv)
dv_res.add(f"N{first}:N{last}")
dv_qa.add(f"O{first}:O{last}")
dv_date.add(f"P{first}:P{last}")
for r_ in range(first, last + 1):
    ws[f"P{r_}"].number_format = "DD/MM/YYYY"
for res, (bg, fg) in RESULT_COLOURS.items():
    ws.conditional_formatting.add(f"N{first}:N{last}", CellIsRule(operator="equal", formula=[f'"{res}"'],
                                  fill=fill(bg), font=Font(name=FONT, bold=True, color=fg)))
# Whole row lightly tinted red when it failed.
ws.conditional_formatting.add(f"F{first}:M{last}", FormulaRule(formula=[f'$N{first}="Fail"'], fill=fill("FFF2F2")))

# 3. Test Progress (formulas) ---------------------------------------------
pg = wb.create_sheet("Test Progress", 1)
widths(pg, [34, 9, 9, 9, 9, 9, 9, 12, 12])
put(pg, "A1", "Test Progress — updates by itself from sheet 'Test Cases' (column 'Test Result')", bold=True, size=12, border=False)
TCR = lambda col: f"'Test Cases'!${col}${first}:${col}${last}"
heads = ["", "Total", "Pass", "Fail", "Blocked", "Not Run", "N/A", "Executed %", "Pass %"]


def block(start, title, key_col, keys, colours=None):
    put(pg, f"A{start}", title, bold=True, bg="404040", color="FFFFFF")
    for j, h in enumerate(heads[1:], start=2):
        put(pg, f"{get_column_letter(j)}{start}", h, bold=True, bg="404040", color="FFFFFF", align=MID)
    r_ = start + 1
    for k in keys:
        put(pg, f"A{r_}", k, bold=True, bg=colours.get(k) if colours else None,
            color="FFFFFF" if colours and k in BUSINESS else None)
        put(pg, f"B{r_}", f'=COUNTIFS({TCR(key_col)},"{k}")', align=MID)
        for j, res in enumerate(RESULTS, start=3):
            put(pg, f"{get_column_letter(j)}{r_}", f'=COUNTIFS({TCR(key_col)},"{k}",{TCR("N")},"{res}")', align=MID,
                bg=RESULT_COLOURS[res][0])
        put(pg, f"H{r_}", f"=IF(B{r_}=0,0,(C{r_}+D{r_}+E{r_})/B{r_})", align=MID)
        put(pg, f"I{r_}", f"=IF((C{r_}+D{r_})=0,0,C{r_}/(C{r_}+D{r_}))", align=MID)
        pg[f"H{r_}"].number_format = pg[f"I{r_}"].number_format = "0%"
        r_ += 1
    put(pg, f"A{r_}", "TOTAL", bold=True, bg="D9D9D9")
    for j in range(2, 8):
        col = get_column_letter(j)
        put(pg, f"{col}{r_}", f"=SUM({col}{start + 1}:{col}{r_ - 1})", bold=True, bg="D9D9D9", align=MID)
    put(pg, f"H{r_}", f"=IF(B{r_}=0,0,(C{r_}+D{r_}+E{r_})/B{r_})", bold=True, bg="D9D9D9", align=MID)
    put(pg, f"I{r_}", f"=IF((C{r_}+D{r_})=0,0,C{r_}/(C{r_}+D{r_}))", bold=True, bg="D9D9D9", align=MID)
    pg[f"H{r_}"].number_format = pg[f"I{r_}"].number_format = "0%"
    pg.conditional_formatting.add(f"H{start + 1}:H{r_}", DataBarRule(start_type="num", start_value=0, end_type="num",
                                                                     end_value=1, color="5B9BD5"))
    pg.conditional_formatting.add(f"I{start + 1}:I{r_}", DataBarRule(start_type="num", start_value=0, end_type="num",
                                                                     end_value=1, color="70AD47"))
    return r_ + 2


nxt = block(3, "By business type", "C", list(BUSINESS), {k: v[0] for k, v in BUSINESS.items()})
nxt = block(nxt, "By run", "D", [r["id"] for r in RUNS])
nxt = block(nxt, "By test area", "E", list(AREA), AREA)
put(pg, f"A{nxt}", "Executed % = (Pass + Fail + Blocked) / Total.   Pass % = Pass / (Pass + Fail).", italic=True, border=False)
pg.freeze_panes = "A3"

# 4. Test Data & Runs -----------------------------------------------------
td = wb.create_sheet("Test Data & Runs")
widths(td, [7, 26, 30, 14, 50, 40, 22, 18, 16, 30])
put(td, "A1", "Runs = test data. Each run uses ONE real company (one company, one use). Companies go in EAINT-12341_eSim_Setup.xlsx, tab '1 Companies'.",
    bold=True, border=False)
for j, h in enumerate(["Run", "Business Type", "People", "TIN starts", "Purpose", "Registration no. format (letter)",
                       "Test cases", "Pre-Application No", "Application No", "Run date / result"], start=1):
    put(td, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF", align=MID)
for i, r in enumerate(RUNS, start=4):
    ids = [c["tc"] for c in ALL if c["run"] == r["id"]]
    band, tint = BUSINESS[r["btype"]]
    for j, v in enumerate([r["id"], r["btype"], r["people"], r["tin"], r["note"], r["brn"] or "—",
                           f"{ids[0]} … {ids[-1]} ({len(ids)})", "", "", ""], start=1):
        put(td, f"{get_column_letter(j)}{i}", v, bold=j == 1, bg=tint if j <= 2 else None)
put(td, f"A{4 + len(RUNS) + 1}", "Already used in v1.1 (never reuse): IP0581553-U, 003270488-X, 1267419-A.", border=False, italic=True)

# 5. Expected Templates ---------------------------------------------------
et = wb.create_sheet("Expected Templates")
widths(et, [38, 110])
put(et, "A1", "Expected content — verbatim from SRD v1.3 (§2.2.4.1, §2.2.5.1, §2.2.5.2)", bold=True, border=False)
rows = [
    ("Email Template 1 — Sender", "Pending confirmation from Operations (not checked)."),
    ("Email Template 1 — Recipient", "To: Approved UCD email address captured in the Application.\nCC: apply@eauto.my"),
    ("Email Template 1 — Subject", d.T1_SUBJECT + "\nE.g.: RHB Online / Branch Account Opening - NA50000802 - ABC Motors Sdn Bhd"),
    ("Email Template 1 — Body", d.T1_BODY),
    ("Email Template 1 — RHB link", d.RHB_LINK),
    ("Email Template 3 — Sender", "Pending confirmation from Operations (not checked)."),
    ("Email Template 3 — Recipient", "To: BIS.Support@rhbgroup.com\nCC: Approved UCD email address captured in the Application, apply@eauto.my"),
    ("Email Template 3 — Subject", d.T3_SUBJECT + "\nE.g.: Approved eAuto Registration - ABC Motors Sdn Bhd - 202401234567"),
    ("Email Template 3 — Body", d.T3_BODY),
] + [(f"Appointment Letter — {k}", v) for k, v in d.LETTER] + [(f"Letter field {k}", v) for k, v in d.LETTER_FIELDS]
for j, h in enumerate(["Element", "Expected"], start=1):
    put(et, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF")
for i, (k, v) in enumerate(rows, start=4):
    bg = AREA["Guideline Email (UCD)"] if k.startswith("Email Template 1") else AREA["RHB Support Email"] if k.startswith("Email Template 3") else AREA["Appointment Letter"]
    put(et, f"A{i}", k, bold=True, bg=bg)
    put(et, f"B{i}", v)
    et.row_dimensions[i].height = min(409, 13 * (v.count("\n") + len(v) // 120 + 1) + 6)

# 6. Traceability ---------------------------------------------------------
tr = wb.create_sheet("Traceability")
widths(tr, [22, 22, 22, 60, 14, 50])
put(tr, "A1", "Requirement → test cases (SRD v1.3)", bold=True, border=False)
for j, h in enumerate(["Requirement ID", "Item", "Status in v1.3", "Acceptance Criteria (summary)", "# test cases", "Test cases"], start=1):
    put(tr, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF", align=MID)
for i, (rid, item, status, ac) in enumerate(d.REQS, start=4):
    short = rid.replace("EAINT-12341-", "")
    ids = [c["tc"] for c in ALL if re.search(rf"\b{short}\b", c["req"])]
    removed = "REMOVED" in status
    for j, v in enumerate([rid, item, status, ac], start=1):
        put(tr, f"{get_column_letter(j)}{i}", v, bg="FFC7CE" if removed and j == 3 else None)
    put(tr, f"E{i}", f"=COUNTIF('Test Cases'!$J${first}:$J${last},\"*{short}*\")", align=MID)
    put(tr, f"F{i}", ", ".join(ids) if ids else "—")

# 7. Open Questions -------------------------------------------------------
oq = wb.create_sheet("Open Questions")
widths(oq, [7, 70, 42, 22, 18, 10, 40, 18])
put(oq, "A1", "Open questions — 'xx-NN' = test NN of every run", bold=True, border=False)
for j, h in enumerate(["#", "Question", "Impact / interim handling", "Blocks", "Ask", "Status", "Answer", "Answered by / date"], start=1):
    put(oq, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF", align=MID)
for i, q in enumerate(d.QUESTIONS, start=4):
    for j, v in enumerate([tc_ref(str(x)) for x in q] + ["", ""], start=1):
        put(oq, f"{get_column_letter(j)}{i}", v, bg="FFEB9C" if j == 6 and q[5] == "Open" else None)

# 8. Change log + retired -------------------------------------------------
ca = wb.create_sheet("Change Log v1.1-v1.3")
widths(ca, [12, 22, 70, 70])
put(ca, "A1", "SRD v1.1 → v1.2 → v1.3 and what it changed in testing", bold=True, border=False)
for j, h in enumerate(["SRD Version", "Requirement / Section", "Change", "Test impact"], start=1):
    put(ca, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF")
for i, row_ in enumerate(d.CHANGES, start=4):
    for j, v in enumerate(row_, start=1):
        put(ca, f"{get_column_letter(j)}{i}", tc_ref(v))
rt = wb.create_sheet("Retired (v1.1)")
widths(rt, [16, 40, 80])
put(rt, "A1", "Previous QA's v1.1 cases and where they went", bold=True, border=False)
for j, h in enumerate(["v1.1 TS No.", "v1.1 Scenario", "v1.3 Disposition"], start=1):
    put(rt, f"{get_column_letter(j)}3", h, bold=True, bg="404040", color="FFFFFF")
for i, row_ in enumerate(d.RETIRED, start=4):
    for j, v in enumerate(row_, start=1):
        put(rt, f"{get_column_letter(j)}{i}", tc_ref(v))

for sh in wb.worksheets:
    sh.sheet_view.zoomScale = 90
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print(f"wrote {OUT}: {len(ALL)} test cases, rows {first}-{last}")

# ── scenarios.yaml mirror ────────────────────────────────────────────────
doc = {
    "meta": {"ticket": "EAINT-12341", "source_srd": d.SRD, "workbook": "02-plan/EAINT-12341_Test_Cases_v1.3.xlsx",
             "generated_by": "02-plan/build_test_cases.py — do not hand-edit"},
    "runs": [{k: v for k, v in r.items()} for r in RUNS],
    "cases": [{k: c[k] for k in ("tc", "run", "btype", "area", "scenario", "pre", "steps", "expected", "req", "prio", "ttype", "remarks", "tbc")}
              for c in ALL],
    "requirements": [{"id": r[0], "item": r[1], "status": r[2]} for r in d.REQS],
    "open_questions": [{"id": q[0], "question": q[1], "blocks": tc_ref(q[3])} for q in d.QUESTIONS],
}
with open(YAML_OUT, "w", encoding="utf-8") as fh:
    fh.write("# EAINT-12341 — SRD v1.3 test cases. GENERATED by 02-plan/build_test_cases.py.\n")
    yaml.safe_dump(doc, fh, sort_keys=False, allow_unicode=True, width=120)
print("wrote", YAML_OUT)
