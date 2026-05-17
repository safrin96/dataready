# DataReady Demo Script — Video Presentation (3 minutes)

Target: 2:30–3:30 narrated screen recording.
Record with: Loom, OBS, or QuickTime screen capture + voiceover.

---

## [0:00–0:20] HOOK — The Problem

**Show:** Title card with DataReady logo + tagline "Fix the report nobody trusts"

**Say:**
"Every BI platform in 2026 promises natural language querying. Power BI Copilot. Looker with Gemini. ThoughtSpot Sage. They all assume your data is clean, labeled, and semantically coherent. It usually is not. DataReady is the pre-flight audit that tells you why your AI BI rollout will fail — before you connect a copilot."

---

## [0:20–0:50] DEMO 1 — FARS (The Dramatic Failure)

**Show:** DataReady UI → Upload screen

**Say:**
"Let me show you. I'm uploading NHTSA's Fatality Analysis Reporting System — the official US traffic crash data. 40,000 fatal crashes per year. I'm also uploading their 1,061-page coding manual and their 2023 Traffic Safety Facts report — the published dashboard every policy maker reads."

**Action:** Upload accident.csv + FARS_Coding_Validation_Manual_2021.pdf + Traffic_Safety_Facts_2023_Overview.pdf

**Say:**
"DataReady runs 4 Gemini-powered agents in sequence. Profiler. Validator. Planner. Scorer."

**Show:** Audit running → Results appear

**Say:**
"Score: 20 out of 100. Grade: F. 19 semantic issues found. The verdict: 'This semantic layer has numerous critical and medium issues, severely limiting its readiness for AI BI applications.'"

**Show:** Scroll to Issues tab → highlight top findings

**Say:**
"Look at what Gemini caught: COUNTYNAME mixes text with embedded codes — '(13)' inside a display label. NOT_MINNAME stores numeric values as text strings. WRK_ZONE is empty for most rows but still exposed as a sliceable dimension. If you built a BI copilot on this, it would confidently serve wrong answers to executives."

---

## [0:50–1:20] DEMO 1 — The Fix

**Show:** Fixes/Remediation tab

**Say:**
"DataReady doesn't just flag. It plans remediation. For COUNTYNAME, here's the SQL: REGEXP_REPLACE to strip the embedded code. Here's the pandas equivalent. Copy, paste, ship. Every issue gets a plain-English explanation, a SQL fix, and a Python fix."

---

## [1:20–1:50] DEMO 2 — NYC Schools (Cross-Domain Proof)

**Show:** New audit → upload school_quality_ems_2024.csv + educator-guide PDF + snapshot PDF

**Say:**
"Now a completely different domain. New York City Department of Education School Quality Reports. 1,355 schools. Exported from their official Excel workbook."

**Show:** Results — Score 23/F, 23 issues

**Say:**
"Score: 23. Grade: F. Why? Three critical issues immediately — the Excel export left unnamed columns that a BI copilot would try to query. Multiple columns are 90% null. The dashboard PDF shows metrics that the CSV doesn't cleanly map to. DataReady catches the export-to-dashboard drift that teams don't notice until the executive asks 'why does this number look wrong?'"

---

## [1:50–2:10] DEMO 3 — BLS Employment (The Clean Foil)

**Show:** New audit → upload employment_situation_2019_2026.csv + empsit PDF + handbook PDF

**Say:**
"Now contrast: Bureau of Labor Statistics employment data. Well-structured. Clear column names. Monthly cadence."

**Show:** Results — Score 80/B, 3 issues

**Say:**
"Score: 80. Grade: B. Only 3 issues — date stored as text instead of typed, and two series with gaps. DataReady doesn't over-flag. It discriminates between messy and clean. That's what makes it trustworthy."

---

## [2:10–2:40] Architecture + Why Gemini

**Show:** Architecture diagram (4-agent pipeline)

**Say:**
"Under the hood: 4 specialized Gemini agents in sequence. Each produces structured JSON for the next. The Profiler does multimodal reasoning across CSV, dashboard, and dictionary. The Validator checks business logic. The Planner generates remediation SQL and Python. The Scorer synthesizes a readiness judgment. Gemini Flash handles the full chain — fast enough for interactive use, smart enough to catch definition drift across documents."

---

## [2:40–3:00] CLOSE — The Opinion

**Show:** Score comparison: FARS 20/F, NYC DOE 23/F, BLS 80/B

**Say:**
"Every team rolling out AI BI needs this audit before they ship. DataReady is the flight recorder that proves your semantic layer is safe — or tells you exactly what to fix first. Built with Gemini. Deployed on Railway. Open source on GitHub."

**Show:** GitHub URL + deployed app URL

---

## Recording Tips

- Record at 1280x720 or 1920x1080
- Use dark mode in the app (looks better on video)
- Keep mouse movements slow and deliberate
- Pause 1 second after each screen transition
- Export as MP4, upload to YouTube (unlisted) or Loom
- Total target: under 3:30
