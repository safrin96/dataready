# DataReady Operating Limits

This build is designed for fast audits, not full warehouse ingestion.

## Supported inputs

- CSV dataset: up to `100 MB`
- Dashboard image: up to `20 MB`
- Data dictionary PDF: up to `40 MB`

## Sampling behavior

- CSV profiling samples the first `10,000` rows for speed and stability.
- The report is therefore a readiness signal, not a full warehouse reconciliation.

## What to do for larger inputs

- Upload a representative sample instead of the full extract.
- Split extremely large datasets by subject area or grain.
- Prefer a clean dictionary PDF over a giant mixed reference bundle.
- If a dictionary PDF is too large, trim it to the relevant schema pages first.

## Current eval focus

- Small clean datasets
- Messy enterprise CSVs
- Wide schemas
- CSV + dashboard screenshot + dictionary PDF
- Oversized-file rejection
- Missing/partial-context fallback
- Null tokens, type drift, date drift, and naming ambiguity
