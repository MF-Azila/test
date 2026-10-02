# Prompts for Claude Code on the QA laptop (EAINT-12341)

Paste ONE prompt at a time into Claude Code on your laptop (the one with the
VPN and the Playwright browser). Wait until it finishes before the next one.

---

## Prompt 0 — Handover: paste this FIRST in a new LOCAL session on the laptop

```
You are taking over QA automation work for Jira ticket EAINT-12341 from a cloud Claude Code session. You run on MY
Windows laptop, which has the company VPN — the cloud session could not reach staging or eSim, you can.
I am a Senior QA but not technical: explain in plain language, step by step, and ask me before anything that creates
or changes data. Never guess business rules, test data or expected results — ask me.

WHAT THE TICKET IS
eAuto CR "Replace Approved Application Email with New Emails to UCD and RHB Support", baseline SRD v1.3 (29.09.2026),
release 08.10.2026. On Application approval in BackOffice, eAuto must send:
 1) ONE combined "RHB Account Registration Guideline" email to the UCD (subject "RHB Online / Branch Account Opening -
    <Application No> - <Company Name>", CC apply@eauto.my, Appointment Letter attached) — same for every business type;
 2) an "Approved eAuto Registration - <Company Name> - <BRN>" email to BIS.Support@rhbgroup.com, CC the UCD and
    apply@eauto.my, Appointment Letter attached.
Emails are checked BY HAND in Mailtrap. The robot only drives the flow up to approval.

WHERE EVERYTHING IS
GitHub repo https://github.com/MF-Azila/test, branch claude/tender-darwin-he17du, folder EAINT-12341/:
- HOW-TO-RUN.md ................ plain steps for the laptop
- PROMPTS-FOR-CLAUDE-CODE.md ... Prompt 1 (setup + checks), Prompt 2 (eSim setup for one run), Prompt 3 (run robot)
- automation/ .................. Playwright project (npm scripts: check, list, preflight, ch1 … ch8)
- automation/env/env-default ... settings template → copy to env/.staging.env-local (I type the passwords myself)
- cr/EAINT-12341/02-plan/EAINT-12341_Test_Cases_v1.3.xlsx ... 141 test cases sorted by business type
- cr/EAINT-12341/02-plan/EAINT-12341_eSim_Setup.xlsx ....... tab "1 Companies" = test data the robot reads;
                                                              tabs CH1… = what to type in eSim
- cr/EAINT-12341/03-spec/ ...... the robot (onboarding-chain.spec.ts, chain-scenarios.ts)
- cr/EAINT-12341/company-ledger.json ... companies already used — one company, one use, never reuse
- cr/EAINT-12341/STATUS.md and HANDOFF.md ... current status and history

RUNS (execution order = my priority)
CH1 Sdn Bhd/Bhd 4 directors (MAIN, first) · CH2 Sdn Bhd 3 directors incl. 1 foreigner · CH3 Sole Prop/Partnership 4 ·
CH4 Sole Prop/Partnership 5 · CH5 Sole Prop/Partnership stops at Submitted · CH6 LLP 4 partners + 1 compliance officer ·
CH7 Business Trading (Sabah) · CH8 Business Trading (Sarawak). CH7/CH8 need no eSim, only a TIN.

HOW A RUN WORKS
eSim is set up BY HAND (or by you with my "yes" before every Save) from the eSim sheet. Then "npm run chN" (headed
Chrome): it waits for me to tick reCAPTCHA and to pay, logs in BackOffice as kmcheah (approver) and eautosoyeng
(assignee), and stops at Application Approved, printing "READY FOR MANUAL EMAIL CHECK" and writing
cr/EAINT-12341/04-runs/12341_CHn_<run>.md with the expected emails/letter.

STATUS NOW
- Code type-checks and lists 8 runs; it has NEVER run against staging yet (staging/eSim unreachable from the cloud).
- Login, eSim and the full flow are unproven — expect fixes on the first run.
- I am STILL UPDATING my test data. Do NOT fill tab "1 Companies", do NOT touch eSim, do NOT run npm run ch1…ch8
  until I give you the data and say so.
- Used companies (never reuse): IP0581553-U, 003270488-X, 1267419-A.
- Open questions for the BA are in the workbook, sheet "Open Questions" (e.g. which contact is the "UCD email",
  which BRN in the RHB email subject, letter address, brackets in the letter, foreign director ID Type in eSim).

RULES
- Never print, paste or commit passwords; never commit env/.staging.env-local.
- Before any change to eSim or staging, show me exactly what will change and wait for "yes".
- If a run fails, do NOT re-run it (the company is spent). Classify the failure (application defect / automation /
  test data / environment) with evidence and tell me.
- Do not rewrite unrelated code. Explain any code change before making it, then commit to the same branch only when I ask.

FIRST THING TO DO NOW
1. Get the project: git clone https://github.com/MF-Azila/test.git C:\QA\eaint-12341 then
   git checkout claude/tender-darwin-he17du (if the folder exists: git pull, keep my local files).
2. Read EAINT-12341/cr/EAINT-12341/STATUS.md and HANDOFF.md and summarise them back to me in 5 lines.
3. Then follow Prompt 1 in EAINT-12341/PROMPTS-FOR-CLAUDE-CODE.md (setup + "npm run preflight"), and stop.
```

