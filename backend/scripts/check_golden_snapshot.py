from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.llm_reasoning import maybe_refine_analysis
from app.services.profiling import build_analysis_artifacts


def _generate_current() -> dict:
    project_root = ROOT.parent
    fixture = project_root / "evals" / "golden" / "fixtures" / "university_messy_v1.csv"
    dataset_bytes = fixture.read_bytes()

    os.environ.pop("GEMINI_API_KEY", None)
    os.environ.pop("ANTHROPIC_API_KEY", None)

    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=dataset_bytes,
        dataset_name="university_messy_v1",
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

    return {
        "score": report.score,
        "grade": report.grade,
        "confidence_level": report.confidence_level,
        "evidence_coverage": report.evidence_coverage,
        "issues_count": len(issues.issues),
        "issues_generator": issues.generator,
        "report_generator": report.generator,
        "trace_path": reasoning_trace.path,
    }


def main() -> int:
    project_root = ROOT.parent
    snapshot_path = project_root / "evals" / "golden" / "snapshots" / "university_messy_v1.snapshot.json"
    snapshot = json.loads(snapshot_path.read_text())

    expected = {
        "score": snapshot["report"]["score"],
        "grade": snapshot["report"]["grade"],
        "confidence_level": snapshot["report"]["confidence_level"],
        "evidence_coverage": snapshot["report"]["evidence_coverage"],
        "issues_count": len(snapshot["issues"]["issues"]),
        "issues_generator": snapshot["issues"]["generator"],
        "report_generator": snapshot["report"]["generator"],
        "trace_path": snapshot["reasoning_trace"]["path"],
    }

    current = _generate_current()
    print(json.dumps({"expected": expected, "current": current}, indent=2))

    return 0 if current == expected else 1


if __name__ == "__main__":
    raise SystemExit(main())
