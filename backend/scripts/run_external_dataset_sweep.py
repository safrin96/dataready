from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(ROOT / ".env")

from app.models.contracts import AnalyzeRequestMetadata, AnalyzeResponse  # noqa: E402
from app.services.llm_reasoning import maybe_refine_analysis  # noqa: E402
from app.services.profiling import build_analysis_artifacts  # noqa: E402


DATASETS_DIR = ROOT / "datasets" / "external"
RUNS_DIR = ROOT / "evals" / "external_runs"
FALLBACK_RUNS_DIR = Path("/private/tmp/dataready_external_runs")


@dataclass
class SweepItem:
    filename: str
    status: str
    score: int | None = None
    grade: str | None = None
    confidence: str | None = None
    evidence: str | None = None
    issues: int | None = None
    error: str | None = None


def _now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _audit_csv(path: Path) -> AnalyzeResponse:
    dataset_bytes = path.read_bytes()
    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=dataset_bytes,
        dataset_name=path.stem,
        dashboard_attached=False,
        dictionary_attached=False,
        compliance_mode="standard",
    )
    issues, remediation, report, reasoning_trace = maybe_refine_analysis(
        profiler_payload=profiler.model_dump(),
        issues=issues,
        remediation=remediation,
        report=report,
    )
    req = AnalyzeRequestMetadata(
        audit_mode="csv",
        dataset_name=path.stem,
        dataset_format="csv",
        includes_dashboard_image=False,
        includes_data_dictionary=False,
        compliance_mode="standard",
    )
    return AnalyzeResponse(
        request=req,
        profiler=profiler,
        issues=issues,
        remediation=remediation,
        report=report,
        reasoning_trace=reasoning_trace,
    )


def main() -> int:
    if not DATASETS_DIR.exists():
        print(f"Missing datasets dir: {DATASETS_DIR}")
        return 2

    runs_dir = RUNS_DIR
    try:
        runs_dir.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        runs_dir = FALLBACK_RUNS_DIR
        runs_dir.mkdir(parents=True, exist_ok=True)
    run_id = _now_id()
    items: list[SweepItem] = []
    seen_paths: set[str] = set()

    # Sweep any CSVs in the external dataset cache, including extracted zip folders.
    for path in sorted(DATASETS_DIR.rglob("*.csv")):
        if path.is_symlink():
            continue
        resolved = str(path.resolve())
        if resolved in seen_paths:
            continue
        seen_paths.add(resolved)
        try:
            response = _audit_csv(path)
            out_path = runs_dir / f"{path.stem}_{run_id}.json"
            try:
                out_path.write_text(json.dumps(response.model_dump(), indent=2) + "\n", encoding="utf-8")
            except PermissionError:
                runs_dir = FALLBACK_RUNS_DIR
                runs_dir.mkdir(parents=True, exist_ok=True)
                out_path = runs_dir / f"{path.stem}_{run_id}.json"
                out_path.write_text(json.dumps(response.model_dump(), indent=2) + "\n", encoding="utf-8")
            items.append(
                SweepItem(
                    filename=path.name,
                    status="ok",
                    score=response.report.score,
                    grade=response.report.grade,
                    confidence=response.report.confidence_level,
                    evidence=response.report.evidence_coverage,
                    issues=len(response.issues.issues),
                )
            )
        except Exception as exc:  # noqa: BLE001
            items.append(SweepItem(filename=path.name, status="fail", error=str(exc)))

    summary = {
        "run_id": run_id,
        "datasets_dir": str(DATASETS_DIR),
        "runs_dir": str(runs_dir),
        "total_csv": len(items),
        "ok": sum(1 for it in items if it.status == "ok"),
        "fail": sum(1 for it in items if it.status != "ok"),
        "items": [it.__dict__ for it in items],
    }

    latest_path = runs_dir / "latest_summary.json"
    stamped_path = runs_dir / f"summary_{run_id}.json"
    try:
        latest_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        stamped_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    except PermissionError:
        runs_dir = FALLBACK_RUNS_DIR
        runs_dir.mkdir(parents=True, exist_ok=True)
        latest_path = runs_dir / "latest_summary.json"
        stamped_path = runs_dir / f"summary_{run_id}.json"
        summary["runs_dir"] = str(runs_dir)
        latest_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        stamped_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ["run_id", "total_csv", "ok", "fail"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
