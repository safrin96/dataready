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


def main() -> int:
    project_root = ROOT.parent
    fixture = project_root / "evals" / "golden" / "fixtures" / "university_messy_v1.csv"
    out = project_root / "evals" / "golden" / "snapshots" / "university_messy_v1.snapshot.json"

    dataset_bytes = fixture.read_bytes()

    # Force deterministic baseline snapshots for stable regression gating.
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

    snapshot = {
        "request": {
            "audit_mode": "csv",
            "dataset_name": "university_messy_v1",
            "dataset_format": "csv",
            "includes_dashboard_image": False,
            "includes_data_dictionary": False,
            "compliance_mode": "standard",
        },
        "profiler": profiler.model_dump(),
        "issues": issues.model_dump(),
        "remediation": remediation.model_dump(),
        "report": report.model_dump(),
        "reasoning_trace": reasoning_trace.model_dump(),
    }

    out.write_text(json.dumps(snapshot, indent=2))
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
