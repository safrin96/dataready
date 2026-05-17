import { useAppSession } from "../../session/AppSessionContext";

export function TrustPanel() {
  const { response } = useAppSession();
  const handling = response?.data_handling;
  const profiler = response?.profiler;

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Trust</p>
            <h3 className="panel-subtitle mt-2">Privacy, sampling, and what goes to Gemini</h3>
          </div>
          {handling ? <span className="chip chip-muted shrink-0">{handling.compliance_mode}</span> : null}
        </div>

        {profiler ? (
          <article className="mini-card mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What this sample covers</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {profiler.coverage_summary || "Coverage summary unavailable for this run."}
            </p>
            {profiler.sampling_detail ? (
              <p className="mt-2 text-sm leading-7 text-slate-600">{profiler.sampling_detail}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip chip-muted">{profiler.sampling_strategy || "sample"}</span>
              <span className="chip chip-muted">{(profiler.row_count_sampled ?? 0).toLocaleString()} rows</span>
              <span className="chip chip-muted">
                {profiler.multimodal_context_used ? "multimodal evidence used" : "CSV evidence only"}
              </span>
            </div>
          </article>
        ) : null}

        {handling ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">File handling</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{handling.file_storage}</p>
            </article>
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Model data shared</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{handling.model_data_shared}</p>
            </article>
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Retention</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{handling.retention}</p>
            </article>
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Logs</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{handling.logs}</p>
            </article>
          </div>
        ) : (
          <article className="empty-card">Run an audit to see the privacy + compliance summary for this run.</article>
        )}
      </div>
    </div>
  );
}
