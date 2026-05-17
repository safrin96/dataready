from __future__ import annotations

import io
import json
import html
import zipfile
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi import Request
from fastapi.responses import StreamingResponse

from app.models.contracts import AnalyzeRequestMetadata, AnalyzeResponse, AuditContext
from app.services.ingest_limits import validate_upload_limits
from app.services.llm_reasoning import maybe_refine_analysis
from app.services.product_artifacts import build_product_artifacts
from app.services.profiling import build_analysis_artifacts


router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_dataset(
    audit_mode: str = Form(...),
    dataset_name: str = Form(...),
    dataset_format: str = Form(...),
    compliance_mode: str = Form("standard"),
    require_gemini: bool = Form(True),
    report_name: Optional[str] = Form(default=None),
    metric_name: Optional[str] = Form(default=None),
    expected_behavior: Optional[str] = Form(default=None),
    grain: Optional[str] = Form(default=None),
    join_keys: Optional[str] = Form(default=None),
    time_column: Optional[str] = Form(default=None),
    definition_notes: Optional[str] = Form(default=None),
    reported_value: Optional[float] = Form(default=None),
    expected_min: Optional[float] = Form(default=None),
    expected_max: Optional[float] = Form(default=None),
    target_stack: str = Form("snowflake"),
    fix_delivery: str = Form("sql_only"),
    sampling_strategy: str = Form("random"),
    sample_rows: int = Form(10_000),
    stratify_column: Optional[str] = Form(default=None),
    recent_days: Optional[int] = Form(default=None),
    dataset_file: Optional[UploadFile] = File(default=None),
    dashboard_image: Optional[UploadFile] = File(default=None),
    data_dictionary: Optional[UploadFile] = File(default=None),
) -> AnalyzeResponse:
    if dataset_file is None:
        raise HTTPException(status_code=400, detail="A CSV dataset upload is required.")

    audit_context = AuditContext(
        report_name=(report_name or "").strip() or None,
        metric_name=(metric_name or "").strip() or None,
        expected_behavior=(expected_behavior or "").strip() or None,
        grain=(grain or "").strip() or None,
        join_keys=(join_keys or "").strip() or None,
        time_column=(time_column or "").strip() or None,
        definition_notes=(definition_notes or "").strip() or None,
        reported_value=reported_value,
        expected_min=expected_min,
        expected_max=expected_max,
        target_stack=target_stack
        if target_stack in {"snowflake", "bigquery", "databricks", "powerbi", "generic_sql"}
        else "snowflake",
        fix_delivery=fix_delivery
        if fix_delivery in {"sql_only", "dbt_model_and_tests", "power_query", "semantic_layer_notes"}
        else "sql_only",
        sampling_strategy=sampling_strategy if sampling_strategy in {"head", "random", "stratified", "last_n_days"} else "random",
        sample_rows=sample_rows,
        stratify_column=(stratify_column or "").strip() or None,
        recent_days=recent_days,
    )

    request_metadata = AnalyzeRequestMetadata(
        audit_mode=audit_mode,
        dataset_name=dataset_name,
        dataset_format=dataset_format,
        includes_dashboard_image=dashboard_image is not None,
        includes_data_dictionary=data_dictionary is not None,
        compliance_mode=compliance_mode,
        audit_context=audit_context,
    )

    dataset_bytes = await dataset_file.read()
    if not dataset_bytes:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")

    if not (dataset_file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV uploads are supported in the current audit flow.")

    dashboard_bytes = await dashboard_image.read() if dashboard_image is not None else None
    dictionary_bytes = await data_dictionary.read() if data_dictionary is not None else None

    try:
        validate_upload_limits(
            dataset_bytes=dataset_bytes,
            dashboard_bytes=dashboard_bytes,
            dictionary_bytes=dictionary_bytes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    try:
        profiler, issues, remediation, report = build_analysis_artifacts(
            dataset_bytes=dataset_bytes,
            dataset_name=dataset_name,
            dashboard_attached=dashboard_image is not None,
            dictionary_attached=data_dictionary is not None,
            compliance_mode=compliance_mode,
            dashboard_image_bytes=dashboard_bytes,
            data_dictionary_bytes=dictionary_bytes,
            audit_context=audit_context,
        )
        issues, remediation, report, reasoning_trace = maybe_refine_analysis(
            profiler_payload=profiler.model_dump(),
            issues=issues,
            remediation=remediation,
            report=report,
        )
        if require_gemini and reasoning_trace.path == "deterministic" and (
            (reasoning_trace.note or "").lower().startswith("gemini unavailable")
            or (reasoning_trace.note or "").lower().startswith("gemini is not configured")
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini is unavailable for this run. DataReady is configured for Gemini-first audits, "
                    "so the request was stopped before fallback. Verify GEMINI_API_KEY or DATAREADY_VERTEX_PROJECT and retry."
                ),
            )
        business_audit, impact_map, fix_pack, dictionary, reconciliation, data_handling = build_product_artifacts(
            audit_context=audit_context,
            profiler=profiler,
            issues=issues,
            remediation=remediation,
            report=report,
            compliance_mode=compliance_mode,
        )
    except UnicodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "We could not decode this CSV as text. DataReady supports common enterprise encodings "
                "(UTF-8, UTF-8 with BOM, UTF-16, CP1252). If this file is unusual, re-export it as CSV UTF-8 and retry."
            ),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to run the audit on this CSV. "
                "If the file is very large or oddly formatted, try re-exporting as a standard CSV or uploading a smaller sample."
            ),
        ) from exc

    return AnalyzeResponse(
        request=request_metadata,
        profiler=profiler,
        issues=issues,
        remediation=remediation,
        report=report,
        business_audit=business_audit,
        impact_map=impact_map,
        fix_pack=fix_pack,
        dictionary=dictionary,
        reconciliation=reconciliation,
        data_handling=data_handling,
        reasoning_trace=reasoning_trace,
    )


