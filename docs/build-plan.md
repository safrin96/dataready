# DataReady — Canonical Build Plan

**Owner:** Sumaiya Shrabony  
**Last updated:** 2026-05-09  
**Purpose:** This is the canonical execution plan for DataReady. If any other DataReady file conflicts with this document on scope, platform, architecture, or target audience, update that file to match this one.

## 1. Product decision

We are building the technically differentiated conference version, not just the weekend MVP.

DataReady is:
- a Gemini-first 4-agent semantic-layer audit system
- built to support a live workshop or conference demo in October 2026
- designed for long-term maintainability, not a throwaway prototype
- scoped so a credible version ships in one week

The strongest flagship capability is multimodal semantic audit using dataset + dashboard screenshot + data dictionary PDF to catch phantom dimensions, grain mismatches, and presentation-vs-source drift.

## 2. Audience decision

The primary audience is:
- BI managers
- TPMs / data program managers
- analytics engineering leaders
- consulting analysts
- engineering leaders evaluating AI BI rollouts

This is a technical-but-executive-readable audit product, not a beginner AI demo app.

## 3. Challenge decision

DataReady should read as a **Gemini and Google AI Studio challenge build**, not as a model-agnostic tool with Gemini attached later.

That means:
- Gemini is the default reasoning layer
- Gemini Pro handles the hard reasoning and multimodal work
- Gemini Flash keeps the workflow responsive and affordable
- deterministic code remains for grounding, fallback, and eval stability
- Claude is optional benchmark mode only

## 4. Platform decision

Canonical development workflow:
- Cursor for day-to-day building
- GitHub as the source of truth from day 1
- Railway as the primary cheap hosting target
- Google Cloud credits and Gemini API as the primary challenge-period platform advantage

Why:
- Cursor gives full file access, repo control, and strong AI-assisted coding.
- GitHub preserves ownership, history, CI options, and October conference prep.
- Railway is cheap, easy to redeploy, and fast for a single-service launch.
- Google Cloud credits make the Gemini-first path economically practical during the challenge build.

## 5. Hosting decision

Default deployment shape:
- a single Railway web service in week 1

Principles:
- cheap now
- easy GitHub redeploy
- easy environment-variable management
- easy to move later

Do not optimize for multi-service complexity in week 1.

## 6. Google Cloud strategy

New Google Cloud accounts receive **$300 in free credits for 90 days**.

Practical implication for DataReady:
- use Gemini API as the primary model path
- use Google AI Studio for prompt iteration and fast testing
- use Google Cloud credits for challenge-period Gemini usage and supporting infrastructure if needed
- keep the default app architecture Google-friendly from day 1

Vertex AI can be a future enterprise path, but AI Studio + Gemini API is the fastest challenge setup.

## 7. Technical architecture decision

Week-1 production architecture:
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: FastAPI
- Data processing: pandas
- Artifact contracts: JSON handoffs between agents
- Model strategy:
  - Gemini Pro for multimodal profiling and decision-sensitive reasoning
  - Gemini Flash for fast workflow steps and repeatable sub-analysis
  - deterministic checks for grounding and graceful fallback
  - Claude optional as benchmark-only comparison path

## 8. One-week build goal

At the end of 7 days, DataReady must be able to:
1. accept a CSV upload
2. optionally accept a dashboard screenshot
3. optionally accept a data dictionary PDF
4. run the 4-agent pipeline
5. return issue cards, remediation snippets, and a readiness score
6. export the report as JSON
7. run at least one flagship multimodal demo case
8. deploy from GitHub to a live URL

Not required for initial ship:
- full public scoreboard UI
- auth
- persistence layer
- multi-user accounts
- enterprise integrations

## 9. Non-negotiable scope boundaries

Do not add these in week 1:
- direct warehouse connectors
- user accounts
- background jobs
- database persistence unless absolutely necessary
- team features
- generalized semantic-layer integrations
- full enterprise compliance workflows

## 10. Canonical repository structure

```text
dataready/
  README.md
  frontend/
  backend/
  shared/
    schemas/
    prompts/
  evals/
    golden/
    red_team/
    fairness/
    perf/
  demo_assets/
  docs/
```

Notes:
- `frontend/` holds UI only
- `backend/` holds API and orchestration
- `shared/schemas/` defines inter-agent contracts
- `shared/prompts/` stores prompts in files, not inline strings
- `evals/` becomes a runnable system, not just notes

## 11. Canonical file alignment rules

These files must stay aligned:
- `docs/build-plan.md` = source of truth for scope and platform
- `README.md` = public product story
- `docs/gemini-spec.md` = Gemini and multimodal architecture
- `docs/evals-and-datasets.md` = evaluation and demo proof
- `docs/market-research.md` = market and content strategy
- `docs/prompts/build-prompt.md` = fast-build implementation prompt

If we change platform, stack, audience, challenge positioning, or flagship demo flow, update all affected files in the same session.

## 12. Seven-day build sequence

Day 1:
- create GitHub repo
- define repo structure
- define agent JSON schemas
- define upload payload shapes
- define report output schema

Day 2:
- build frontend shell
- build backend API shell
- wire file upload flow
- add demo mode

Day 3:
- implement CSV/schema Profiler
- add Gemini multimodal path
- add screenshot + PDF intake
- return normalized profiler artifact

Day 4:
- implement Validator
- implement Planner
- render issue cards and code snippets

Day 5:
- implement Scorer
- add JSON export
- tighten UI and result states

Day 6:
- run flagship demo case
- deploy on Railway
- validate live demo flow

Day 7:
- add minimum eval scaffolding
- add one regression fixture
- add one adversarial fixture
- freeze workshop demo script and screen flow

## 13. Content strategy during build

The build itself should generate public content:
- architecture screenshots
- Gemini Pro vs Flash decision tradeoffs
- before/after issue-card views
- live deploy moments
- multimodal input demos
- eval scoreboard progress

This is another reason to use Cursor + GitHub + Railway.

## 14. Immediate next actions

1. Keep this file as the source of truth for all DataReady docs
2. Lock Gemini Pro + Flash as the canonical model architecture
3. Continue the backend from deterministic profiler into real Gemini-backed Validator, Planner, and Scorer flows
4. Test the first multimodal demo path end to end
