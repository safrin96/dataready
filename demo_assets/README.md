# Demo Assets

This folder holds the Day 6 flagship demo inputs and outputs.

If these files exist, the demo runner will use them:
- `flagship_demo.csv`
- `flagship_dashboard.png`
- `flagship_dictionary.pdf`

If they do **not** exist, the runner falls back to stable repo fixtures.

Outputs:
- `flagship_latest.json`
- `flagship_<timestamp>.json`

Run it:

```bash
cd backend
./.venv/bin/python scripts/run_flagship_demo.py
```

