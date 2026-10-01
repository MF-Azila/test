# EAINT-12341 — status

One page. If this is out of date, nothing else in the folder can be trusted.

| | |
|---|---|
| Ticket | EAINT-12341 |
| Title | [eAuto-BackEnd & UCD] Replace Approved Application Email with New Emails to UCD and RHB Support |
| Environment | staging (to confirm; every case is an e2e chain that approves records) |
| Stage | chain spec written, 3 attempts on staging, **no scenario reached Approved yet** |
| Updated | 2026-10-01 |

## Where it is

- [x] `00-input/`: `EAINT-12341_Test_Case.xlsx` (md5 25784f53…) + `SRD_EAINT-12341_v1.1_20260917 (1).pdf` (md5 6de4184f…), taken from `cr/_inbox/`
- [ ] `01-intake/scenarios.yaml`: written, 21 cases; column mapping **not yet confirmed by a human**
- [ ] `02-plan/assertions.yaml`: not started; waits on Q1
- [x] `03-spec/`: chain spec, takes a scenario to Approved (no email checks; emails are checked by hand)
- [ ] `04-runs/`: none
- [ ] `05-evidence/`: none

Not taken, still in `~/Downloads`: `SRD_…v1.0_20260915.pdf` and `EAINT-12341_Test_Case_1.xlsx`. These are the older v1.0 revision. **Their case ids are numbered differently**: old E2E5 ≠ current E2E5. Don't mix the two sheets.

## Chain runs (2026-09-24, Azfar's instruction)

**Picking this up on another machine? Read `HANDOFF.md` in this folder first.**

Azfar checks the emails **by hand in Mailtrap**. Automation only takes each
scenario to the state the checks start from: seed → Pre-Application → pay →
BO approve → Application → submit → assignee → approver approve (R2 stops at
Submitted).

- Spec: `03-spec/onboarding-chain.spec.ts`, one scenario per run via `CHAIN_SCENARIO`.
- Scenario → people → company: `03-spec/chain-scenarios.ts`.
- Real companies from `company-details-checker_2026-09-23 (1).xlsx`, PASS rows
  only. **One company, one use**, enforced by `company-ledger.json`.
- **18 chains**: E2E1–9, E2E13–17, R1–R4. Not run: E2E10, E2E11 (only one usable
  LLP on the sheet — Azfar: run 1 LLP for now), E2E12 (expected template TBC).
- Revert to UCD (R2) and the hardcopy steps (R4) are manual.

### Companies already used (do not reuse)

From `company-ledger.json`. All three runs failed before Approved, but each
company still counts as used.

| Scenario | ROC / ROB | Sheet row | Date | Where it stopped |
|---|---|---|---|---|
| E2E1 | IP0581553-U | 11 | 2026-09-24 | Application: director MyKad field was read-only and could not be filled (Pre-Application P260924/00874) |
| E2E2 | 003270488-X | 17 | 2026-09-24 | Pre-Application: LHDN rejected the TIN D29786564010 |
| E2E6 | 1267419-A | 22 | 2026-09-25 | Pre-Application: Next button stayed disabled |

E2E1, E2E2 and E2E6 need a new company from the sheet before they are run again.

Before the first run:
- [ ] `automation/env/.staging.env-local` filled (BO approver + assignee, eSim, Fiuu, URLs)
- [ ] `KEY_FORMAT` set in the spec, from `npx tsx scripts/seed-ssm.ts --inspect`
- [ ] Q7: seed a compliance officer for E2E9? Currently not seeded.
- [ ] Q12: 13 ROB cases, only 8 Partnership (`D`) TINs — 5 use sole-proprietor (`IG`) TINs with 4–5 owners. Does the system care?

## Cases

Priority is not in the workbook and is left blank rather than defaulted.

