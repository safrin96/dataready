# Deploy DataReady on Railway (Single Service)

This deploy shape serves both backend API and frontend SPA from one service.

## 1. Connect repo to Railway

- Create a new Railway project
- Connect your GitHub repository
- Railway will use `Dockerfile` at the repo root

## 2. Set environment variables

Required:
- One of:
  - `DATAREADY_VERTEX_PROJECT` (recommended, uses Vertex AI Gemini + Google Cloud credits)
  - `GEMINI_API_KEY` (AI Studio key)

Vertex auth (Railway):
- Set `GOOGLE_APPLICATION_CREDENTIALS` to a file path inside the container, and mount/provide a service account JSON at that path (Railway supports file-based variables).
- Or use Railway’s native GCP integration if available in your workspace.

Recommended:
- `DATAREADY_REASONING_MODEL=gemini-2.5-pro`
- `DATAREADY_WORKFLOW_MODEL=gemini-2.5-flash`
- `DATAREADY_MULTIMODAL_MODEL=gemini-2.5-pro`
- `DATAREADY_CORS_ALLOW_ORIGINS=https://<your-railway-domain>`

Optional benchmark mode:
- `ANTHROPIC_API_KEY`
- `DATAREADY_ENABLE_ANTHROPIC_BENCHMARK=false`
- `DATAREADY_ANTHROPIC_BENCHMARK_MODEL=claude-sonnet-4-20250514`

## 3. Deploy and verify

Health check:
- `GET /api/health`

Smoke checks:
1. Open `/` and verify the SPA loads.
2. Run "Try demo dataset".
3. Confirm `reasoning_trace` appears in export JSON.
4. Confirm model mode reflects your key configuration.

## 4. Day 6 production smoke checklist

- [ ] App root loads
- [ ] `/api/health` returns status `ok`
- [ ] Demo route returns score + confidence + evidence coverage
- [ ] Analyze route accepts CSV upload
- [ ] JSON export works
- [ ] `reasoning_trace` includes path and note