---

## Prompt 1 — Set up the robot and check everything (no data is created)

```
You are helping me (a QA, not technical) set up the EAINT-12341 Playwright robot on this Windows laptop.
Work step by step, explain each step in plain language, and stop and ask me whenever something fails or needs a decision.
Do not change any code. If something looks wrong in the code, tell me and show me the error instead.

1. Check the tools: Node.js 20 or newer (node -v), Git (git --version), and whether Google Chrome is installed.
   - If Node.js is missing, tell me to install the LTS version from https://nodejs.org and wait for me.
   - If Chrome is missing but Microsoft Edge is installed, we will use Edge (step 4).
2. Get the project into C:\QA\eaint-12341:
     git clone https://github.com/MF-Azila/test.git C:\QA\eaint-12341
     cd C:\QA\eaint-12341
     git checkout claude/tender-darwin-he17du
   - If the clone asks for a login or fails, stop and tell me (I will download the ZIP instead).
   - If C:\QA\eaint-12341 already exists, do NOT delete it. Run "git pull" instead, and never overwrite my files
     EAINT-12341\automation\env\.staging.env-local, EAINT-12341\cr\EAINT-12341\02-plan\EAINT-12341_eSim_Setup.xlsx
     and EAINT-12341\cr\EAINT-12341\company-ledger.json.
3. In C:\QA\eaint-12341\EAINT-12341\automation run: npm install
4. Settings file: if env\.staging.env-local does not exist, copy env\env-default to env\.staging.env-local.
   Then open it for me with: notepad env\.staging.env-local
   and ask me to type, myself, BO_PASSWORD, BO_ADMIN_PASSWORD, ESIM_PASSWORD, QA_TESTER (my name) and QA_EMAIL_PREFIX.
   NEVER ask me to paste a password into this chat, never print that file, never commit it to git.
   If Chrome is missing, add the line BROWSER_CHANNEL=msedge to that file.
5. Run "npm run check" (must show no errors) and "npm run list" (must list 8 runs, in this order: CH1 to CH8).
6. Ask me to connect the VPN. Then run "npm run preflight". It only opens pages and signs in — it creates no data.
   Show me the whole PREFLIGHT RESULT block.
7. Only if a BackOffice login failed in preflight: open https://staging.eauto.my/uat4/public/login/ in the Playwright
   browser WITHOUT typing anything, and list the login form's inputs and buttons (id, name, type, label). Then let me log
   in by hand and tell me which page appears after login and whether it has menu items with class "obs-auth-required".
   Do not submit anything yourself.
8. Finish with a short summary I can send to my QA support: Node version, browser used, check/list result,
   the full PREFLIGHT RESULT block, and any error text.

Do NOT run "npm run ch1" … "npm run ch8" — each one uses up a real company.
Do NOT change anything in eSim or staging.
```

---

## Prompt 2 — Set up eSim for ONE run (change CH1 to the run you need)

