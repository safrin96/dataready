# DataReady — Gemini Integration Spec

**Owner:** Sumaiya Shrabony  
**Last updated:** 2026-05-09  
**Challenge target:** Gemini / Google AI Studio intelligent agents challenge

---

## 1. Core position

DataReady is a **Gemini-first multimodal audit system** for semantic-layer readiness.

The project should clearly demonstrate:
- Gemini-based reasoning through the Gemini API
- agent-driven workflow execution
- multimodal understanding across text, image, and PDF context
- practical enterprise value through a working prototype

Claude may remain available as an optional benchmark path, but it is not the primary submission architecture.

---

## 2. The judge-defense in one sentence

> DataReady uses Gemini because the Profiler has to reason across a dataset, a dashboard screenshot, and a data dictionary PDF in the same workflow to catch semantic-layer failures that text-only pipelines routinely miss.

---

## 3. Target failure classes

The flagship multimodal audit should catch:
- phantom dimensions
- grain mismatches
- presentation-vs-source drift
- stale dictionary definitions
- inconsistent business labels
- encoding drift that only appears when comparing source and presentation layers

These are exactly the kinds of failures that break AI BI copilots in real enterprise environments.

---

## 4. Gemini model split

| Agent | Default model | Why |
|---|---|---|
| Profiler | Gemini Pro + Gemini Flash | Pro for multimodal reasoning across dataset + screenshot + PDF. Flash for fast follow-up checks and scalable sub-analysis. |
| Business Logic Validator | Gemini Pro | Validator is a business-meaning judgment step and should default to the stronger reasoning model. |
| Remediation Planner | Gemini Pro with optional Flash path | Planning quality matters, but Flash can support lighter workflow cases when speed is more important. |
| Readiness Scorer | Gemini Pro | Final scoring is decision-sensitive and should stay on Pro by default. |

Short version:
- **Gemini Pro** for deep reasoning and multimodal judgment
- **Gemini Flash** for speed, responsiveness, and repeated sub-tasks

---

## 5. System architecture

```text
Input package
  dataset + optional dashboard image + optional dictionary PDF
      ↓
Profiler
  Gemini Pro multimodal pass
  Gemini Flash follow-up checks
  deterministic profiling grounding
      ↓
Business Logic Validator
  Gemini Pro default
      ↓
Remediation Planner
  Gemini Pro default
  optional Gemini Flash workflow path
      ↓
Readiness Scorer
  Gemini Pro default
  deterministic scoring guardrails
      ↓
Output package
  profiler artifact + issues + remediation + final report
```

Structured JSON artifacts are the contract between steps.

---

## 6. API design principles

### 6.1 Gemini is the default path

The app should prefer Gemini whenever `GEMINI_API_KEY` is available.

### 6.2 Deterministic code is grounding, not the headline

Deterministic profiling, scoring, and heuristics should remain in place for:
- stable local development
- fallback when keys are unavailable
- eval stability
- grounding around column-level facts

### 6.3 Claude is benchmark-only

Anthropic support can remain for side-by-side comparison, internal evaluation, or content creation, but it should not be the main path in the README, build plan, or default runtime behavior.

---

## 7. Output contract priorities

Each step should return structured output suitable for the next step.

Minimum contract expectations:
- Profiler returns normalized column diagnostics and multimodal findings
- Validator returns issue objects with severity and business impact
- Planner returns remediation objects with SQL and Python suggestions
- Scorer returns score, grade, blockers, and verdict

The contract matters as much as the prompt. It keeps the workflow stable as we improve prompts and models.

---

## 8. Challenge criterion mapping

| Challenge goal | DataReady fit |
|---|---|
| Gemini reasoning via AI Studio or API | Strong |
| Agent-driven workflows | Strong |
| Multimodal understanding | Strong |
| Practical value | Strong |
| Enterprise decision support | Strong |

The strongest live-demo story is:
1. upload CSV
2. attach screenshot and PDF
3. run multimodal audit
4. surface semantic blockers
5. show remediation and readiness score

---

## 9. Cost and platform posture

Because new Google Cloud accounts receive **$300 in credits for 90 days**, DataReady should be built assuming a practical Gemini usage budget during the challenge period.

Recommended posture:
- Google AI Studio for prompt iteration
- Gemini API for application calls
- Railway for the first cheap deployment
- Google Cloud as the supporting challenge platform story

If the app later needs a more enterprise-native path, Vertex AI can become the follow-on architecture.

---

## 10. What not to do

- Do not present Gemini as an optional add-on.
- Do not lead with Claude in the public story.
- Do not reduce the multimodal claim to OCR-only pipelines.
- Do not claim a model-agnostic architecture when the challenge advantage is clearly Gemini-native.

---

## 11. Immediate implementation implications

1. Gemini should become the default reasoning layer in backend services.
2. `GEMINI_API_KEY` should be the primary required model credential.
3. Gemini Pro and Flash roles should be visible in docs and UI copy.
4. Anthropic should move behind an optional benchmark flag.
5. The first real demo should prove the multimodal path, not just CSV-only profiling.
