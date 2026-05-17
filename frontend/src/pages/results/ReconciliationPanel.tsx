import { useMemo } from "react";

import { useAppSession } from "../../session/AppSessionContext";

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

export function ReconciliationPanel() {
  const { response } = useAppSession();
  const recon = response?.reconciliation;

  const status = useMemo(() => {
    if (!recon) return null;
    if (recon.within_expected_range === true) return { label: "Within expected range" };
    if (recon.within_expected_range === false) return { label: "Outside expected range" };
    return { label: "Range not provided" };
  }, [recon]);

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Reconciliation</p>
            <h3 className="panel-subtitle mt-2">Sanity-check the number stakeholders see</h3>
          </div>
          {recon && status ? <span className="chip chip-muted shrink-0">{status.label}</span> : null}
        </div>

        {recon ? (
          <div className="mt-4 space-y-4">
            <div className="stat-grid">
              <article className="mini-card mini-card-stat">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Metric</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{recon.metric_name || "Metric"}</p>
              </article>
              <article className="mini-card mini-card-stat">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reported</p>
                <p className="stat-value mt-2 text-2xl font-semibold text-slate-950">{formatNumber(recon.reported_value)}</p>
              </article>
              <article className="mini-card mini-card-stat">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Computed (proxy)</p>
                <p className="stat-value mt-2 text-2xl font-semibold text-slate-950">{formatNumber(recon.computed_value)}</p>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="mini-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expected range</p>
                <p className="mt-2 text-sm text-slate-700">
                  {recon.expected_min !== null && recon.expected_min !== undefined ? formatNumber(recon.expected_min) : "--"} →{" "}
                  {recon.expected_max !== null && recon.expected_max !== undefined ? formatNumber(recon.expected_max) : "--"}
                </p>
              </article>
              <article className="mini-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delta</p>
                <p className="mt-2 text-sm text-slate-700">{formatNumber(recon.delta)}</p>
              </article>
              <article className="mini-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">How computed</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recon.computed_method}</p>
              </article>
            </div>

            {recon.notes?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                <div className="space-y-2">
                  {recon.notes.map((note, idx) => (
                    <article className="blocker-card" key={`${idx}-${note}`}>
                      <span aria-hidden="true" className="blocker-index">
                        i
                      </span>
                      <p className="text-sm leading-7 text-slate-700">{note}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <article className="empty-card">Run an audit to generate a reconciliation check.</article>
        )}
      </div>
    </div>
  );
}
