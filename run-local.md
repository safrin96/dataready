# Run DataReady Locally

## 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8000
```

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 3. Open

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/api/health

## Notes

- Without API keys, the app still runs using deterministic profiling, issue detection, remediation, and scoring.
- With `DATAREADY_VERTEX_PROJECT` (recommended for Cloud credits), DataReady will use Vertex AI Gemini for multimodal analysis and reasoning refinement.
- Local auth for Vertex:
  - Run `gcloud auth application-default login` once on your machine, or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file path.
  - Set `DATAREADY_VERTEX_PROJECT` to your GCP project id and (optionally) `DATAREADY_VERTEX_LOCATION` (default: `us-central1`).
- With `GEMINI_API_KEY` (AI Studio key), DataReady will call the AI Studio endpoint instead.
- `DATAREADY_REASONING_MODEL` should stay on a Gemini Pro model unless you are explicitly testing a different configuration.
- `DATAREADY_WORKFLOW_MODEL` is for fast workflow-scale steps and lighter follow-up reasoning.
- `ANTHROPIC_API_KEY` is optional and should be treated as benchmark-only comparison mode, not the primary runtime path.
- If the frontend says the backend cannot be reached, confirm the FastAPI server is running on port `8000` or set `VITE_API_BASE_URL` to the deployed API URL.
- Current upload limits: CSV `100 MB`, dashboard image `20 MB`, data dictionary PDF `40 MB`, with CSV profiling sampled to the first `10,000` rows.
