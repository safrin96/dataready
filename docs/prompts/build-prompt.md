Build a full-stack web app called DataReady — a Gemini-powered
enterprise semantic-layer audit system that evaluates whether a dataset
is actually ready for AI BI workflows.

This prompt defines the **fast but extensible build path**. The app should
ship a strong CSV-first experience immediately while preserving clean
extension points for multimodal context like dashboard screenshots and
data dictionary PDFs.

BUILD GOAL:
- GitHub-first project structure with full source files visible
- Easy local cloning and publishing
- Fast implementation path suitable for AI-assisted coding tools
- Clean long-term architecture for the October conference version

STACK:
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Python FastAPI
- AI: Gemini API
  - Gemini Pro for multimodal reasoning and decision-sensitive steps
  - Gemini Flash for fast workflow and follow-up analysis
  - Use `GEMINI_API_KEY` from environment variables
- Data: pandas for CSV processing
- Optional benchmark only: Anthropic via `ANTHROPIC_API_KEY`

ARCHITECTURE NOTE:
- Keep agent handoffs as explicit JSON contracts
- Design Agent 1 to accept:
  - CSV / SQL schema
  - optional dashboard screenshot PNG
  - optional data dictionary PDF
- Keep deterministic profiling and scoring as grounding and fallback
- Do not hard-couple the system to Replit-specific runtime features

BACKEND — build these FastAPI routes:
POST /api/analyze
- Accept multipart form with CSV upload
- Optionally accept dashboard image and dictionary PDF
- Run 4 sequential agent steps:

  Agent 1: Profiler
  - Build a profiler artifact with column stats, inferred types, null diagnostics,
    sample values, quality flags, and multimodal findings when context files exist
  - Default model path: Gemini Pro
  - Optional scale path: Gemini Flash for follow-up sub-analysis

  Agent 2: Business Logic Validator
  - Given the profiler artifact, identify semantic and business-readiness issues
  - Return JSON list of issues with `issue_id`, `column_name`, `severity`,
    `problem_description`, and `business_impact`
  - Default model path: Gemini Pro

  Agent 3: Remediation Planner
  - For each issue, return `plain_english_fix`, `sql_snippet`, and `python_snippet`
  - Return structured JSON grouped by issue
  - Default model path: Gemini Pro
  - Optional fast path: Gemini Flash

  Agent 4: Readiness Scorer
  - Calculate a DataReady Score from 0–100 based on the issue set
  - Return JSON with `score`, `grade`, `top_3_blockers`, and `one_line_verdict`
  - Default model path: Gemini Pro
  - Keep deterministic guardrails around final scoring

- Chain agents: pass each output as structured input to the next
- Return combined JSON to frontend

POST /api/demo
- Return a prebuilt analysis result for a realistic messy dataset
- Include issues like mixed null formats, inconsistent status values,
  unlabeled columns, and semantic drift
- Use this so reviewers can test without uploading files

POST /api/analyze-semantic-context
- If separate from `/api/analyze`, make this the explicit multimodal route
- Accept CSV plus optional dashboard image and dictionary PDF
- If not implemented separately, leave a clear TODO or redirect to `/api/analyze`

FRONTEND — build these React components:
- UploadZone: drag-and-drop CSV uploader with optional screenshot/PDF inputs
- AgentProgress: 4-step progress tracker
- ScoreCard: large score display with grade letter
- IssueList: cards sorted by severity with expandable remediation
- ProfilerPanel: column-level findings and multimodal context summary
- ExportButton: downloads full JSON report

OPTIONAL COMPONENTS:
- SemanticContextPanel: richer dashboard/PDF upload treatment
- ModeBadge: show `Core MVP` vs `Flagship semantic audit`
- ConfidenceBanner: show deterministic fallback or degraded mode clearly

DESIGN:
- Premium, clean, accessible UI
- Strong hierarchy and conference-grade polish
- Responsive desktop/mobile behavior
- Avoid generic startup styling

ERROR HANDLING:
- If CSV has no headers, show a specific message
- If Gemini is unavailable, fall back gracefully to deterministic mode
- If file is not CSV, reject with a clear message
- If multimodal context is missing, continue in CSV-only mode with transparent messaging

NON-GOALS FOR THIS BUILD PHASE:
- direct warehouse connectors
- user accounts
- heavy persistence or background jobs
- platform lock-in

DELIVERY EXPECTATION:
Create a working codebase with separate `frontend/` and `backend/` folders,
plus `backend/requirements.txt`, environment-variable support, and clean
extension points for evals and future conference polish.
