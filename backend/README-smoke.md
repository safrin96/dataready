# DataReady Backend Smoke Checks (Day 1-3 Gate)

Use this script as the minimum reliability gate before continuing Day 4/5 work.

## Run without model keys

```bash
cd backend
source .venv/bin/activate
PYTHONDONTWRITEBYTECODE=1 python3 scripts/smoke_day1_day3.py
```

Expected shape:
- health status is `ok`
- deterministic demo report is valid
- `confidence_level` and `evidence_coverage` are present
- `reasoning_trace` is present with valid enums

## Run with `.env` loaded

```bash
cd backend
source .venv/bin/activate
set -a && . ../.env && set +a
PYTHONDONTWRITEBYTECODE=1 python3 scripts/smoke_day1_day3.py
```

Expected shape:
- health mode should show `gemini_configured` if key is set
- if model calls succeed, generators may be `llm_refined`
- if model calls fail, fallback is explicit in `reasoning_trace.note`

This script is intentionally lightweight and fast; full eval suites come in Day 7.
