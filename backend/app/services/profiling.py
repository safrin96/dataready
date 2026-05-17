from __future__ import annotations

import hashlib
import io
import re
import warnings
from dataclasses import dataclass
from typing import Literal, Optional, Tuple
import random

import pandas as pd

from app.models.contracts import (
    AuditContext,
    CrossModalFinding,
    FinalReport,
    Issue,
    IssuesArtifact,
    ProfiledColumn,
    ProfilerArtifact,
    RemediationFix,
    RemediationPlanArtifact,
    ScoreComputationItem,
)
from app.services.ingest_limits import CSV_MAX_ROWS_SAMPLED
from app.services.multimodal import build_multimodal_findings

NULL_TOKENS = {"", "null", "n/a", "na", "none", "nil", "unknown"}
STATUS_LIKE_COLUMNS = ("status", "state", "standing")
DATE_LIKE_COLUMNS = ("date", "dt", "timestamp")
NUMERIC_LIKE_COLUMNS = ("amount", "revenue", "price", "cost", "total", "qty", "count")
UNLABELED_PATTERN = re.compile(r"^(val|col|column|field|x)\d+$|^unnamed", re.IGNORECASE)
INSTRUCTIONISH_PATTERN = re.compile(
    r"(ignore.*(previous|prior|instructions)|ignore.*return|return.*perfect|override.*readiness|system.*prompt|report.*100|score.*100|do.*not.*follow|instructions?.*return)",
    re.IGNORECASE,
)


def _guess_text_encoding(payload: bytes) -> str:
    """
    Enterprise exports are often UTF-16 (Excel, HR/ERP tools) or UTF-8 with BOM.
    Pandas defaults to UTF-8, so sniff a few common cases to avoid user-facing failures.
    """
    if payload.startswith(b"\xff\xfe") or payload.startswith(b"\xfe\xff"):
        return "utf-16"
    if payload.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    return "utf-8"


def _sniff_delimiter(sample_text: str) -> Optional[str]:
    """
    Pick a delimiter based on the first few non-empty lines.
    Returns None when unsure (pandas will use comma by default).
    """
    lines = [line for line in sample_text.splitlines() if line.strip()][:5]
    if not lines:
        return None
    candidates = [",", "\t", ";", "|"]
    scores: dict[str, int] = {c: 0 for c in candidates}
    for line in lines:
        for c in candidates:
            scores[c] += line.count(c)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None


def _read_tabular_bytes(dataset_bytes: bytes) -> pd.DataFrame:
    """
    Load the dataset as a DataFrame, handling common real-world encodings/delimiters.
    We only sample the first N rows for speed/stability (see CSV_MAX_ROWS_SAMPLED).
    """
    encoding_candidates = [_guess_text_encoding(dataset_bytes), "utf-8-sig", "utf-16", "cp1252", "latin-1"]
    seen: set[str] = set()
    ordered_encodings: list[str] = []
    for enc in encoding_candidates:
        if enc and enc not in seen:
            ordered_encodings.append(enc)
            seen.add(enc)

    last_exc: Optional[Exception] = None
    for encoding in ordered_encodings:
        try:
            # Decode only a small prefix for delimiter sniffing (avoid doubling memory on big uploads).
            sample = dataset_bytes[:65536].decode(encoding, errors="replace")
            delimiter = _sniff_delimiter(sample)
            return pd.read_csv(
                io.BytesIO(dataset_bytes),
                low_memory=False,
                nrows=CSV_MAX_ROWS_SAMPLED,
                encoding=encoding,
                sep=delimiter,
                engine="python" if delimiter is None else "c",
            )
        except Exception as exc:  # noqa: BLE001 - fall back across encodings/parsers
            last_exc = exc
            continue

    if last_exc is not None:
        raise last_exc
    raise ValueError("Unable to read dataset bytes as a CSV/TSV file.")


@dataclass
class ColumnDiagnostics:
    name: str
    raw_null_pct: float
    effective_null_pct: float
    unique_count: int
    detected_type: Optional[str]
    quality_flag: Literal["clean", "warning", "critical"]
    sample_values: list[str]
    normalized_unique: list[str]
    looks_numeric_but_text: bool
    looks_date_but_text: bool
    numeric_negative_pct: float
    unique_ratio: float
    quality_reason: str


