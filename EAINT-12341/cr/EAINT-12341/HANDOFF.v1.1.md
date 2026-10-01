# EAINT-12341 — handoff to the other laptop

Read this first. It says what was done on 2026-09-24 (on the laptop without the
VPN), what Azfar wants, and exactly what to do next. `STATUS.md` has the
per-case table and the open questions.

---

## What Azfar wants

> Run the automation for the Pre-Application and the Application **until
> Approved**, following each scenario's business type, number of directors /
> business owners, and their nationality. **I will do the email checking
> manually.**

So the automation does NOT assert on email. It takes each scenario to the
state the email checks start from, then prints what Azfar needs to find the
emails in Mailtrap.

Rules Azfar gave, all binding:

1. **Real companies.** Pre-Application and Application must use a real
   ROC/ROB/LLP number with its matching TIN, then that exact number is seeded
   into eSim's SSM simulator.
2. **Source of companies:** `company-details-checker_2026-09-23 (1).xlsx`.
   **Overall = PASS** (ROC, new ROC and TIN all ABSENT) = usable. FAIL = already
   used. Confirmed by Azfar.
3. **One company, one use.** Never reuse one, even after a failed run.
4. **Only 1 LLP for now.** The sheet has one usable LLP, so E2E10 and E2E11 are
   not run.
5. Don't assume what the SRD does not say — ask (see HANDOFF.md at the repo
   root).

Business type is read from the TIN prefix: `IG` sole proprietor (ROB), `D`
partnership (ROB), `C` company (ROC), `PT` LLP.

---

## What was done (commit on branch `12341`)

| What | Where |
|---|---|
| SRD v1.1 + test case workbook, and the earlier intake (21 cases, Q1–Q11) — taken from the `agents` branch | `cr/EAINT-12341/00-input/`, `01-intake/`, `STATUS.md` |
| `cr` Playwright project (specs under `cr/<TICKET>/03-spec/`) — from `agents` | `automation/playwright.config.ts` |
| `cr/tsconfig.json` so CR specs resolve automation's `@fixtures`, `@pages`, … aliases | `cr/tsconfig.json` |
| Seeding moved into a shared function. Takes **real** keys; **updates** an existing eSim row instead of duplicating; rewrites the donor's ROC/name inside cloned profile columns | `automation/src/data/ssm-seed.ts` |
| Seeder CLI: `--roc --new-roc --check-digit --company`, plus `--inspect` (read-only) | `automation/scripts/seed-ssm.ts` |
| Scenario → people → company table (18 scenarios, every company distinct, checked at load) | `03-spec/chain-scenarios.ts` |
| One-use ledger: a company is recorded **before** eSim is touched; a used one is refused | `03-spec/company-ledger.ts` → writes `company-ledger.json` |
| The chain spec, one scenario per run | `03-spec/onboarding-chain.spec.ts` |

Verified here: `tsc` clean for `automation/` and `cr/`; `playwright --list`
shows 18 tests; a bare `--project=cr` run skips all 18 and writes nothing.

**Nothing has run against staging. Nothing was written to eSim. No company has
been spent.** `company-ledger.json` does not exist yet.

### The 18 chains

| Scenario | Type | People seeded | Stops at | Company (sheet row) |
|---|---|---|---|---|
| E2E1 | ROB | 4 MY | Approved | IP0581553-U (11) |
| E2E2 | ROB | 5 MY | Approved | 003270488-X (17) |
| E2E3 | ROB | 3, 1 foreign | Approved | KT0504288-U (26) |
| E2E4 | ROB | 5, 1 foreign | Approved | 003648908-W (43) |
| E2E5 | ROC | 4 dir + 1 secretary | Approved | 639691-H (21) |
| E2E6 | ROC | 5 dir | Approved | 1267419-A (22) |
| E2E7 | ROC | 3, 1 foreign | Approved | 1518238-K (34) |
| E2E8 | ROC | 2 dir + 3 shareholders | Approved | 1577499-V (45) |
| E2E9 | LLP | 4 PT | Approved | LLP0035174-LGN (37) |
| E2E13–15 | ROB | 5 MY | Approved | NS0310614-A, AS0435676-W, RA0117183-M |
| E2E16–17 | ROB | 4 MY | Approved | 003615282-V, KT0350066-U |
| R1 | ROB | 4 MY | Approved | 003682737-U |
| R2 | ROB | 4 MY | **Submitted** | 003562390-V |
| R3 | ROB | 5 MY | Approved | JR0120115-A |
| R4 | ROB | 4 MY | Approved | 003654090-H |

Not run: E2E10, E2E11 (no usable LLP left), E2E12 (Business Trading —
expected template TBC). Manual: revert to UCD in R2, the hardcopy steps in R4.

---

## Next steps on the other laptop (has the VPN and the env)

1. `git fetch && git checkout 12341`
2. `cd automation && npm ci`. If Playwright asks, `npx playwright install ffmpeg`.
3. Check `automation/env/.staging.env-local` has everything the chain uses:
   `BASE_URL`, `BASE_PATH`, `ESIM_*`, `BO_URL`, `BO_USERNAME/PASSWORD`
   (approver), **`BO_ADMIN_USERNAME/PASSWORD` (assignee, a different account)**,
   `FIUU_*`.
4. **Settle `KEY_FORMAT` — the spec refuses to run until this is done.**
   ```
   npx tsx scripts/seed-ssm.ts --inspect
   ```
   Read-only. It prints how existing eSim enquiry rows store a real ROC: is
   `639691-H` kept whole in `roc`, or split into `roc=639691` + `checkDigit=H`?
   Set `KEY_FORMAT` in `03-spec/onboarding-chain.spec.ts` to `"whole"` or
   `"split"` from what it shows. Also check what the Pre-Application's Old BRN
   field accepts — the spec types the sheet value (`639691-H`) as is.
5. Run **E2E1 alone first**. Headed; tick the reCAPTCHA once when asked.
   ```powershell
   $env:HEADED=1; $env:CHAIN_SCENARIO="12341_E2E1"; npx playwright test --project=cr
   ```
6. **Commit `company-ledger.json` after every run**, so the "used" record
   travels with the branch.
7. Watch the first run's assignee and approver steps (`submitForApproval`,
   `approveApplication` in `backoffice.page.ts`). They exist but the explore
   spec never called them, so E2E1 is also their first real test.
8. Then run the rest one at a time and give Azfar each run's
   `READY FOR MANUAL EMAIL CHECK` block.

## Still open (ask Azfar)

- **Q7** — E2E9: seed a compliance officer too, so the CO exclusion is
  exercised? The sheet says 4 partners only; none is seeded now.
- **Q12** — 13 ROB cases but only 8 partnership (`D`) TINs, so 5 use
  sole-proprietor (`IG`) TINs with 4–5 owners. Will the system care?
- **Foreign directors and upload rows.** The chain reports director upload
  rows against the seeded count but does not fail on a mismatch: whether a
  foreign director gets a row is not known.
- The intake's Q1 (column mapping) is still unconfirmed. It only matters for
  the assertion plan, not for these chain runs.

## If the run fails part way

The ledger marks the company `failed` with the stage, and it stays spent. Take
the next unused PASS row of the same TIN prefix from the checker sheet, put it
in `chain-scenarios.ts`, and run again. Only Azfar decides whether a company
can go back into the pool. If so, edit the JSON by hand with a `note`.