Before this: tab "1 Companies" of the eSim setup Excel is filled for the run, saved and closed.

```
Help me set up eSim for run CH1 of EAINT-12341, using the Playwright browser so I can watch.

Source of truth: C:\QA\eaint-12341\EAINT-12341\cr\EAINT-12341\02-plan\EAINT-12341_eSim_Setup.xlsx
- Read tab "1 Companies" (the row for CH1) and tab "CH1".
  If the yellow cells of the CH1 row are empty, ask me for the company numbers (ROC/ROB/LLP no. with letter, 12-digit
  new no., TIN, checker row), type them into that row for me, save the Excel and close it.
- The green cells are formulas. Work their values out from tab 1: "Roc" = the number WITHOUT the last "-<letter>",
  "Check Digit" = that letter, and the REF_NO / BUSINESS_REF_NO tags use the number WITH the letter.
  An LLP number ending in "-LGN" is never split.
- How the eSim screens work: C:\QA\eaint-12341\EAINT-12341\cr\EAINT-12341\00-input\eAuto_eSimulator_Guides.xlsx

Rules:
1. VPN must be on. Open https://172.30.202.114:9089/esim/login. I will log in myself — wait until I say "done".
2. First SEARCH "Ssm Enquiry Resp" and the submission screen named in tab CH1 for this company's Roc and New Roc.
   - If a record for this company exists, edit that record.
   - If none exists, ask me which record I am allowed to edit, or whether to create a new one.
     Never overwrite another tester's record without my OK.
3. Before EVERY Save, show me a table of every field you will change (old value → new value) and wait for my "yes".
4. In the big text boxes change ONLY what tab CH1 lists: the REF_NO / BUSINESS_REF_NO tag, NEW_REF_NO, the status tag,
   and the people. For the people: keep one existing person block as the pattern, make exactly the number of blocks the
   tab lists, set the name and IC in each, and remove any extra blocks. Leave everything else exactly as it was.
   Use only a pattern block whose ID Type is "01 – NRIC" with a 12-digit ID No. (never one like "RA0009999").
   LLP (CH6): partners are "PT – Partner" with Entity No. = the LLP number, plus exactly 1 "CO – Compliance Officer"
   block = Partner A's details with Entity No. blank — as tab CH6 says.
   Foreign director (CH2): STOP before typing it and show me which ID Type options eSim offers; I will choose.
5. After saving, open both records again and check the saved values. Save screenshots to
   C:\QA\eaint-12341\EAINT-12341\cr\EAINT-12341\05-evidence\CH1\
6. Tell me the ids of the records you changed, and give me a short summary I can send to QA support.
Do NOT run the robot.
```

---

## Prompt 3 — Run the robot for ONE run (change ch1 / CH1 to the run you need)

Before this: Prompt 2 done for the same run (Business Trading CH7 / CH8: only the TIN in tab 1).
Order of runs: CH1 (Sdn Bhd, main) → CH2 → CH3 → CH4 → CH5 → CH6 (LLP) → CH7 (BT Sabah) → CH8 (BT Sarawak).

```
Run the EAINT-12341 robot for run CH1 on this laptop and keep me informed.
1. Make sure the VPN is on (ask me), and that the eSim setup Excel is closed.
2. In C:\QA\eaint-12341\EAINT-12341\automation run "npm run ch1" in the background (it can take up to 40 minutes)
   and keep reading its output.
3. When the output says "reCAPTCHA", tell me to tick "I'm not a robot" in the browser.
   When it says "PAYMENT", tell me to pay in the payment window.
   When it says "Please sign in BY HAND", tell me which account to log in with.
   Never click anything in the browser yourself.
4. When it ends, show me either the whole "READY FOR MANUAL EMAIL CHECK" block, or the error with the 30 lines before it.
5. List the new files in ..\cr\EAINT-12341\04-runs and the newest folder in test-results (screenshots, trace).
6. Run "git status" and tell me which files changed (company-ledger.json should have changed). Do not commit unless I ask.
Do NOT run the robot a second time if it fails — the company is used up. Tell me, and wait.
```