@router.post("/demo", response_model=AnalyzeResponse)
async def demo_response() -> AnalyzeResponse:
    demo_csv = b"student_id,student_status,val1,enrollment_date,revenue,notes\n1,active,blue,2024-01-10,200,ready\n2,1,green,01/14/2024,-25,NULL\n3,yes,,2024/01/21,140,follow up\n4,enrolled,orange,14-02-2024,190,n/a\n5,TRUE,purple,2024-03-01,210,none\n"

    demo_context = AuditContext(
        report_name="Enrollment report",
        metric_name="Active students",
        expected_behavior="Counts should match enrollment system totals.",
        grain="one row per student enrollment record",
        join_keys="student_id",
        time_column="enrollment_date",
        definition_notes="Treat TRUE/yes/1/enrolled as active.",
        sampling_strategy="head",
        sample_rows=10_000,
    )

    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=demo_csv,
        dataset_name="messy_university_enrollment_demo",
        dashboard_attached=False,
        dictionary_attached=False,
        compliance_mode="standard",
        audit_context=demo_context,
    )
    issues, remediation, report, reasoning_trace = maybe_refine_analysis(
        profiler_payload=profiler.model_dump(),
        issues=issues,
        remediation=remediation,
        report=report,
    )
    business_audit, impact_map, fix_pack, dictionary, reconciliation, data_handling = build_product_artifacts(
        audit_context=demo_context,
        profiler=profiler,
        issues=issues,
        remediation=remediation,
        report=report,
        compliance_mode="standard",
    )

    request_metadata = AnalyzeRequestMetadata(
        audit_mode="demo",
        dataset_name="messy_university_enrollment_demo",
        dataset_format="demo",
        includes_dashboard_image=False,
        includes_data_dictionary=False,
        compliance_mode="standard",
        audit_context=demo_context,
    )

    return AnalyzeResponse(
        request=request_metadata,
        profiler=profiler,
        issues=issues,
        remediation=remediation,
        report=report,
        business_audit=business_audit,
        impact_map=impact_map,
        fix_pack=fix_pack,
        dictionary=dictionary,
        reconciliation=reconciliation,
        data_handling=data_handling,
        reasoning_trace=reasoning_trace,
    )


def _html_list(items: list[str]) -> str:
    if not items:
        return "<li>None captured in this run.</li>"
    return "".join(f"<li>{html.escape(str(item))}</li>" for item in items)


