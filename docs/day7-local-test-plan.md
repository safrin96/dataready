# Day 7 Local Test Plan (Pre-Deploy)

Goal: harden DataReady locally before publishing/deploying.

## 1) One-command readiness check

Runs smoke tests + eval matrix + external dataset sweep + flagship demo. Gemini steps run only when Gemini is configured.

```bash
cd backend
./.venv/bin/python scripts/run_local_ready_check.py
```

Artifacts:
- `evals/local_runs/latest_ready_check.json` (when writable)

## 2) Gemini-first confirmation

To confirm we are truly Gemini-first (not falling back):

1. Ensure `.env` contains `DATAREADY_VERTEX_PROJECT` (or `GEMINI_API_KEY`).
2. Ensure `DATAREADY_DISABLE_LLM` is unset/false.
3. Run a demo audit in the UI and confirm:
   - model banner says Gemini path is active
   - export JSON shows `reasoning_trace.path = "gemini"`

## 3) Dataset regression sanity

We keep one small public reference fixture in golden fixtures:
- `evals/golden/fixtures/taxi_zone_lookup_v1.csv`

This ensures we can catch regressions on real-ish, clean dimensional data without committing huge public datasets.

