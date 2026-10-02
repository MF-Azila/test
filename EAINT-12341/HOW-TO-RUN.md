# EAINT-12341 robot — how to run it (Windows, step by step)

You do Part 1 **once**. Then Part 2 → 4 **for every run** (CH1, CH2, …).

---

## Part 1 — Set up your laptop (once)

**1. Install Node.js**
- Go to <https://nodejs.org> → download the **LTS** version → install with all the default options.
- Google Chrome must be installed too (it usually is).

**2. Download the robot**
- Open <https://github.com/MF-Azila/test/tree/claude/tender-darwin-he17du>
- Click the green **Code** button → **Download ZIP**.
- Unzip it to a simple place, e.g. `C:\QA\`. You will have a folder `C:\QA\test-claude-tender-darwin-he17du\EAINT-12341\`.

**3. Open PowerShell in the robot folder**
- In File Explorer open `…\EAINT-12341\automation`.
- Click the address bar, type `powershell`, press **Enter**. A blue/black window opens. All commands below are typed in this window, then **Enter**.

**4. Install the robot's parts**
```
npm install
```
Wait until it finishes (1–2 minutes).

**5. Create your settings file**
```
Copy-Item env\env-default env\.staging.env-local
notepad env\.staging.env-local
```
Notepad opens. Fill in after the `=` (no spaces, no quotes):
- `BO_PASSWORD=` password of **kmcheah** (Approver)
- `BO_ADMIN_PASSWORD=` password of **eautosoyeng** (Assignee)
- `QA_TESTER=` the name to type in the forms, e.g. `AZILA QA`
- `QA_EMAIL_PREFIX=` e.g. `azila.qa`

Save (Ctrl+S) and close Notepad. This file stays on your laptop only.

**6. Check the robot is OK**
```
npm run check
npm run list
```
- `check` must finish with **no red errors**.
- `list` must show **8 lines** (CH1 … CH8).

If anything is red, take a screenshot and send it to QA support.

---

## Part 2 — Prepare one run (e.g. CH1)

**7. Fill in the company** — only the first time, or when a run failed
- Open `…\EAINT-12341\cr\EAINT-12341\02-plan\EAINT-12341_eSim_Setup.xlsx`
- Tab **1 Companies** → fill the **yellow** cells for the run: ROC/ROB number **with the letter** (e.g. `639691-H`), new 12-digit number, TIN, checker row.
- Only **PASS** rows. Never use `IP0581553-U`, `003270488-X`, `1267419-A`.
- **Save** the Excel and **close it** (the robot reads it — it must be closed).

**8. Set up eSim** (VPN on)
- Log in to <https://172.30.202.114:9089/esim/login>
- Open the run's tab in the same Excel (e.g. **CH1**) and type exactly what it says, top to bottom (Part A, then Part B). Save each screen.

---

## Part 3 — Run the robot

**9. VPN on.** Then in PowerShell (in the `automation` folder):
```
npm run ch1
```
(then `npm run ch2` … `npm run ch8` — see the list below)

Run them **in this order** (priority: Sdn Bhd → Sole Prop / Partnership → LLP → Business Trading Sabah → Sarawak):

| Run | Business type | eSim needed? |
|---|---|---|
| ch1 | **Sdn Bhd / Bhd — 4 directors (MAIN — run first)** | yes |
| ch2 | Sdn Bhd / Bhd — 3 directors, 1 foreign | yes |
| ch3 | Sole Proprietorship / Partnership — 4 owners | yes |
| ch4 | Sole Proprietorship / Partnership — 5 owners | yes |
| ch5 | Sole Proprietorship / Partnership — stops at Submitted | yes |
| ch6 | LLP — 4 partners | yes |
| ch7 | Business Trading (Sabah) | no — TIN only in tab 1 |
| ch8 | Business Trading (Sarawak) | no — TIN only in tab 1 |

**10. Watch the browser and do 3 things when asked** — the black window tells you:

| When the window says | You do |
|---|---|
| `reCAPTCHA — please tick "I'm not a robot"` | Tick the box in the browser. Do nothing else. |
| `PAYMENT — please complete the payment` | Pay in the payment window (bank sandbox). |
| `Please sign in BY HAND as …` (only if the robot cannot log in) | Log in with that account in the browser. |

Otherwise **don't click anything** — let the robot work. A run takes about 15–30 minutes.

**11. When it ends**
- ✅ Success: the window shows **`READY FOR MANUAL EMAIL CHECK`** with the Application No and the emails to search.
- ❌ Stopped: the window shows an error in red.

Either way: **copy all the text in the window** (or screenshot it) and send it to QA support, together with any screenshot of the browser.

---

## Part 4 — Check the emails

**12.** Open the file the robot made: `…\EAINT-12341\cr\EAINT-12341\04-runs\12341_CH1_….md` (open with Notepad). It shows exactly what each email and the letter must say.

**13.** Open **Mailtrap**, search for the emails shown in the file, and compare. Screenshot each email and the attached Appointment Letter.

**14.** Send the screenshots to QA support → we mark the test scenarios pass/fail in the workbook.

---

## Special cases

- **CH5** stops at *Submitted* by design. Check Mailtrap (no new email), then in BackOffice do **Revert to UCD** yourself, wait 10 minutes, check Mailtrap again.
- **CH7 (Sabah) and CH8 (Sarawak) — Business Trading** need no eSim. Fill only the **TIN** cell of their row in tab 1.
- **A run failed?** That company is used up. Copy a **Spare** row's numbers into that run's row in tab 1, set up eSim again, run again.

## Keep these 3 files safe
If you download a new version of the robot later, copy these three files into the new folder:
- `automation\env\.staging.env-local` (your passwords)
- `cr\EAINT-12341\02-plan\EAINT-12341_eSim_Setup.xlsx` (your companies)
- and `cr\EAINT-12341\company-ledger.json` (the list of used companies)