| Case | Situation | Expected template | Spec | Blocked by | Last run | Result |
|---|---|---|---|---|---|---|
| 12341_E2E1 | ROB, 4, all MY | T1 Online | — | Q1 | — | — |
| 12341_E2E2 | ROB, 5, all MY | T2 Branch | — | Q1 | — | — |
| 12341_E2E3 | ROB, 3, 1 foreign | T2 Branch | — | Q1, Q2 | — | — |
| 12341_E2E4 | ROB, 5, 1 foreign | T2 Branch | — | Q1, Q2 | — | — |
| 12341_E2E5 | ROC, 4 dir + 1 sec | T1 Online | — | Q1, Q2 | — | — |
| 12341_E2E6 | ROC, 5 dir | T2 Branch | — | Q1 | — | — |
| 12341_E2E7 | ROC, 3, 1 foreign | T2 Branch | — | Q1, Q2 | — | — |
| 12341_E2E8 | ROC, 2 dir + 3 sh | T1 Online | — | Q1, Q2 | — | — |
| 12341_E2E9 | LLP, 4 PT | T1 Online | — | Q1, Q2 | — | — |
| 12341_E2E10 | LLP, 5 PT | T2 Branch | — | Q1 | — | — |
| 12341_E2E11 | LLP, 3, 1 foreign | T2 Branch | — | Q1, Q2 | — | — |
| 12341_E2E12 | Non-SSM trading | **TBC (red)** | — | Q1, Q3 | — | — |
| 12341_E2E13 | T3 To/CC | T3 | — | Q1 | — | — |
| 12341_E2E14 | T3 attachment | T3 | — | Q1, Q4 | — | — |
| 12341_E2E15 | T3 subject/body | T3 | — | Q1 | — | — |
| 12341_E2E16 | both emails, one approval | T1 + T3 | — | Q1 | — | — |
| 12341_E2E17 | T3 for an online-eligible company | T3 | — | Q1 | — | — |
| 12341_R1 | old email suppressed | — | — | Q1 | — | — |
| 12341_R2 | no email at Submitted / Revert | — | — | Q1 | — | — |
| 12341_R3 | no unresolved placeholders | T1/T2/T3 | — | Q1 | — | — |
| 12341_R4 | hardcopy resubmission (EAINT-11763) | — | — | Q1, Q6 | — | — |

No existing spec covers any of these. The chain's page objects already exist and will be reused. See `reusable:` in `scenarios.yaml`.

## Open questions blocking automation

| # | Question | Who can answer | Blocks |
|---|---|---|---|
| Q1 | Is the column mapping right? In particular, **E ("Expected Template") belongs to the expected result** even though it sits under the merged "Test Scenarios" header. | you | all 21 |
| Q2 | What is the source of workbook rows 7–8: IC-derived nationality, DESIGNATION=DIRECTOR only, shareholders excluded, involveType=PT only? SRD v1.1 does not state them, and the v1.0 sheet had these cases BLOCKED on BA questions 1–5. | BA / whoever answered Q1–5 | E2E3, 4, 5, 7, 8, 9, 11 |
| Q3 | Which template does a non-SSM (Business Trading) company get? | BA | E2E12 |
| Q4 | Which fields must the Appointment Letter show? REQ-007 is still pending Operations. | BA / Operations | E2E14 |
| Q6 | Where do the "as before" expectations for the EAINT-11763 hardcopy flow come from? Add that ticket's SRD or test sheet to `00-input/`. | you / BA | R4 |

Non-blocking (full text in `scenarios.yaml`):
- **Q5** — Is there a written trail for "Appointment Letter on all 3 emails"? REQ-008 says RHB Support only.
- **Q7** — Should E2E9 seed a Compliance Officer so the exclusion is actually tested?
- **Q8** — Is a subject-level check wanted on the old email in R1?
- **Q9** — Which BO role and control performs revert to UCD (R2)?
- **Q10** — What quiet window should absence checks use (R1, R2, E2E16)?
- **Q11** — May tests GET the external RHB link (R3)?

## Execution blockers (not document questions)

- **`MAILTRAP_TOKEN` and `MAILTRAP_ACCOUNT_ID` are empty** in `automation/env/.staging.env-local` (`MAILTRAP_INBOX_ID` is set). `mailtrap.ts` throws without them, so no case can run.
- Every case uses up its own chain: one Pre-Application, one payment, and a one-shot approval. The reCAPTCHA tick needs a human once per browser session.
- `email-contracts.ts` `ONBOARDING_CONTRACTS` is empty. It gets filled from the SRD templates once the plan is signed.

## Coverage gaps noticed (not added; see `excluded:` in scenarios.yaml)

No case checks that Pre-Application approval fires no new email. No case covers ROB PREVIOUS_OWNER exclusion. Cases dropped from the v1.0 sheet without a recorded answer: resigned LLP partner, one person as both PT and CO, missing or malformed UCD email, the 90-day Application Link expiry, and the checklist wording question.

## Defects raised from this CR

| Ticket | Case | What |
|---|---|---|
| — | — | none. SRD v1.2 fixes to raise: REQ-005 cites §2.2.4.2 for Template 1; REQ-008 scope vs "attached to all 3 emails" |
