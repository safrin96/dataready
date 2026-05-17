import { useAppSession } from "../../session/AppSessionContext";

export function ReportPanel() {
  const { modelMode, response, sortedIssues } = useAppSession();
  const multimodalFindings = response?.profiler.cross_modal_findings ?? [];

  return (
    <div className="mt-4 space-y-4" role="tabpanel">

      <div className="stat-grid">
        <article className="mini-card mini-card-stat mini-card-stat--score">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</p>
          <p className="stat-value mt-2 text-3xl font-semibold text-slate-950">{response?.report.score ?? "--"}</p>
        </article>
        <article className="mini-card mini-card-stat mini-card-stat--grade">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</p>
          <p className="stat-value mt-2 text-3xl font-semibold text-slate-950">{response?.report.grade ?? "--"}</p>
        </article>
        <article className="mini-card mini-card-stat mini-card-stat--confidence">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className="stat-value mt-2 text-3xl font-semibold text-slate-950">{response?.report.confidence_level ?? "--"}</p>
        </article>
        <article className="mini-card mini-card-stat">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-950">
            {response?.report.evidence_coverage.replace(/_/g, " ") ?? "--"}
          </p>
        </article>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Verdict</p>
        <p className="text-sm leading-7 text-slate-700">
          {response?.report.one_line_verdict ??
            "No verdict yet. Run the demo or submit an audit input to populate the decision surface."}
        </p>
      </div>

      {multimodalFindings.length ? (
        <div className="surface-subpanel">
          <div className="panel-card-head panel-card-head--compact">
            <div className="panel-card-head-main">
              <p className="section-kicker">Multimodal checks</p>
              <h3 className="panel-subtitle mt-2">Dashboard and dictionary signals</h3>
            </div>
            <span className="chip chip-muted shrink-0">{multimodalFindings.length} finding{multimodalFindings.length === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-4 space-y-3">
            {multimodalFindings.map((finding) => (
              <article className="blocker-card" key={`${finding.type}-${finding.summary}`}>
                <span aria-hidden="true" className="blocker-index">
                  M
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{finding.type}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{finding.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Top blockers</p>
            <h3 className="panel-subtitle mt-2">What needs attention</h3>
          </div>
          <span className="chip chip-muted shrink-0">
            {sortedIssues.length} issue{sortedIssues.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {(response?.report.top_3_blockers ?? []).length > 0 ? (
            response?.report.top_3_blockers.map((blocker, index) => (
              <article className="blocker-card" key={`${index}-${blocker}`}>
                <span aria-hidden="true" className="blocker-index">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-700">{blocker}</p>
              </article>
            ))
          ) : (
            <article className="empty-card">No blockers yet. Run an audit to populate results.</article>
          )}
        </div>
      </div>
    </div>
  );
}
