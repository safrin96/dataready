# DataReady

**A Gemini-powered semantic-layer audit that tells you why your AI BI rollout will fail before you connect a copilot.**

[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%202.5-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Milan AI Week Hackathon](https://img.shields.io/badge/Milan%20AI%20Week-2026-FF6B35)](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Demo

<!-- Replace this placeholder with your recorded demo after filming -->
> **Video demo coming soon** — a 3-minute walkthrough auditing real government datasets with DataReady.

[![Watch the Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?logo=youtube)](YOUR_YOUTUBE_LINK_HERE)

<!-- Uncomment and replace with your actual video link:
[![DataReady Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
-->

---

## The Problem

Every major BI platform in 2026 ships natural language querying. Power BI Copilot. Looker with Gemini. ThoughtSpot Sage. Tableau Einstein.

They all assume your data is clean, labeled, and semantically coherent. **It usually is not.**

A real enterprise data environment looks like this:

- A column named `val1` because nobody renamed it after the migration
- Status values like `1`, `active`, `NULL`, `yes`, and `enrolled` in the same field
- Date columns stored as text in three formats
- A dashboard slicer referencing a column that was dropped months ago
- A data dictionary that describes the old grain, not the current table

The BI copilots are not the problem. **The semantic layer underneath them is.** Teams need a pre-flight audit before they roll out AI BI features to executives.

---

## What DataReady Does

Upload a CSV, an optional dashboard PDF/screenshot, and an optional data dictionary PDF. DataReady runs **4 Gemini-powered agents** and returns:

- A **DataReady Score** (0–100) with letter grade
- **Ranked issue cards** with plain-English explanations
- **SQL + Python remediation** for every issue found
- A **one-line executive verdict** on readiness
- An **exportable bundle** (JSON + CSV + ZIP) for engineering handoff

---

## Results on Real Public Data

We audited three authoritative government datasets — no synthetic data, no cherry-picking:

| Dataset | Source | Score | Grade | Issues | Reasoning |
|---|---|---|---|---|---|
| US Traffic Fatalities (FARS 2023) | [NHTSA](https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars) | **20** | **F** | 19 | Gemini |
| NYC School Quality Reports (2024) | [NYC DOE](https://infohub.nyced.org/reports/students-and-schools/school-quality/school-quality-reports-and-resources) | **23** | **F** | 23 | Gemini |
| US Employment Situation (2019–2026) | [BLS / FRED](https://fred.stlouisfed.org/series/PAYEMS) | **80** | **B** | 3 | Gemini |

DataReady discriminates: messy data gets an F with detailed remediation. Clean data gets a B with minimal flags. That's what makes the F scores trustworthy.

---

## Architecture

```
Inputs
  CSV + optional dashboard PDF + optional dictionary PDF
      |
      v
Agent 1: Profiler (Gemini Flash)
  Column-level profiling + multimodal cross-check
  Deterministic grounding as safety net
      |
      v
Agent 2: Business Logic Validator (Gemini Flash)
  Semantic coherence + definition drift detection
      |
      v
Agent 3: Remediation Planner (Gemini Flash)
  SQL + Python + plain-English fixes per issue
      |
      v
Agent 4: Readiness Scorer (Gemini Flash)
  Score + grade + confidence + executive verdict
      |
      v
Outputs
  Issue cards + fix pack + readiness score + export bundle
```

Each agent produces structured JSON for the next. Deterministic profiling runs as a grounding layer — Gemini refines and extends, never hallucinates from scratch.

---

## Why Gemini

Gemini is not a sidecar in this project. It is the primary intelligence layer.

DataReady needs:
- **Multimodal understanding** — reading CSV structure, PDF dashboards, and PDF dictionaries in one pass
- **Agent-driven workflows** — structured JSON handoff between 4 reasoning stages
- **Enterprise-grade reasoning** — catching definition drift that requires cross-document inference
- **Low-latency execution** — Flash processes full audit chains in 20–130 seconds

This maps to Google's recommended model split:
- **Gemini Flash** for fast, responsive workflow execution across all 4 agents
- **Gemini Pro** available for advanced reasoning when deeper semantic validation is needed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + Python 3.9+ + pandas |
| AI Models | Gemini 2.5 Flash (primary) via google-genai SDK |
| Deployment | Railway |
| Source control | GitHub |

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [Google AI Studio](https://ai.studio/) API key (free tier works for Flash)

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/dataready.git
cd dataready

# Backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env

cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Run locally

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open `http://localhost:5173` and upload a CSV to run your first audit.

### Run without API key

The app still works without a Gemini key — it uses deterministic profiling and scoring as a fallback. The intended path is Gemini-first, but the safety net is always there.

---

## Demo Datasets

DataReady ships with small evaluation fixtures in `evals/golden/fixtures/`. For the flagship demo, we used:

| Dataset | Source | How to get it |
|---|---|---|
| FARS 2023 Accidents | [NHTSA](https://www.nhtsa.gov/file-downloads) | Download National CSV from FARS FTP |
| NYC DOE School Quality | [NYC InfoHub](https://infohub.nyced.org/reports/students-and-schools/school-quality/school-quality-reports-and-resources) | Download 2023-24 EMS results Excel |
| BLS Employment | [FRED](https://fred.stlouisfed.org/) | Download PAYEMS, UNRATE, U6RATE series |

See `datasets/flagship_*/` for the merged CSVs (small files tracked in git) and download instructions for the full PDFs.

---

## Evaluation

DataReady includes a structured evaluation framework:

- **Golden fixtures** — 7 hand-crafted CSVs covering clean, messy, wide, adversarial, and multimodal failure modes
- **BI Failure Registry** — documented failure categories with expected pass signals
- **Matrix runner** — automated evaluation across all fixture types

```bash
cd backend
source .venv/bin/activate
python scripts/run_eval_matrix.py
```

---

## Project Structure

```
dataready/
├── frontend/          React + Vite + Tailwind
├── backend/           FastAPI + Gemini agents
│   ├── app/
│   │   ├── services/  Profiling, LLM reasoning, exports
│   │   ├── models/    Pydantic contracts
│   │   └── main.py    FastAPI app
│   └── scripts/       Demo runners, eval matrix
├── datasets/          Flagship demo data (CSVs tracked, large PDFs gitignored)
├── evals/             Golden fixtures + matrix runs
├── docs/              Build plan, demo script, submission kit
├── branding/          Logo assets
└── demo_assets/       Audit output JSONs from flagship runs
```

---

## Challenge Alignment

Built for the [Milan AI Week Hackathon 2026](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon) — Google DeepMind / Gemini track.

| Requirement | How DataReady meets it |
|---|---|
| Uses Gemini via Google AI Studio / Gemini API | All 4 agents use Gemini 2.5 Flash through google-genai SDK |
| Agent-driven or automated workflows | 4-stage pipeline with structured JSON handoff |
| Practical value through working prototype | Live deployment auditing real government data |
| Multimodal understanding | CSV + PDF dashboard + PDF dictionary cross-analysis |

Tracks covered:
- **Multimodal Intelligence** — processes text, structured data, and PDF documents
- **Agentic Workflows** — 4-agent pipeline plans its own steps
- **Intelligent Reasoning** — independent decision-making on semantic validity
- **Enterprise Utility** — solves real friction for BI and analytics managers

---

## License

MIT

---

## Author

Built by [Team Ground Truth](https://linkedin.com/in/sumaiya-shrabony) for Milan AI Week 2026.

Questions? Open an issue or reach out on LinkedIn.
