from __future__ import annotations

import json
import os
import concurrent.futures
from typing import Any, Optional

from app.models.contracts import CrossModalFinding

_MULTIMODAL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="dataready-multimodal")


def build_multimodal_findings(
    *,
    dashboard_attached: bool,
    dictionary_attached: bool,
    dashboard_image_bytes: Optional[bytes],
    data_dictionary_bytes: Optional[bytes],
    profiler_payload: dict[str, Any],
    compliance_mode: str = "standard",
) -> list[CrossModalFinding]:
    findings: list[CrossModalFinding] = []
    if dashboard_attached:
        findings.append(
            CrossModalFinding(
                type="dashboard_context_attached",
                severity="low",
                summary="Dashboard context was attached and is preserved for the multimodal profiler path.",
            )
        )
    if dictionary_attached:
        findings.append(
            CrossModalFinding(
                type="dictionary_context_attached",
                severity="low",
                summary="Data dictionary context was attached and is preserved for semantic cross-checking.",
            )
        )

    if compliance_mode == "redacted":
        findings.append(
            CrossModalFinding(
                type="multimodal_redacted_mode",
                severity="low",
                summary="Compliance mode is redacted, so dashboard/PDF cross-checking is disabled to avoid sending sensitive context to Gemini.",
            )
        )
        return findings

    if (os.getenv("DATAREADY_DISABLE_LLM") or "").strip().lower() in {"1", "true", "yes", "on"}:
        if dashboard_attached or dictionary_attached:
            findings.append(
                CrossModalFinding(
                    type="multimodal_reasoning_disabled",
                    severity="low",
                    summary="Multimodal inputs are attached, but DATAREADY_DISABLE_LLM is set so Gemini cross-checking is disabled.",
                )
            )
        return findings

    api_key = os.getenv("GEMINI_API_KEY")
    vertex_project = (os.getenv("DATAREADY_VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip() or None
    vertex_location = (os.getenv("DATAREADY_VERTEX_LOCATION") or os.getenv("GOOGLE_CLOUD_LOCATION") or "us-central1").strip()

    if not (api_key or vertex_project) or not (dashboard_attached or dictionary_attached):
        return findings

    def _extract_json(text: str) -> dict[str, Any]:
        """
        Gemini sometimes wraps JSON in prose/markdown. Extract the first JSON object if needed.
        """
        text = (text or "").strip()
        if not text:
            return {}
        try:
            return json.loads(text)
        except Exception:
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            return json.loads(text[start : end + 1])
        except Exception:
            return {}

    try:
        from google.genai import Client

        if vertex_project:
            client = Client(vertexai=True, project=vertex_project, location=vertex_location)
        else:
            client = Client(api_key=api_key)

        allowed_types = [
            "grain_mismatch",
            "phantom_dimension",
            "metric_definition_ambiguity",
            "missing_join_keys",
            "naming_mismatch",
            "semantic_layer",
        ]
        prompt = (
            "You are DataReady's Multimodal Cross-Checker.\n"
            "Task: find grounded semantic-layer readiness risks by comparing:\n"
            "- the CSV profiler summary\n"
            "- the dashboard screenshot (if attached)\n"
            "- the data dictionary PDF (if attached)\n\n"
            "Rules:\n"
            "- Output MUST be strict JSON only.\n"
            "- Be conservative: only flag what you can support from the provided inputs.\n"
            "- Prefer issues that matter for BI/semantic layers:\n"
            "  - grain mismatch (dashboard appears aggregated but CSV is row-level, or vice versa)\n"
            "  - phantom dimensions (dashboard uses a dimension not present in CSV)\n"
            "  - metric definition ambiguity (dictionary/dashboard wording conflicts with column behavior)\n"
            "  - missing join keys (no stable identifier for common joins)\n"
            "  - inconsistent naming (dashboard/dictionary label does not map cleanly to CSV columns)\n"
            "- Provide up to 3 findings.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "findings": [\n'
            "    {\n"
            '      "severity": "low|medium|high|critical",\n'
            f'      "type": "one of {allowed_types}",\n'
            '      "summary": "one paragraph, specific, no fluff",\n'
            '      "evidence": "what you saw in dashboard/dictionary/profile that supports it"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Profiler summary (JSON): {json.dumps(profiler_payload, ensure_ascii=True)}"
        )

        parts: list[Any] = [prompt]
        if dashboard_attached and dashboard_image_bytes:
            parts.append({"mime_type": "image/png", "data": dashboard_image_bytes})
        if dictionary_attached and data_dictionary_bytes:
            parts.append({"mime_type": "application/pdf", "data": data_dictionary_bytes})

        def _call() -> Any:
            return client.models.generate_content(
                model=os.getenv("DATAREADY_MULTIMODAL_MODEL", "gemini-2.5-pro"),
                contents=parts,
            )

        timeout_s = float(os.getenv("DATAREADY_MULTIMODAL_TIMEOUT_SECONDS", os.getenv("DATAREADY_LLM_TIMEOUT_SECONDS", "12")) or "12")
        future = _MULTIMODAL_EXECUTOR.submit(_call)
        try:
            response = future.result(timeout=timeout_s)
        except concurrent.futures.TimeoutError:
            future.cancel()
            findings.append(
                CrossModalFinding(
                    type="multimodal_path_deferred",
                    severity="low",
                    summary="Gemini multimodal cross-check timed out; deterministic CSV audit continued.",
                )
            )
            return findings
        text = getattr(response, "text", "") or ""
        payload = _extract_json(text)
        for item in payload.get("findings", [])[:3]:
            if not isinstance(item, dict):
                continue
            severity = str(item.get("severity", "")).strip().lower()
            if severity not in {"critical", "high", "medium", "low"}:
                continue
            finding_type = str(item.get("type", "")).strip()
            if finding_type not in allowed_types:
                finding_type = "semantic_layer"
            summary = str(item.get("summary", "")).strip()
            evidence = str(item.get("evidence", "")).strip()
            if not summary:
                continue
            if evidence:
                summary = f"{summary} Evidence: {evidence}"
            findings.append(CrossModalFinding(type=finding_type, severity=severity, summary=summary))
    except Exception:
        findings.append(
            CrossModalFinding(
                type="multimodal_path_deferred",
                severity="low",
                summary="Multimodal context is attached, but the advanced Gemini cross-check path is not active in this environment.",
            )
        )

    return findings