def build_analysis_artifacts(
    *,
    dataset_bytes: bytes,
    dataset_name: str,
    dashboard_attached: bool,
    dictionary_attached: bool,
    compliance_mode: str = "standard",
    dashboard_image_bytes: Optional[bytes] = None,
    data_dictionary_bytes: Optional[bytes] = None,
    audit_context: Optional[AuditContext] = None,
) -> tuple[ProfilerArtifact, IssuesArtifact, RemediationPlanArtifact, FinalReport]:
    sample_rows = audit_context.sample_rows if audit_context is not None else CSV_MAX_ROWS_SAMPLED
    # Analysts hate head-only samples (exports are often sorted). Default to random when user provided context.
    sampling_strategy = audit_context.sampling_strategy if audit_context is not None else "head"
    if audit_context is not None and (sampling_strategy == "head"):
        sampling_strategy = "random"
    stratify_column = audit_context.stratify_column if audit_context is not None else None
    recent_days = audit_context.recent_days if audit_context is not None else None
    time_column_hint = audit_context.time_column if audit_context is not None else None
    values_allowed = compliance_mode == "standard"
    multimodal_allowed = compliance_mode != "redacted"
    multimodal_requested = dashboard_attached or dictionary_attached
    effective_dashboard_attached = dashboard_attached and multimodal_allowed
    effective_dictionary_attached = dictionary_attached and multimodal_allowed

    dataframe, sampling_detail = _read_tabular_bytes_with_sampling(
        dataset_bytes,
        sampling_strategy=sampling_strategy,
        sample_rows=sample_rows,
        stratify_column=stratify_column,
        recent_days=recent_days,
        time_column_hint=time_column_hint,
    )

    diagnostics = [_profile_column(dataframe[column], column) for column in dataframe.columns]
    profiling_mode: Literal["tabular_only", "multimodal", "degraded_fallback"] = (
        "multimodal"
        if effective_dashboard_attached or effective_dictionary_attached
        else "degraded_fallback"
        if multimodal_requested and not multimodal_allowed
        else "tabular_only"
    )

    base_profiler_payload = {
        "dataset_name": dataset_name,
        "column_count": len(dataframe.columns),
        "row_count_sampled": len(dataframe),
        "columns": [
            {
                "name": item.name,
                "detected_type": item.detected_type,
                "quality_flag": item.quality_flag,
                "sample_values": item.sample_values if values_allowed else [],
            }
            for item in diagnostics
        ],
    }
    cross_modal_findings = build_multimodal_findings(
        dashboard_attached=dashboard_attached,
        dictionary_attached=dictionary_attached,
        dashboard_image_bytes=dashboard_image_bytes,
        data_dictionary_bytes=data_dictionary_bytes,
        profiler_payload=base_profiler_payload,
        compliance_mode=compliance_mode,
    )

    profiler = ProfilerArtifact(
        dataset_fingerprint=_fingerprint(dataset_bytes, dataset_name),
        profiling_mode=profiling_mode,
        row_count_sampled=len(dataframe),
        column_count=len(dataframe.columns),
        multimodal_context_used=effective_dashboard_attached or effective_dictionary_attached,
        sampling_strategy=sampling_strategy,
        sampling_detail=sampling_detail,
        coverage_summary=_coverage_summary(dataframe=dataframe, time_column_hint=time_column_hint),
        columns=[
            ProfiledColumn(
                name=item.name,
                declared_type=str(dataframe[item.name].dtype),
                detected_type=item.detected_type,
                null_pct=round(item.effective_null_pct, 4),
                raw_null_pct=round(item.raw_null_pct, 4),
                unique_count=item.unique_count,
                unique_ratio=round(item.unique_ratio, 4),
                quality_flag=item.quality_flag,
                sample_values=item.sample_values if values_allowed else [],
                quality_reason=item.quality_reason,
                phantom_dimension=False,
            )
            for item in diagnostics
        ],
        cross_modal_findings=cross_modal_findings,
        schema_quality_score=_schema_quality_score(diagnostics),
    )

    issues = _detect_issues(diagnostics, cross_modal_findings)
    remediation = _build_remediation(issues)
    report = _score_report(
        issues,
        dashboard_attached=effective_dashboard_attached,
        dictionary_attached=effective_dictionary_attached,
    )
    return profiler, issues, remediation, report


