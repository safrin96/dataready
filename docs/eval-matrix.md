# DataReady Test Matrix v1

This matrix turns the dataset pack into a practical, repeatable test order. The dataset registry for the BI failure modes lives in [`bi-failure-dataset-registry.md`](./bi-failure-dataset-registry.md).
The executable coverage gate for this matrix is [`/evals/bi_failure_registry.json`](/Users/Sshrabony/Claude/hackathon/dataready/evals/bi_failure_registry.json), enforced by `backend/scripts/run_eval_matrix.py`.

## 1. Small clean datasets

Purpose: prove the app gives a sane score when the report input is mostly healthy.

Primary real-world mapping:
- `Northwind`
- `AdventureWorks` as a clean reference benchmark

Pass signal:
- score is high
- no invented columns
- report stays stable across runs
- root-cause ranking does not invent a business failure

## 2. Messy enterprise CSVs

Purpose: prove the app can find enterprise issues that make report totals, filters, or metric definitions unsafe.

Primary real-world mapping:
- `Olist`
- `Lending Club`
- `Chicago Crimes`

Pass signal:
- issues are grounded in the data
- score drops for real reasons
- remediation text is understandable
- business summary names the decision at risk

## 3. Wide schemas

Purpose: prove the app can handle broad business tables without truncating the profile.

Primary real-world mapping:
- `AdventureWorks`
- `SEC EDGAR`
- `BLS QCEW`

Pass signal:
- all columns are represented in the profile
- the app stays responsive
- sampling still works

## 4. Multimodal pairs

Purpose: prove Gemini can reason across CSV + dashboard screenshot + dictionary PDF for report correctness.

Primary real-world mapping:
- `NYC TLC`
- `Contoso BI Demo`
- `AdventureWorks`

Pass signal:
- evidence coverage becomes multimodal
- phantom dimensions / grain mismatches are surfaced
- output stays grounded in the provided artifacts
- top 3 root causes include evidence snippets and analyst follow-up questions

## 5. Oversized rejection cases

Purpose: prove the app fails safely when inputs exceed operating limits.

Current limits:
- CSV: `100 MB`
- dashboard image: `20 MB`
- data dictionary PDF: `40 MB`
- CSV profiling sample: random `10,000` rows by default, with head / last-N-days / stratified options

Pass signal:
- oversized files are rejected with a clear message
- the app does not hang or crash

## 6. Performance Near Limit

Purpose: prove the app stays responsive as inputs approach the real-world size limit (without committing huge fixtures).

How it works:
- the runner generates a synthetic CSV near a target size (default `10 MB`)

Optional knobs (env vars):
- `DATAREADY_EVAL_NEAR_LIMIT_MB` (default `10`)
- `DATAREADY_EVAL_MAX_TOTAL_MS` (optional hard gate)
- `DATAREADY_EVAL_MAX_PROFILING_MS` (optional hard gate)
- `DATAREADY_EVAL_MAX_REASONING_MS` (optional hard gate)

Pass signal:
- the run completes successfully
- timings are recorded in the matrix output (`profiling_ms`, `reasoning_ms`, `total_ms`)

## 7. Adversarial edge cases

Purpose: prove the app stays grounded when inputs are messy or hostile.

Coverage:
- bad column names
- null tokens disguised as strings
- date drift and ambiguity
- prompt injection-shaped values

Primary real-world mapping:
- `UCI Adult`
- `CMS DE-SynPUF`
- `NYC 311`
- OWASP-style red-team cases from the eval pack

Pass signal:
- no prompt injection succeeds
- null tokens are recognized
- date ambiguity is called out instead of silently coerced
- suspicious naming is flagged rather than trusted

## 8. Sampling credibility cases

Purpose: prove the Trust tab explains what the sample covers before a stakeholder acts on the audit.

Coverage:
- random sampling by default
- last-N-days with a time field
- stratified sampling by region/status/product

Pass signal:
- Trust tab and profiler output show the strategy, row count, and time window when available
- root-cause evidence cites sampling coverage when it drives confidence
- redacted mode removes row sample values and disables multimodal evidence coverage

## Recommended run order

1. Small clean datasets
2. Messy enterprise CSVs
3. Wide schemas
4. Multimodal pairs
5. Performance near limit
6. Oversized rejection cases
7. Adversarial edge cases
8. Sampling credibility cases

This is the sequence we should use for smoke testing, demo hardening, and regression gates.

## Run It

From the backend virtualenv:

```bash
cd backend
./.venv/bin/python scripts/run_eval_matrix.py
```

If you want a fast, quota-safe run (no Gemini calls), set:
- `DATAREADY_DISABLE_LLM=1`

The runner prints JSON to stdout and also writes a copy to:

- `evals/matrix_runs/latest.json` (when writable)
- otherwise `/private/tmp/dataready_eval_runs/latest.json`

## Regression Gate (CI)

This repo includes a GitHub Actions workflow that runs the eval matrix on every PR and on pushes to `main`:

- `.github/workflows/eval-matrix.yml`
