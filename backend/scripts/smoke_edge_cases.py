from __future__ import annotations

import csv
import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.ingest_limits import (
    CSV_MAX_UPLOAD_BYTES,
    CSV_MAX_ROWS_SAMPLED,
    DATA_DICTIONARY_MAX_UPLOAD_BYTES,
    DASHBOARD_IMAGE_MAX_UPLOAD_BYTES,
    validate_upload_limits,
)
from app.services.llm_reasoning import maybe_refine_analysis
from app.services.profiling import build_analysis_artifacts


def _csv_bytes(rows: int, cols: int) -> bytes:
    header = [f"col_{index}" for index in range(cols)]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row_index in range(rows):
        writer.writerow([f"{row_index}_{col_index}" for col_index in range(cols)])
    return buffer.getvalue().encode("utf-8")


def _run_case(name: str, *, dataset_bytes: bytes, dashboard_attached: bool = False, dictionary_attached: bool = False) -> dict[str, object]:
    profiler, issues, remediation, report = build_analysis_artifacts(
        dataset_bytes=dataset_bytes,
        dataset_name=name,
        dashboard_attached=dashboard_attached,
        dictionary_attached=dictionary_attached,
        compliance_mode="standard",
        dashboard_image_bytes=b"dashboard" if dashboard_attached else None,
        data_dictionary_bytes=b"%PDF-1.4 test" if dictionary_attached else None,
    )
    issues, remediation, report, trace = maybe_refine_analysis(
        profiler_payload=profiler.model_dump(),
        issues=issues,
        remediation=remediation,
        report=report,
    )
    return {
        "name": name,
        "score": report.score,
        "grade": report.grade,
        "confidence_level": report.confidence_level,
        "evidence_coverage": report.evidence_coverage,
        "rows_sampled": profiler.row_count_sampled,
        "columns": profiler.column_count,
        "issues": len(issues.issues),
        "trace_path": trace.path,
    }


def main() -> int:
    cases = [
        _run_case("pristine_small", dataset_bytes=_csv_bytes(20, 5)),
        _run_case("wide_schema", dataset_bytes=_csv_bytes(12, 250)),
        _run_case("large_sampled", dataset_bytes=_csv_bytes(CSV_MAX_ROWS_SAMPLED + 2500, 8)),
        _run_case(
            "multimodal_context",
            dataset_bytes=_csv_bytes(20, 6),
            dashboard_attached=True,
            dictionary_attached=True,
        ),
    ]

    for case in cases:
        print(case)

    validate_upload_limits(
        dataset_bytes=_csv_bytes(20, 5),
        dashboard_bytes=b"x" * (DASHBOARD_IMAGE_MAX_UPLOAD_BYTES - 1),
        dictionary_bytes=b"x" * (DATA_DICTIONARY_MAX_UPLOAD_BYTES - 1),
    )

    try:
        validate_upload_limits(
            dataset_bytes=b"x" * (CSV_MAX_UPLOAD_BYTES + 1),
            dashboard_bytes=None,
            dictionary_bytes=None,
        )
    except ValueError as exc:
        print({"oversized_csv_rejected": str(exc)})
        return 0

    print({"oversized_csv_rejected": False})
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
