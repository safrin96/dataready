from __future__ import annotations

import json
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.contracts import AnalyzeRequestMetadata, AnalyzeResponse  # noqa: E402
from app.services.llm_reasoning import maybe_refine_analysis  # noqa: E402
from app.services.profiling import build_analysis_artifacts  # noqa: E402


def _read(path: Path) -> bytes:
    return path.read_bytes()


def main() -> int:
    assets_dir = ROOT / "demo_assets"
    fixtures_dir = ROOT / "evals" / "golden" / "fixtures"

    dataset_path = assets_dir / "flagship_demo.csv"
    dashboard_path = assets_dir / "flagship_dashboard.png"
    dictionary_path = assets_dir / "flagship_dictionary.pdf"

    # Keep demo_assets small and stable: if user hasn't placed their own assets yet,
    # fall back to golden fixtures and the premium logo.
    if not dataset_path.exists():
        dataset_path = fixtures_dir / "messy_payments_v1.csv"
    if not dashboard_path.exists():
        dashboard_path = ROOT / "frontend" / "src" / "assets" / "dataready-logo-premium.png"
    if not dictionary_path.exists():
        dictionary_path = fixtures_dir / "dictionary_stub_v1.pdf"

    dataset_bytes = _read(dataset_path)
    dashboard_bytes = _read(dashboard_path)
    dictionary_bytes = _read(dictionary_path)

    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=dataset_bytes,
        dataset_name="flagship_multimodal_demo",
        dashboard_attached=True,
        dictionary_attached=True,
        compliance_mode="standard",
        dashboard_image_bytes=dashboard_bytes,
        data_dictionary_bytes=dictionary_bytes,
    )

    issues, remediation, report, reasoning_trace = maybe_refine_analysis(
        profiler_payload=profiler.model_dump(),
        issues=issues,
        remediation=remediation,
        report=report,
    )

    request_metadata = AnalyzeRequestMetadata(
        audit_mode="semantic_audit",
        dataset_name="flagship_multimodal_demo",
        dataset_format="csv",
        includes_dashboard_image=True,
        includes_data_dictionary=True,
        compliance_mode="standard",
    )

    response = AnalyzeResponse(
        request=request_metadata,
        profiler=profiler,
        issues=issues,
        remediation=remediation,
        report=report,
        reasoning_trace=reasoning_trace,
    )

    out_dir = assets_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    latest = out_dir / "flagship_latest.json"
    stamped = out_dir / f"flagship_{run_id}.json"
    payload = json.dumps(response.model_dump(), indent=2) + "\n"
    latest.write_text(payload, encoding="utf-8")
    stamped.write_text(payload, encoding="utf-8")

    print(
        json.dumps(
            {
                "dataset": dataset_path.name,
                "dashboard": dashboard_path.name,
                "dictionary": dictionary_path.name,
                "score": report.score,
                "grade": report.grade,
                "confidence": report.confidence_level,
                "evidence": report.evidence_coverage,
                "issues": len(issues.issues),
                "multimodal_findings": len(profiler.cross_modal_findings),
                "reasoning_path": reasoning_trace.path,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
