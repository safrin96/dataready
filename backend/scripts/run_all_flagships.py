from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.contracts import AnalyzeRequestMetadata, AnalyzeResponse
from app.services.llm_reasoning import maybe_refine_analysis
from app.services.profiling import build_analysis_artifacts


DATASETS = {
    "fars_2023": {
        "csv": ROOT / "datasets" / "flagship_fars_2023" / "accident.csv",
        "dashboard": ROOT / "datasets" / "flagship_fars_2023" / "Traffic_Safety_Facts_2023_Overview.pdf",
        "dictionary": ROOT / "datasets" / "flagship_fars_2023" / "FARS_Coding_Validation_Manual_2021.pdf",
    },
    "nycdoe_2024": {
        "csv": ROOT / "datasets" / "flagship_nycdoe_2024" / "school_quality_ems_2024.csv",
        "dashboard": ROOT / "datasets" / "flagship_nycdoe_2024" / "school_snapshot_FLI_2024.pdf",
        "dictionary": ROOT / "datasets" / "flagship_nycdoe_2024" / "2023-24-educator-guide-ems.pdf",
    },
    "bls_employment": {
        "csv": ROOT / "datasets" / "flagship_bls_employment" / "employment_situation_2019_2026.csv",
        "dashboard": ROOT / "datasets" / "flagship_bls_employment" / "empsit_sep2024.pdf",
        "dictionary": ROOT / "datasets" / "flagship_bls_employment" / "BLS_Handbook_CES.pdf",
    },
}


def run_one(name: str, paths: dict) -> dict:
    print(f"\n{'='*60}")
    print(f"Running audit: {name}")
    print(f"{'='*60}")

    csv_bytes = paths["csv"].read_bytes()
    dashboard_bytes = paths["dashboard"].read_bytes()
    dictionary_bytes = paths["dictionary"].read_bytes()

    print(f"  CSV: {paths['csv'].name} ({len(csv_bytes) / 1024 / 1024:.1f} MB)")
    print(f"  Dashboard: {paths['dashboard'].name} ({len(dashboard_bytes) / 1024:.0f} KB)")
    print(f"  Dictionary: {paths['dictionary'].name} ({len(dictionary_bytes) / 1024:.0f} KB)")

    t0 = time.time()

    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=csv_bytes,
        dataset_name=name,
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

    elapsed = time.time() - t0

    request_metadata = AnalyzeRequestMetadata(
        audit_mode="semantic_audit",
        dataset_name=name,
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

    out_dir = ROOT / "demo_assets"
    out_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = out_dir / f"{name}_{run_id}.json"
    latest_path = out_dir / f"{name}_latest.json"
    payload = json.dumps(response.model_dump(), indent=2) + "\n"
    out_path.write_text(payload, encoding="utf-8")
    latest_path.write_text(payload, encoding="utf-8")

    summary = {
        "name": name,
        "score": report.score,
        "grade": report.grade,
        "confidence": report.confidence_level,
        "evidence": report.evidence_coverage,
        "issues_count": len(issues.issues),
        "multimodal_findings": len(profiler.cross_modal_findings),
        "reasoning_path": reasoning_trace.path,
        "elapsed_seconds": round(elapsed, 1),
        "output": str(out_path.relative_to(ROOT)),
    }

    print(f"\n  Result: Score={report.score}, Grade={report.grade}")
    print(f"  Issues: {len(issues.issues)}, Multimodal findings: {len(profiler.cross_modal_findings)}")
    print(f"  Time: {elapsed:.1f}s")
    print(f"  Saved: {out_path.relative_to(ROOT)}")

    return summary


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        datasets_to_run = DATASETS
    elif target in DATASETS:
        datasets_to_run = {target: DATASETS[target]}
    else:
        print(f"Unknown target: {target}. Options: {list(DATASETS.keys())} or 'all'")
        return 1

    results = []
    for name, paths in datasets_to_run.items():
        if not paths["csv"].exists():
            print(f"SKIP {name}: CSV not found at {paths['csv']}")
            continue
        try:
            result = run_one(name, paths)
            results.append(result)
        except Exception as e:
            print(f"ERROR running {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append({"name": name, "error": str(e)})

    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