def _coverage_summary(*, dataframe: pd.DataFrame, time_column_hint: Optional[str]) -> str:
    """
    Quick trust builder: what does the sample actually cover?
    """
    parts = [f"Sample rows: {len(dataframe):,}"]
    if time_column_hint and time_column_hint in dataframe.columns:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            parsed = pd.to_datetime(dataframe[time_column_hint], errors="coerce")
        if parsed.notna().any():
            parts.append(f"Time coverage: {parsed.min().date()} → {parsed.max().date()} (from `{time_column_hint}`)")
    return " · ".join(parts)


def _read_tabular_bytes_with_sampling(
    dataset_bytes: bytes,
    *,
    sampling_strategy: str,
    sample_rows: int,
    stratify_column: Optional[str],
    recent_days: Optional[int],
    time_column_hint: Optional[str],
) -> tuple[pd.DataFrame, str]:
    """
    Read CSV bytes with a user-visible sampling strategy.

    Notes:
    - "head" is fastest and most predictable.
    - "random" uses reservoir sampling over streamed chunks for better representativeness.
    - "stratified" and "last_n_days" are implemented as best-effort approximations.
    """
    sample_rows = max(500, min(int(sample_rows or CSV_MAX_ROWS_SAMPLED), 100_000))
    strategy = sampling_strategy if sampling_strategy in {"head", "random", "stratified", "last_n_days"} else "head"

    encoding_candidates = [_guess_text_encoding(dataset_bytes), "utf-8-sig", "utf-16", "cp1252", "latin-1"]
    seen: set[str] = set()
    ordered_encodings: list[str] = []
    for enc in encoding_candidates:
        if enc and enc not in seen:
            ordered_encodings.append(enc)
            seen.add(enc)

    last_exc: Optional[Exception] = None
    for encoding in ordered_encodings:
        try:
            sample_text = dataset_bytes[:65536].decode(encoding, errors="replace")
            delimiter = _sniff_delimiter(sample_text)
            read_kwargs = dict(
                low_memory=False,
                encoding=encoding,
                sep=delimiter,
                engine="python" if delimiter is None else "c",
            )

            if strategy == "head":
                df = pd.read_csv(io.BytesIO(dataset_bytes), nrows=sample_rows, **read_kwargs)
                return df, f"Head sample: first {len(df):,} rows."

            if strategy == "random":
                df = _reservoir_sample_csv_bytes(dataset_bytes, read_kwargs=read_kwargs, sample_rows=sample_rows)
                return df, f"Random sample: {len(df):,} rows (reservoir sampled)."

            if strategy == "last_n_days":
                df = _last_n_days_sample_csv_bytes(
                    dataset_bytes,
                    read_kwargs=read_kwargs,
                    sample_rows=sample_rows,
                    recent_days=recent_days or 30,
                    time_column_hint=time_column_hint,
                )
                return df, f"Recent sample: {len(df):,} rows from last {recent_days or 30} days (best-effort)."

            # stratified (best-effort): sample by a chosen column when available
            df = _stratified_sample_csv_bytes(
                dataset_bytes,
                read_kwargs=read_kwargs,
                sample_rows=sample_rows,
                stratify_column=stratify_column,
            )
            return df, f"Stratified sample: {len(df):,} rows by {stratify_column or 'chosen field'} (best-effort)."
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            continue

    if last_exc is not None:
        raise last_exc
    raise ValueError("Unable to read dataset bytes as a CSV file.")


def _reservoir_sample_csv_bytes(
    dataset_bytes: bytes,
    *,
    read_kwargs: dict,
    sample_rows: int,
) -> pd.DataFrame:
    rng = random.Random(int(hashlib.sha256(dataset_bytes[:2048]).hexdigest(), 16) % (2**32))
    reservoir: list[dict] = []
    seen = 0
    for chunk in pd.read_csv(io.BytesIO(dataset_bytes), chunksize=50_000, **read_kwargs):
        for _, row in chunk.iterrows():
            seen += 1
            item = row.to_dict()
            if len(reservoir) < sample_rows:
                reservoir.append(item)
                continue
            j = rng.randrange(seen)
            if j < sample_rows:
                reservoir[j] = item
        if seen >= sample_rows and len(reservoir) >= sample_rows and seen > 500_000:
            # Soft stop for extreme files: keep the sample stable while avoiding huge runtime.
            break
    return pd.DataFrame.from_records(reservoir)


