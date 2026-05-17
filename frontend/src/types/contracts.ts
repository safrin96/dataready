export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Issue {
  issue_id: string;
  column_name: string;
  severity: Severity;
  category: string;
  problem_description: string;
  business_impact: string;
}

export interface RemediationFix {
  issue_id: string;
  priority: number;
  plain_english_fix: string;
  sql_snippet: string;
  python_snippet: string;
}

export interface AnalyzeResponse {
  request: {
    audit_mode: "csv" | "schema" | "semantic_audit" | "demo";
    dataset_name: string;
    dataset_format: "csv" | "parquet" | "sql_schema" | "demo";
    includes_dashboard_image: boolean;
    includes_data_dictionary: boolean;
    compliance_mode: "standard" | "schema_only" | "redacted";
    audit_context: null | {
      report_name: string | null;
      metric_name: string | null;
      expected_behavior: string | null;
      grain: string | null;
      join_keys: string | null;
      time_column: string | null;
      definition_notes: string | null;
      reported_value: number | null;
      expected_min: number | null;
      expected_max: number | null;
      target_stack: "snowflake" | "bigquery" | "databricks" | "powerbi" | "generic_sql";
      fix_delivery: "sql_only" | "dbt_model_and_tests" | "power_query" | "semantic_layer_notes";
      sampling_strategy: "head" | "random" | "stratified" | "last_n_days";
      sample_rows: number;
      stratify_column: string | null;
      recent_days: number | null;
    };
  };
  profiler: {
    dataset_fingerprint: string;
    profiling_mode: "tabular_only" | "multimodal" | "degraded_fallback";
    row_count_sampled: number | null;
    column_count: number | null;
    multimodal_context_used: boolean;
    sampling_strategy: string | null;
    sampling_detail: string | null;
    coverage_summary: string | null;
    columns: Array<{
      name: string;
      declared_type: string | null;
      detected_type: string | null;
      null_pct: number | null;
      raw_null_pct: number | null;
      unique_count: number | null;
      unique_ratio: number | null;
      quality_flag: "clean" | "warning" | "critical";
      sample_values: string[];
      quality_reason: string | null;
      phantom_dimension: boolean;
    }>;
    cross_modal_findings: Array<{
      type: string;
      severity: Exclude<Severity, "info">;
      summary: string;
    }>;
    schema_quality_score: number;
  };
  issues: {
    issues: Issue[];
    generator: "deterministic" | "llm_refined";
  };
  remediation: {
    fixes: RemediationFix[];
    generator: "deterministic" | "llm_refined";
  };
  report: {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    confidence_level: "low" | "medium" | "high";
    evidence_coverage:
      | "csv_only"
      | "csv_plus_dashboard"
      | "csv_plus_dictionary"
      | "csv_plus_dashboard_dictionary";
    top_3_blockers: string[];
    one_line_verdict: string;
    score_computation: Array<{
      issue_id: string;
      deduction: number;
      reason: string;
    }>;
    generator: "deterministic" | "llm_refined";
  };
  business_audit: null | {
    whats_wrong: string[];
    decisions_at_risk: string[];
    confidence_summary: string;
    missing_evidence: string[];
    stakeholder_summary: string;
    generator: "deterministic" | "llm_refined";
  };
  impact_map: null | {
    root_cause_ranking: Array<{
      cause: string;
      evidence_snippet: string;
      confidence: number;
      questions_to_check_next: string[];
    }>;
    likely_root_causes: string[];
    risky_measures: string[];
    unsafe_dimensions: string[];
    risky_joins: string[];
    generator: "deterministic" | "llm_refined";
  };
  fix_pack: null | {
    cleanup_sql: string;
    validation_sql: string;
    definition_notes: string[];
    acceptance_criteria: string[];
    generator: "deterministic" | "llm_refined";
  };
  dictionary: null | {
    columns: Array<{
      name: string;
      evidence_level: "observed" | "inferred" | "missing";
      suggested_description: string;
      suggested_type: string | null;
      allowed_values: string[];
      notes: string | null;
    }>;
    completeness_score: number;
    generator: "deterministic" | "llm_refined";
  };
  reconciliation: null | {
    metric_name: string;
    reported_value: number | null;
    expected_min: number | null;
    expected_max: number | null;
    computed_value: number | null;
    computed_method: string;
    delta: number | null;
    within_expected_range: boolean | null;
    notes: string[];
    generator: "deterministic" | "llm_refined";
  };
  data_handling: null | {
    file_storage: string;
    model_data_shared: string;
    retention: string;
    logs: string;
    compliance_mode: "standard" | "schema_only" | "redacted";
  };
  reasoning_trace: {
    path: "gemini" | "anthropic_benchmark" | "deterministic";
    validator: "llm" | "deterministic" | "skipped";
    planner: "llm" | "deterministic" | "skipped";
    scorer: "llm" | "deterministic" | "skipped";
    note: string | null;
  };
}