def _business_audit_memo_html(payload: AnalyzeResponse) -> str:
    audit = payload.business_audit
    report = payload.report
    context = payload.request.audit_context
    title = (context.report_name if context and context.report_name else payload.request.dataset_name) or "DataReady audit"
    metric = (context.metric_name if context and context.metric_name else "Key metric")
    impact = payload.impact_map
    fix_pack = payload.fix_pack
    root_causes = [
        f"{item.cause} ({item.confidence}% confidence). Evidence: {item.evidence_snippet}"
        for item in (impact.root_cause_ranking if impact else [])
    ]
    next_actions = (fix_pack.acceptance_criteria if fix_pack else [])[:5]
    missing = audit.missing_evidence if audit else []
    whats_wrong = audit.whats_wrong if audit else payload.report.top_3_blockers
    decisions = audit.decisions_at_risk if audit else []
    summary = audit.stakeholder_summary if audit else payload.report.one_line_verdict

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DataReady Business Audit - {html.escape(title)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; }}
    h1, h2 {{ margin: 0 0 12px; }}
    h1 {{ font-size: 28px; }}
    h2 {{ font-size: 16px; margin-top: 28px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 24px; }}
    .pill {{ border: 1px solid #cbd5e1; border-radius: 999px; padding: 6px 10px; font-size: 13px; }}
    .summary {{ border-left: 4px solid #0891b2; padding-left: 14px; font-size: 15px; }}
    li {{ margin: 7px 0; }}
  </style>
</head>
<body>
  <p style="margin:0 0 8px;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">DataReady Business Audit</p>
  <h1>{html.escape(title)}</h1>
  <div class="meta">
    <span class="pill">Metric: {html.escape(metric)}</span>
    <span class="pill">Score: {report.score}/{report.grade}</span>
    <span class="pill">Confidence: {html.escape(report.confidence_level)}</span>
    <span class="pill">Evidence: {html.escape(report.evidence_coverage.replace("_", " "))}</span>
  </div>
  <p class="summary">{html.escape(summary)}</p>

  <h2>What is wrong</h2>
  <ul>{_html_list(whats_wrong)}</ul>

  <h2>Business impact</h2>
  <ul>{_html_list(decisions)}</ul>

  <h2>Evidence-backed root cause ranking</h2>
  <ul>{_html_list(root_causes)}</ul>

  <h2>Missing evidence</h2>
  <ul>{_html_list(missing)}</ul>

  <h2>Recommended next actions</h2>
  <ul>{_html_list(next_actions)}</ul>
</body>
</html>
"""


@router.post("/export/bundle")
async def export_bundle(request: Request, payload: AnalyzeResponse) -> StreamingResponse:
    """
    Create a single downloadable ZIP containing the audit output artifacts.
    This endpoint is stateless: the frontend posts the current audit payload, and we package it.
    """
    base = (payload.request.dataset_name or "dataready-audit").lower()
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in base).strip("-") or "dataready-audit"

    # Guardrail: prevent abuse by posting huge JSON bodies to force large zips / memory spikes.
    # (Upload limits apply only to file uploads, not JSON.)
    max_json_bytes = 2 * 1024 * 1024  # 2MB
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_json_bytes:
                raise HTTPException(status_code=413, detail="Export payload too large.")
        except ValueError:
            pass

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.txt", "DataReady audit bundle\n\nContains: audit JSON, profiler, issues, remediation, report.\n")
        zf.writestr("audit.json", json.dumps(payload.model_dump(), indent=2) + "\n")
        zf.writestr("profiler.json", json.dumps(payload.profiler.model_dump(), indent=2) + "\n")
        zf.writestr("issues.json", json.dumps(payload.issues.model_dump(), indent=2) + "\n")
        zf.writestr("remediation.json", json.dumps(payload.remediation.model_dump(), indent=2) + "\n")
        zf.writestr("report.json", json.dumps(payload.report.model_dump(), indent=2) + "\n")
        zf.writestr("reasoning_trace.json", json.dumps(payload.reasoning_trace.model_dump(), indent=2) + "\n")
        if payload.business_audit is not None:
            zf.writestr("business_audit.json", json.dumps(payload.business_audit.model_dump(), indent=2) + "\n")
            zf.writestr("business_audit_memo.html", _business_audit_memo_html(payload))
        if payload.impact_map is not None:
            zf.writestr("impact_map.json", json.dumps(payload.impact_map.model_dump(), indent=2) + "\n")
        if payload.fix_pack is not None:
            zf.writestr("fix_pack.json", json.dumps(payload.fix_pack.model_dump(), indent=2) + "\n")
            zf.writestr("fix_pack_cleanup.sql", (payload.fix_pack.cleanup_sql or "").strip() + "\n")
            zf.writestr("fix_pack_validation.sql", (payload.fix_pack.validation_sql or "").strip() + "\n")
        if payload.dictionary is not None:
            zf.writestr("dictionary.json", json.dumps(payload.dictionary.model_dump(), indent=2) + "\n")
        if payload.reconciliation is not None:
            zf.writestr("reconciliation.json", json.dumps(payload.reconciliation.model_dump(), indent=2) + "\n")
        if payload.data_handling is not None:
            zf.writestr("data_handling.json", json.dumps(payload.data_handling.model_dump(), indent=2) + "\n")

        header = ["issue_id", "severity", "category", "column_name", "problem_description", "business_impact"]
        rows = [header]
        for issue in payload.issues.issues:
            rows.append(
                [
                    issue.issue_id,
                    issue.severity,
                    issue.category,
                    issue.column_name or "",
                    issue.problem_description,
                    issue.business_impact,
                ]
            )
        def _csv_line(values: list[str]) -> str:
            escaped = []
            for value in values:
                v = (value or "").replace('"', '""')
                escaped.append(f'"{v}"')
            return ",".join(escaped)

        issues_csv = "\n".join(_csv_line([str(v) for v in row]) for row in rows) + "\n"
        zf.writestr("issues.csv", issues_csv)

    buffer.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="{safe}-bundle.zip"'}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)
