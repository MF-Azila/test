# EAINT-12341 — handoff (v1.3)

Read this first, then `STATUS.md`. History of the v1.1 work (Azfar, 24–25.09)
is in `HANDOFF.v1.1.md`, `STATUS.v1.1.md` and `01-intake/scenarios.v1.1.yaml`.

## Scope agreed

Automation takes each chain to the state the email checks start from and writes
the expected emails / letter for that run. **Emails are checked by hand in
Mailtrap** (screenshots into `05-evidence/<TS>/`). Same model as before.

Binding rules carried over:
1. Real companies only — real ROC/ROB/LLP + matching TIN, seeded into eSim's SSM simulator.
2. Source: company-details-checker sheet, Overall = PASS rows only.
3. **One company, one use** — `company-ledger.json`, even after a failed run.
4. Don't assume what the SRD does not say — ask (workbook *Open Questions*).

## What the automation folder is

`automation/` here is a **slice** of the team's Playwright project: the chain's
page objects, the eSim seeder and the config. These modules are imported but are
NOT in this folder — they come from the full project on the QA laptop:
`@fixtures`, `@fixtures/esim`, `@fixtures/step`, `@auth/login`,
`@config/environments`, `@data/ssm`, `src/pages/base.page.ts`,
`fixtures/uploads/*`, `package.json`, `tsconfig.json`, `env/`.

Copy `cr/` into the full project (beside `automation/`) to run. The `cr`
Playwright project in `playwright.config.ts` picks up `cr/**/03-spec/*.spec.ts`.

Verified here (01.10.2026): the spec type-checks (`tsc --strict`) against the
real page objects with stubs for the missing modules; `expected-emails.ts`
renders. **Not run against staging.**

## Run

```powershell
cd automation
npm ci
# once, read-only: confirms how eSim stores a ROC (KEY_FORMAT = split)
npx tsx scripts/seed-ssm.ts --inspect
$env:HEADED=1; $env:QA_TESTER="<name>"; $env:QA_EMAIL_PREFIX="<prefix>"
$env:CHAIN_SCENARIO="12341_CH1"; npx playwright test --project=cr
```

Tick the reCAPTCHA once when asked. At the end the log prints
`READY FOR MANUAL EMAIL CHECK` and the path of `04-runs/12341_CH1_<run>.md` —
open that beside Mailtrap; it has the exact subject, body, CC, letter fields and
the time windows for the no-email checks, with the run's own values.

**Commit `company-ledger.json` and `04-runs/` after every run.**

## What changed in the spec for v1.3

- Runs CH1–CH8 replace the 18 v1.1 scenarios (`chain-scenarios.ts`), in execution priority: Sdn Bhd (CH1 main, CH2) → Sole Prop / Partnership (CH3–CH5) → LLP (CH6) → Business Trading Sabah (CH7) → Sarawak (CH8).
- A chain with no company refuses to run before touching anything (Q-20).
- Business Trading path (CH7, CH8): no eSim seed, generated licence number, licence upload, typed directors, SSM Status not required.
- Admin In Charge and Director in Charge get different name / mobile / email so the emails show which one the system uses (Q-04).
- Timestamps for pre-application approved / submitted / approved (no-email windows xx-04, CH5-05/06; letter date xx-16).
- `expected-emails.ts` renders the expected content; a partial sheet is written even when a run fails.
- Identity is configurable (`QA_TESTER`, `QA_EMAIL_PREFIX`, `QA_EMAIL_DOMAIN`) — no personal names hard-coded.
- Ledger: empty keys never match (trading chains have no new BRN).

## If a run fails part way

The ledger marks the company `failed` with the stage, and it stays spent. Take
the next unused PASS row of the same type, put it in `chain-scenarios.ts`, run
again. Classify the failure (application / automation / test data /
environment) with the screenshot, trace and the ledger error before raising
anything.