def _stratified_sample_csv_bytes(
    dataset_bytes: bytes,
    *,
    read_kwargs: dict,
    sample_rows: int,
    stratify_column: Optional[str],
) -> pd.DataFrame:
    # Best-effort: sample evenly across the top N groups found in early rows.
    df_head = pd.read_csv(io.BytesIO(dataset_bytes), nrows=max(sample_rows * 2, 10_000), **read_kwargs)
    if not stratify_column or stratify_column not in df_head.columns:
        return df_head.head(sample_rows)
    top = df_head[stratify_column].astype("string").fillna("NULL").value_counts().head(8).index.tolist()
    per_group = max(1, sample_rows // max(len(top), 1))
    frames = []
    for value in top:
        subset = df_head[df_head[stratify_column].astype("string").fillna("NULL") == value]
        frames.append(subset.head(per_group))
    merged = pd.concat(frames, ignore_index=True) if frames else df_head.head(sample_rows)
    return merged.head(sample_rows)


def _last_n_days_sample_csv_bytes(
    dataset_bytes: bytes,
    *,
    read_kwargs: dict,
    sample_rows: int,
    recent_days: int,
    time_column_hint: Optional[str],
) -> pd.DataFrame:
    df_head = pd.read_csv(io.BytesIO(dataset_bytes), nrows=max(sample_rows * 2, 20_000), **read_kwargs)
    if df_head.empty:
        return df_head
    candidates = [time_column_hint] if time_column_hint else []
    candidates += [c for c in df_head.columns if "date" in c.lower() or "time" in c.lower() or "dt" in c.lower()]
    candidates = [c for c in candidates if c in df_head.columns]
    if not candidates:
        return df_head.head(sample_rows)
    col = candidates[0]
    parsed = pd.to_datetime(df_head[col], errors="coerce")
    if parsed.notna().sum() == 0:
        return df_head.head(sample_rows)
    cutoff = parsed.max() - pd.Timedelta(days=int(recent_days))
    recent = df_head[parsed >= cutoff]
    if recent.empty:
        return df_head.head(sample_rows)
    return recent.head(sample_rows)


def _profile_column(series: pd.Series, name: str) -> ColumnDiagnostics:
    string_series = series.astype("string")
    stripped = string_series.str.strip()
    lower = stripped.str.lower()
    is_token_null = lower.isin(NULL_TOKENS).fillna(False)

    row_count = max(len(series), 1)
    raw_null_pct = float(series.isna().sum()) / row_count
    effective_null_pct = float((series.isna() | is_token_null).sum()) / row_count

    meaningful = stripped[~(series.isna() | is_token_null)].dropna()
    unique_count = int(meaningful.nunique(dropna=True)) if not meaningful.empty else 0
    sample_values = [str(value) for value in meaningful.head(5).tolist()]
    normalized_unique = [str(value).strip().lower() for value in meaningful.drop_duplicates().head(25).tolist()]

    detected_type, looks_numeric_but_text, looks_date_but_text, numeric_negative_pct = _detect_series_type(
        meaningful=meaningful,
        original=series,
        column_name=name,
    )
    unique_ratio = float(unique_count) / max(len(meaningful), 1)

    quality_flag: Literal["clean", "warning", "critical"] = "clean"
    quality_reason = "Column appears structurally healthy in the CSV-first pass."
    if effective_null_pct >= 0.95:
        quality_flag = "critical"
        quality_reason = "Column is effectively empty for most rows."
    elif UNLABELED_PATTERN.search(name):
        quality_flag = "critical"
        quality_reason = "Column name is too ambiguous for reliable semantic reasoning."
    elif looks_numeric_but_text:
        quality_flag = "warning"
        quality_reason = "Values look numeric but the column is stored as text."
    elif looks_date_but_text:
        quality_flag = "warning"
        quality_reason = "Values look date-like but the column is stored as free-form text."
    elif unique_count <= 1:
        quality_flag = "warning"
        quality_reason = "Column has little or no value variation."
    elif unique_ratio > 0.75 and not (('id' in name.lower()) or detected_type in {'integer', 'identifier_text'}):
        quality_flag = "warning"
        quality_reason = "Column behaves more like a high-cardinality text field than a stable dimension."
    elif effective_null_pct >= 0.25:
        quality_flag = "warning"
        quality_reason = "Column has a meaningful rate of null or null-like values."

    return ColumnDiagnostics(
        name=name,
        raw_null_pct=raw_null_pct,
        effective_null_pct=effective_null_pct,
        unique_count=unique_count,
        detected_type=detected_type,
        quality_flag=quality_flag,
        sample_values=sample_values,
        normalized_unique=normalized_unique,
        looks_numeric_but_text=looks_numeric_but_text,
        looks_date_but_text=looks_date_but_text,
        numeric_negative_pct=numeric_negative_pct,
        unique_ratio=unique_ratio,
        quality_reason=quality_reason,
    )


def _detect_series_type(
    *,
    meaningful: pd.Series,
    original: pd.Series,
    column_name: str,
) -> Tuple[Optional[str], bool, bool, float]:
    if meaningful.empty:
        return "empty", False, False, 0.0

    lower_name = column_name.lower()
    if pd.api.types.is_bool_dtype(original):
        return "boolean", False, False, 0.0
    if pd.api.types.is_integer_dtype(original):
        numeric = pd.to_numeric(meaningful, errors="coerce")
        negative_pct = float((numeric < 0).sum()) / max(len(numeric.dropna()), 1)
        return "integer", False, False, negative_pct
    if pd.api.types.is_float_dtype(original):
        numeric = pd.to_numeric(meaningful, errors="coerce")
        negative_pct = float((numeric < 0).sum()) / max(len(numeric.dropna()), 1)
        return "float", False, False, negative_pct
    if pd.api.types.is_datetime64_any_dtype(original):
        return "datetime", False, False, 0.0

    numeric = pd.to_numeric(meaningful, errors="coerce")
    numeric_ratio = float(numeric.notna().sum()) / max(len(meaningful), 1)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        parsed_dates = pd.to_datetime(meaningful, errors="coerce")
    date_ratio = float(parsed_dates.notna().sum()) / max(len(meaningful), 1)
    lowered = meaningful.astype(str).str.strip().str.lower()
    bool_ratio = float(lowered.isin({"true", "false", "yes", "no", "y", "n", "0", "1"}).sum()) / max(
        len(meaningful), 1
    )
    negative_pct = float((numeric < 0).sum()) / max(len(numeric.dropna()), 1) if numeric.notna().any() else 0.0

    if bool_ratio >= 0.9:
        return "boolean_like_text", False, False, 0.0
    if numeric_ratio >= 0.9:
        inferred = "numeric_text"
        if "id" in lower_name:
            inferred = "identifier_text"
        return inferred, True, False, negative_pct
    if date_ratio >= 0.75 or any(token in lower_name for token in DATE_LIKE_COLUMNS):
        return "date_text", False, True, 0.0
    if meaningful.nunique(dropna=True) <= 15:
        return "categorical_text", False, False, 0.0
    return "free_text", False, False, 0.0


def _detect_issues(diagnostics: list[ColumnDiagnostics], cross_modal_findings: list[CrossModalFinding]) -> IssuesArtifact:
    issues: list[Issue] = []

    for item in diagnostics:
        lower_name = item.name.lower()

        if UNLABELED_PATTERN.search(item.name):
            issues.append(
                Issue(
                    issue_id=f"{item.name}_unlabeled",
                    column_name=item.name,
                    severity="critical",
                    category="column_naming",
                    problem_description=f"Column `{item.name}` has no meaningful business label.",
                    business_impact="AI BI tools cannot reason reliably about ambiguous field names, so this column will be skipped, misunderstood, or hallucinated around.",
                )
            )

        if INSTRUCTIONISH_PATTERN.search(item.name):
            issues.append(
                Issue(
                    issue_id=f"{item.name}_instructionish_name",
                    column_name=item.name,
                    severity="critical",
                    category="security",
                    problem_description=f"Column `{item.name}` looks like a prompt-injection attempt rather than a business field name.",
                    business_impact="Treating this as normal metadata would make the semantic layer easier to manipulate and harder to trust.",
                )
            )

        if any(INSTRUCTIONISH_PATTERN.search(sample) for sample in item.sample_values):
            issues.append(
                Issue(
                    issue_id=f"{item.name}_instructionish_value",
                    column_name=item.name,
                    severity="critical",
                    category="security",
                    problem_description=f"Column `{item.name}` contains prompt-injection-shaped sample values.",
                    business_impact="Natural-language automation could misread this content as instructions unless the values are aggressively treated as untrusted data.",
                )
            )

        if item.effective_null_pct >= 0.95:
            issues.append(
                Issue(
                    issue_id=f"{item.name}_mostly_null",
                    column_name=item.name,
                    severity="medium",
                    category="completeness",
                    problem_description=f"Column `{item.name}` is effectively empty for most rows.",
                    business_impact="Sparse fields create misleading filters and noisy joins, and they rarely deserve a prominent place in a semantic model.",
                )
            )

        if item.looks_numeric_but_text and any(token in lower_name for token in NUMERIC_LIKE_COLUMNS):
            issues.append(
                Issue(
                    issue_id=f"{item.name}_numeric_text",
                    column_name=item.name,
                    severity="high",
                    category="type_integrity",
                    problem_description=f"Column `{item.name}` looks numeric but is stored as text.",
                    business_impact="Text-typed measures break aggregations, sorting, and numerical reasoning in BI tools and NL query layers.",
                )
            )

        if item.looks_date_but_text and any(token in lower_name for token in DATE_LIKE_COLUMNS):
            issues.append(
                Issue(
                    issue_id=f"{item.name}_date_text",
                    column_name=item.name,
                    severity="high",
                    category="date_handling",
                    problem_description=f"Column `{item.name}` looks like a date field but is stored as free-form text.",
                    business_impact="Date filters, time-series trends, and comparison logic can silently fail when the platform cannot trust a field as a real date.",
                )
            )

        if any(token in lower_name for token in STATUS_LIKE_COLUMNS) and item.unique_count >= 5:
            issues.append(
                Issue(
                    issue_id=f"{item.name}_status_chaos",
                    column_name=item.name,
                    severity="critical",
                    category="semantic_consistency",
                    problem_description=f"Column `{item.name}` has too many distinct values for a status-like field.",
                    business_impact="Users asking for a single operational state will miss records because the same concept is represented in multiple ways.",
                )
            )

        if any(token in lower_name for token in NUMERIC_LIKE_COLUMNS) and item.numeric_negative_pct >= 0.1:
            issues.append(
                Issue(
                    issue_id=f"{item.name}_negative_values",
                    column_name=item.name,
                    severity="medium",
                    category="business_logic",
                    problem_description=f"Column `{item.name}` contains a meaningful share of negative values.",
                    business_impact="Negative measures may be valid refunds or they may be sign errors. Either way, they need an explicit business rule before stakeholders trust the metric.",
                )
            )

        if item.unique_ratio > 0.85 and item.detected_type == "free_text":
            issues.append(
                Issue(
                    issue_id=f"{item.name}_free_text_dimension",
                    column_name=item.name,
                    severity="low",
                    category="modeling_risk",
                    problem_description=f"Column `{item.name}` behaves more like free text than a stable dimension.",
                    business_impact="High-cardinality text fields add noise to semantic layers and usually perform poorly as filterable business dimensions.",
                )
            )

    # Promote high-signal multimodal findings into issues so they impact score/remediation.
    for finding in cross_modal_findings:
        if finding.type.endswith("_context_attached"):
            continue
        if finding.type in {"multimodal_path_deferred", "multimodal_reasoning_disabled"}:
            continue
        if finding.severity not in {"critical", "high", "medium"}:
            continue
        category = finding.type

        issues.append(
            Issue(
                issue_id=f"multimodal_{finding.type}",
                column_name="semantic_layer",
                severity=finding.severity,
                category=category,
                problem_description=f"Multimodal check flagged: {finding.type.replace('_', ' ')}.",
                business_impact=finding.summary,
            )
        )

    deduped = {issue.issue_id: issue for issue in issues}
    ordered = sorted(deduped.values(), key=lambda issue: _severity_rank(issue.severity))
    return IssuesArtifact(issues=ordered, generator="deterministic")


def _build_remediation(issues: IssuesArtifact) -> RemediationPlanArtifact:
    fixes: list[RemediationFix] = []
    for index, issue in enumerate(issues.issues, start=1):
        fixes.append(
            RemediationFix(
                issue_id=issue.issue_id,
                priority=index,
                plain_english_fix=_plain_english_fix(issue),
                sql_snippet=_sql_fix(issue),
                python_snippet=_python_fix(issue),
            )
        )
    return RemediationPlanArtifact(fixes=fixes, generator="deterministic")


def _score_report(
    issues: IssuesArtifact,
    *,
    dashboard_attached: bool,
    dictionary_attached: bool,
) -> FinalReport:
    deductions = {"critical": 20, "high": 10, "medium": 5, "low": 2, "info": 0}
    category_bonus = {
        "grain_mismatch": 6,
        "phantom_dimension": 5,
        "metric_definition_ambiguity": 5,
        "missing_join_keys": 5,
        "naming_mismatch": 2,
        "semantic_layer": 3,
    }
    score_items = [
        ScoreComputationItem(
            issue_id=issue.issue_id,
            deduction=deductions[issue.severity] + category_bonus.get(issue.category, 0),
            reason=issue.problem_description,
        )
        for issue in issues.issues
    ]
    score = max(0, 100 - sum(item.deduction for item in score_items))

    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    elif score >= 50:
        grade = "D"
    else:
        grade = "F"

    evidence_coverage = _evidence_coverage(dashboard_attached, dictionary_attached)
    confidence_level = _confidence_level(evidence_coverage)

    # CSV-only runs are structurally useful but semantically provisional.
    if evidence_coverage == "csv_only":
        score = max(0, score - 5)
        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 50:
            grade = "D"
        else:
            grade = "F"

    blockers = [issue.problem_description for issue in issues.issues[:3]]
    verdict = _build_verdict(
        score=score,
        issues_present=bool(issues.issues),
        confidence_level=confidence_level,
        evidence_coverage=evidence_coverage,
    )

    return FinalReport(
        score=score,
        grade=grade,
        confidence_level=confidence_level,
        evidence_coverage=evidence_coverage,
        top_3_blockers=blockers,
        one_line_verdict=verdict,
        score_computation=score_items,
        generator="deterministic",
    )


def _plain_english_fix(issue: Issue) -> str:
    return {
        "column_naming": "Rename the field to a business-meaningful label and update downstream models to use the canonical name.",
        "completeness": "Either remove this field from the semantic layer or document exactly why it is empty so it does not appear as a trusted attribute.",
        "type_integrity": "Cast the field to a true numeric type in the transformation layer and validate that non-numeric values are handled explicitly.",
        "date_handling": "Normalize the field into a real date or timestamp before semantic modeling so filters and trends behave predictably.",
        "semantic_consistency": "Map all status variants into a single controlled vocabulary before exposing the field to business users.",
        "business_logic": "Decide whether negative values are legitimate exceptions or data errors, then encode that rule before reporting.",
        "modeling_risk": "Keep this field out of the primary semantic model unless you intentionally want a high-cardinality text search surface.",
        "security": "Treat this field as untrusted input and rename or quarantine it before it can influence model prompts or generated logic.",
        "semantic_layer": "Compare the dashboard and dictionary definitions against the CSV grain and keys, then update the semantic model so measures and joins match the documented business logic.",
        "grain_mismatch": "Align the semantic layer grain with the dashboard. If the CSV is row-level, aggregate into a stable fact table; if the dashboard is row-level, ensure the CSV includes the necessary keys and timestamps.",
        "phantom_dimension": "Either add the missing dimension to the dataset/model or remove it from the dashboard/semantic layer. Ensure the dimension has a stable key and a clear join path.",
        "metric_definition_ambiguity": "Standardize metric definitions in the dictionary (units, filters, aggregation) and implement them in the transformation layer so the dashboard and BI questions compute the same number.",
        "missing_join_keys": "Introduce stable identifiers and foreign keys for common joins (customer_id, order_id, employee_id). Document the key strategy and validate uniqueness/cardinality.",
        "naming_mismatch": "Create a canonical naming map between dashboard labels/dictionary terms and CSV columns. Rename columns or add semantic aliases so NL queries resolve reliably.",
    }.get(issue.category, "Apply a deterministic cleanup rule before exposing this field to reporting users.")


def _sql_fix(issue: Issue) -> str:
    column = issue.column_name
    if issue.category == "column_naming":
        return f"ALTER TABLE your_table RENAME COLUMN {column} TO business_meaningful_name;"
    if issue.category == "completeness":
        return f"SELECT {column} FROM your_table WHERE {column} IS NOT NULL LIMIT 50;"
    if issue.category == "type_integrity":
        return f"SELECT CAST({column} AS DECIMAL(18,2)) AS {column}_normalized FROM your_table;"
    if issue.category == "date_handling":
        return f"SELECT TO_DATE({column}, 'YYYY-MM-DD') AS {column}_date FROM your_table;"
    if issue.category == "semantic_consistency":
        return (
            f"CASE WHEN LOWER(TRIM({column})) IN ('active', '1', 'yes', 'true', 'enrolled') "
            f"THEN 'active' ELSE LOWER(TRIM({column})) END AS {column}_normalized"
        )
    if issue.category == "business_logic":
        return f"SELECT * FROM your_table WHERE {column} < 0;"
    return f"SELECT {column} FROM your_table LIMIT 100;"


def _python_fix(issue: Issue) -> str:
    column = issue.column_name
    if issue.category == "column_naming":
        return f"df = df.rename(columns={{'{column}': 'business_meaningful_name'}})"
    if issue.category == "completeness":
        return f"df = df.loc[df['{column}'].notna()].copy()"
    if issue.category == "type_integrity":
        return f"df['{column}'] = pd.to_numeric(df['{column}'], errors='coerce')"
    if issue.category == "date_handling":
        return f"df['{column}'] = pd.to_datetime(df['{column}'], errors='coerce')"
    if issue.category == "semantic_consistency":
        return (
            f"df['{column}'] = df['{column}'].astype(str).str.strip().str.lower().replace(" 
            "{'1': 'active', 'yes': 'active', 'true': 'active', 'enrolled': 'active'})"
        )
    if issue.category == "business_logic":
        return f"negative_{column} = df.loc[df['{column}'] < 0].copy()"
    return f"df['{column}'] = df['{column}'].astype(str)"


def _schema_quality_score(diagnostics: list[ColumnDiagnostics]) -> float:
    if not diagnostics:
        return 1.0
    weights = {"clean": 1.0, "warning": 0.65, "critical": 0.25}
    return round(sum(weights[item.quality_flag] for item in diagnostics) / len(diagnostics), 4)


def _fingerprint(dataset_bytes: bytes, dataset_name: str) -> str:
    digest = hashlib.sha256(dataset_bytes).hexdigest()[:16]
    return f"{dataset_name}:{digest}"


def _severity_rank(severity: str) -> int:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    return order[severity]


def _evidence_coverage(dashboard_attached: bool, dictionary_attached: bool) -> str:
    if dashboard_attached and dictionary_attached:
        return "csv_plus_dashboard_dictionary"
    if dashboard_attached:
        return "csv_plus_dashboard"
    if dictionary_attached:
        return "csv_plus_dictionary"
    return "csv_only"


def _confidence_level(evidence_coverage: str) -> str:
    if evidence_coverage == "csv_plus_dashboard_dictionary":
        return "high"
    if evidence_coverage in {"csv_plus_dashboard", "csv_plus_dictionary"}:
        return "medium"
    return "low"



def _build_verdict(
    *,
    score: int,
    issues_present: bool,
    confidence_level: str,
    evidence_coverage: str,
) -> str:
    if not issues_present:
        if confidence_level == "low":
            return (
                "Structural checks look healthy, but this remains a provisional readiness signal because only CSV evidence was provided."
            )
        return (
            "Structural checks look healthy and available semantic context supports a higher-confidence readiness signal."
        )

    if confidence_level == "low":
        return (
            "Structural issues were found. This score is provisional because semantic references were not provided; add a dashboard or dictionary for higher-confidence validation."
        )

    if score < 80:
        return (
            "Context-aware checks found material risks. Resolve blockers before exposing this semantic layer to AI BI copilots."
        )

    return (
        "The environment is directionally usable with contextual evidence, but there are still meaningful modeling risks to resolve before broad rollout."
    )
