# DataReady — lablab Deploy Runbook

This runbook is for final hackathon deployment and submission readiness.

## 1) Decide deployment target

Default:
- Railway single-service deploy (already documented in `/docs/deploy-railway.md`)

Optional for partner-award targeting:
- Vultr VM backend deploy (if you want Vultr-specific eligibility)

For fastest final submission, use Railway unless you explicitly want Vultr award criteria.

## 2) Required environment variables

Set in deployment platform:

- `DATAREADY_VERTEX_PROJECT=YOUR_GCP_PROJECT_ID`
- `DATAREADY_VERTEX_LOCATION=us-central1`
- `DATAREADY_REASONING_MODEL=gemini-2.5-pro`
- `DATAREADY_WORKFLOW_MODEL=gemini-2.5-flash`
- `DATAREADY_CORS_ALLOW_ORIGINS=https://YOUR_APP_DOMAIN`

If Vertex auth is not ready, temporary fallback:
- `GEMINI_API_KEY=YOUR_AI_STUDIO_KEY`

## 3) Hard verification before submission

### API checks
- `GET /api/health` returns:
  - `status: "ok"`
  - `mode: "gemini_configured"`

### UI flow checks
1. Upload page loads.
2. Run demo works.
3. Full diagnose flow with:
   - CSV
   - optional screenshot
   - optional dictionary PDF
4. Results tabs load (Report, Trust, Business, Impact, Dictionary, Fix Pack, Issues, Profile).
5. Export actions work:
   - audit JSON
   - issues CSV
   - fixes JSON
   - share pack ZIP

### Gemini path checks
- Model status indicates Gemini active.
- Reasoning trace present in export JSON.
- At least one multimodal run shows non-CSV-only evidence coverage.

## 4) Final QA assets to keep for judges

Prepare and store:
- one clean-run screenshot
- one messy-run screenshot
- one multimodal input screenshot
- one root-cause ranking screenshot
- one fix-pack screenshot
- one dictionary screenshot
- one trust/compliance screenshot

Store under:
- `/demo_assets/`

## 5) Submission field mapping

Use `/docs/lablab-submission-kit.md` as the copy source.

Field mapping:
- Project Title -> section 1
- Short Description -> section 1
- Long Description -> section 1
- Technology & Category Tags -> section 1
- Cover Image -> section 2
- Video Presentation -> section 2
- Slide Presentation -> section 2
- Public GitHub Repository -> section 3
- Demo Application Platform -> section 3
- Application URL -> section 3

## 6) Last 30-minute pre-submit checklist

- [ ] App URL works in incognito
- [ ] `/api/health` confirms Gemini configured
- [ ] Demo path runs end-to-end
- [ ] At least one multimodal run completed
- [ ] Export bundle downloaded and opens
- [ ] GitHub repo is public and README is up to date
- [ ] Submission form fields pasted from submission kit
- [ ] Video + slides links are accessible without login

