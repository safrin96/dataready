# Day 6 Demo Checklist (Flagship Multimodal)

Goal: run one flagship multimodal audit case end-to-end, then verify it will work after Railway deploy.

## Local flagship run

1. Start the app (`localhost:8000`).
2. Go to **Upload**.
3. Upload:
   - a CSV (or use Try demo first)
   - optionally a dashboard screenshot
   - optionally a data dictionary PDF
4. Run audit and confirm:
   - Report shows Score, Grade, Confidence.
   - "Multimodal checks" appears when screenshot/PDF are attached.
   - Issues tab includes at least one semantic-layer issue when multimodal finds something.
   - Exports work (audit JSON, issues CSV, fixes JSON, bundle ZIP).

Optional CLI runner (writes `demo_assets/flagship_latest.json`):

```bash
cd backend
./.venv/bin/python scripts/run_flagship_demo.py
```

## After Railway deploy

1. Visit `/` and confirm the SPA loads.
2. Visit `/api/health` and confirm status `ok`.
3. Run Try demo dataset.
4. Upload one real enterprise CSV (UTF-16 ok) and confirm the audit succeeds.
5. Download the bundle ZIP and confirm it contains the expected files.

