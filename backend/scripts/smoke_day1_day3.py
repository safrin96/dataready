from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.api.routes.analyze import demo_response
from app.main import healthcheck


def main() -> int:
    health = healthcheck().model_dump()
    demo = asyncio.run(demo_response())

    report = {
        "health": health,
        "demo": {
            "score": demo.report.score,
            "grade": demo.report.grade,
            "confidence_level": demo.report.confidence_level,
            "evidence_coverage": demo.report.evidence_coverage,
            "issues_count": len(demo.issues.issues),
            "issues_generator": demo.issues.generator,
            "remediation_generator": demo.remediation.generator,
            "report_generator": demo.report.generator,
            "trace": demo.reasoning_trace.model_dump(),
        },
        "checks": {},
    }

    checks = report["checks"]
    checks["health_status_ok"] = health["status"] == "ok"
    checks["score_in_range"] = 0 <= demo.report.score <= 100
    checks["grade_valid"] = demo.report.grade in {"A", "B", "C", "D", "F"}
    checks["confidence_valid"] = demo.report.confidence_level in {"low", "medium", "high"}
    checks["coverage_valid"] = demo.report.evidence_coverage in {
        "csv_only",
        "csv_plus_dashboard",
        "csv_plus_dictionary",
        "csv_plus_dashboard_dictionary",
    }
    checks["trace_path_valid"] = demo.reasoning_trace.path in {
        "gemini",
        "anthropic_benchmark",
        "deterministic",
    }
    checks["trace_status_fields_valid"] = all(
        status in {"llm", "deterministic", "skipped"}
        for status in [
            demo.reasoning_trace.validator,
            demo.reasoning_trace.planner,
            demo.reasoning_trace.scorer,
        ]
    )

    vertex_project = os.getenv("DATAREADY_VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
    if not os.getenv("GEMINI_API_KEY") and not vertex_project:
        checks["no_key_implies_deterministic"] = demo.reasoning_trace.path == "deterministic"

    all_ok = all(checks.values())
    print(json.dumps(report, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
