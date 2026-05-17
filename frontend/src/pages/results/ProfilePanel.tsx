import { SeverityPill } from "../../components/SeverityBadges";
import { useAppSession } from "../../session/AppSessionContext";

export function ProfilePanel() {
  const { highlightedColumns, response } = useAppSession();

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="panel-card-head panel-card-head--compact">
        <div className="panel-card-head-main">
          <p className="section-kicker">Profiler artifact</p>
          <h3 className="panel-subtitle mt-2">Dataset profile snapshot</h3>
        </div>
        {response ? <span className="chip chip-muted shrink-0">{response.profiler.profiling_mode}</span> : null}
      </div>

      <div className="stat-grid">
        <article className="mini-card mini-card-stat mini-card-stat--rows">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sampled rows</p>
          <p className="stat-value mt-2 text-2xl font-semibold text-slate-950">{response?.profiler.row_count_sampled ?? "--"}</p>
        </article>
        <article className="mini-card mini-card-stat mini-card-stat--cols">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Columns</p>
          <p className="stat-value mt-2 text-2xl font-semibold text-slate-950">{response?.profiler.column_count ?? "--"}</p>
        </article>
        <article className="mini-card mini-card-stat mini-card-stat--schema">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Schema quality</p>
          <p className="stat-value mt-2 text-2xl font-semibold text-slate-950">
            {response ? `${Math.round(response.profiler.schema_quality_score * 100)}%` : "--"}
          </p>
        </article>
      </div>

      {response?.profiler.coverage_summary ? (
        <div className="mini-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Coverage summary</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{response.profiler.coverage_summary}</p>
        </div>
      ) : null}

      {response?.profiler.cross_modal_findings.length ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Multimodal findings</p>
          {response.profiler.cross_modal_findings.map((finding) => (
            <article className="blocker-card" key={`${finding.type}-${finding.summary}`}>
              <span className="blocker-index" aria-hidden="true">
                M
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{finding.type}</p>
                <p className="mt-1 text-sm leading-7 text-slate-600">{finding.summary}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="table-shell">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="table-head text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Column</th>
              <th className="px-4 py-3">Detected type</th>
              <th className="px-4 py-3">Null %</th>
              <th className="px-4 py-3">Unique</th>
              <th className="px-4 py-3">Quality</th>
            </tr>
          </thead>
          <tbody>
            {highlightedColumns.length > 0 ? (
              highlightedColumns.map((column) => (
                <tr className="table-row" key={column.name}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{column.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{column.quality_reason ?? "No quality note."}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{column.detected_type ?? "--"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {column.null_pct !== null && column.null_pct !== undefined ? `${Math.round(column.null_pct * 100)}%` : "--"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{column.unique_count ?? "--"}</td>
                  <td className="px-4 py-3">
                    <SeverityPill qualityFlag={column.quality_flag} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Run an audit to populate the profiler artifact.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
