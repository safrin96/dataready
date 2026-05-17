from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AppMetadata(BaseModel):
    name: str
    version: str
    status: Literal["ok"]
    mode: Literal["fallback_only", "gemini_configured", "benchmark_configured"]


class AnalyzeRequestMetadata(BaseModel):
    audit_mode: Literal["csv", "schema", "semantic_audit", "demo"]
    dataset_name: str
    dataset_format: Literal["csv", "parquet", "sql_schema", "demo"]
    includes_dashboard_image: bool
    includes_data_dictionary: bool
    compliance_mode: Literal["standard", "schema_only", "redacted"]
    audit_context: Optional["AuditContext"] = None


class AuditContext(BaseModel):
    """
    Non-engineer friendly context that anchors the audit in BI/reporting language.
    These fields are optional so the CSV-first workflow remains fast.
    """

    report_name: Optional[str] = None
    metric_name: Optional[str] = None
    expected_behavior: Optional[str] = None

    grain: Optional[str] = None
    join_keys: Optional[str] = None
    time_column: Optional[str] = None
    definition_notes: Optional[str] = None

    # Reconciliation workflow (analyst-friendly).
    reported_value: Optional[float] = None
    expected_min: Optional[float] = None
    expected_max: Optional[float] = None

    # Where should fixes land?
    target_stack: Literal["snowflake", "bigquery", "databricks", "powerbi", "generic_sql"] = "snowflake"
    fix_delivery: Literal["sql_only", "dbt_model_and_tests", "power_query", "semantic_layer_notes"] = "sql_only"

    sampling_strategy: Literal["head", "random", "stratified", "last_n_days"] = "random"
    sample_rows: int = Field(default=10_000, ge=500, le=100_000)
    stratify_column: Optional[str] = None
    recent_days: Optional[int] = Field(default=None, ge=1, le=3650)


class ProfiledColumn(BaseModel):
    name: str
    declared_type: Optional[str]
    detected_type: Optional[str]
    null_pct: Optional[float]
    raw_null_pct: Optional[float] = None
    unique_count: Optional[int]
    unique_ratio: Optional[float] = None
    quality_flag: Literal["clean", "warning", "critical"]
    sample_values: list[str] = Field(default_factory=list)
    quality_reason: Optional[str] = None
    phantom_dimension: bool = False


class CrossModalFinding(BaseModel):
    type: str
    severity: Literal["critical", "high", "medium", "low"]
    summary: str


class ProfilerArtifact(BaseModel):
    dataset_fingerprint: str
    profiling_mode: Literal["tabular_only", "multimodal", "degraded_fallback"]
    row_count_sampled: Optional[int] = None
    column_count: Optional[int] = None
    multimodal_context_used: bool = False
    sampling_strategy: Optional[str] = None
    sampling_detail: Optional[str] = None
    coverage_summary: Optional[str] = None
    columns: list[ProfiledColumn]
    cross_modal_findings: list[CrossModalFinding]
    schema_quality_score: float


class Issue(BaseModel):
    issue_id: str
    column_name: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    category: str
    problem_description: str
    business_impact: str


class IssuesArtifact(BaseModel):
    issues: list[Issue]
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class RemediationFix(BaseModel):
    issue_id: str
    priority: int = Field(ge=1)
    plain_english_fix: str
    sql_snippet: str
    python_snippet: str


class RemediationPlanArtifact(BaseModel):
    fixes: list[RemediationFix]
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class ScoreComputationItem(BaseModel):
    issue_id: str
    deduction: int
    reason: str


class FinalReport(BaseModel):
    score: int = Field(ge=0, le=100)
    grade: Literal["A", "B", "C", "D", "F"]
    confidence_level: Literal["low", "medium", "high"]
    evidence_coverage: Literal[
        "csv_only",
        "csv_plus_dashboard",
        "csv_plus_dictionary",
        "csv_plus_dashboard_dictionary",
    ]
    top_3_blockers: list[str] = Field(default_factory=list, max_length=3)
    one_line_verdict: str
    score_computation: list[ScoreComputationItem]
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class ReasoningTrace(BaseModel):
    path: Literal["gemini", "anthropic_benchmark", "deterministic"]
    validator: Literal["llm", "deterministic", "skipped"]
    planner: Literal["llm", "deterministic", "skipped"]
    scorer: Literal["llm", "deterministic", "skipped"]
    note: Optional[str] = None


class BusinessAuditArtifact(BaseModel):
    whats_wrong: list[str] = Field(default_factory=list, max_length=3)
    decisions_at_risk: list[str] = Field(default_factory=list, max_length=3)
    confidence_summary: str
    missing_evidence: list[str] = Field(default_factory=list, max_length=4)
    stakeholder_summary: str
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class RootCauseRank(BaseModel):
    cause: str
    evidence_snippet: str
    confidence: int = Field(ge=0, le=100)
    questions_to_check_next: list[str] = Field(default_factory=list, max_length=4)


class ImpactMapArtifact(BaseModel):
    root_cause_ranking: list[RootCauseRank] = Field(default_factory=list, max_length=3)
    likely_root_causes: list[str] = Field(default_factory=list, max_length=5)
    risky_measures: list[str] = Field(default_factory=list, max_length=5)
    unsafe_dimensions: list[str] = Field(default_factory=list, max_length=5)
    risky_joins: list[str] = Field(default_factory=list, max_length=5)
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class FixPackArtifact(BaseModel):
    cleanup_sql: str
    validation_sql: str
    definition_notes: list[str] = Field(default_factory=list, max_length=8)
    acceptance_criteria: list[str] = Field(default_factory=list, max_length=10)
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class DictionaryColumnEntry(BaseModel):
    name: str
    evidence_level: Literal["observed", "inferred", "missing"] = "inferred"
    suggested_description: str
    suggested_type: Optional[str] = None
    allowed_values: list[str] = Field(default_factory=list, max_length=20)
    notes: Optional[str] = None


class DictionaryArtifact(BaseModel):
    columns: list[DictionaryColumnEntry]
    completeness_score: float = Field(default=0.0, ge=0.0, le=1.0)
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class ReconciliationArtifact(BaseModel):
    """
    A BI-friendly check: what number the user saw vs what DataReady can compute from the sample.
    """

    metric_name: str
    reported_value: Optional[float] = None
    expected_min: Optional[float] = None
    expected_max: Optional[float] = None
    computed_value: Optional[float] = None
    computed_method: str
    delta: Optional[float] = None
    within_expected_range: Optional[bool] = None
    notes: list[str] = Field(default_factory=list, max_length=6)
    generator: Literal["deterministic", "llm_refined"] = "deterministic"


class DataHandlingArtifact(BaseModel):
    """
    Plain-English privacy panel explaining what happens to uploads and what is sent to Gemini.
    """

    file_storage: str
    model_data_shared: str
    retention: str
    logs: str
    compliance_mode: Literal["standard", "schema_only", "redacted"]


class AnalyzeResponse(BaseModel):
    request: AnalyzeRequestMetadata
    profiler: ProfilerArtifact
    issues: IssuesArtifact
    remediation: RemediationPlanArtifact
    report: FinalReport
    business_audit: Optional[BusinessAuditArtifact] = None
    impact_map: Optional[ImpactMapArtifact] = None
    fix_pack: Optional[FixPackArtifact] = None
    dictionary: Optional[DictionaryArtifact] = None
    reconciliation: Optional[ReconciliationArtifact] = None
    data_handling: Optional[DataHandlingArtifact] = None
    reasoning_trace: ReasoningTrace


# Pydantic forward refs
AnalyzeRequestMetadata.model_rebuild()
