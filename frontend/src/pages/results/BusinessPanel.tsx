import { useAppSession } from "../../session/AppSessionContext";

export function BusinessPanel() {
  const { response } = useAppSession();
  const audit = response?.business_audit;
  const context = response?.request.audit_context;

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Business audit</p>
            <h3 className="panel-subtitle mt-2">Stakeholder-ready summary</h3>
          </div>
          {audit ? <span className="chip chip-muted shrink-0">{audit.generator === "llm_refined" ? "Gemini refined" : "Baseline"}</span> : null}
        </div>

        {audit ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What’s wrong</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                {audit.whats_wrong.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Decisions at risk</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                {audit.decisions_at_risk.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="mini-card md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Confidence</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{audit.confidence_summary}</p>
              {audit.missing_evidence.length ? (
                <>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What’s missing</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    {audit.missing_evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </article>
          </div>
        ) : (
          <article className="empty-card">
            Run an audit to generate a business-ready summary. Adding a report name + metric improves the output.
          </article>
        )}
      </div>

      {context ? (
        <div className="surface-subpanel">
          <div className="panel-card-head panel-card-head--compact">
            <div className="panel-card-head-main">
              <p className="section-kicker">Audit context</p>
              <h3 className="panel-subtitle mt-2">What you told DataReady</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Report</p>
              <p className="mt-2 text-sm text-slate-700">{context.report_name || "Not provided"}</p>
            </article>
            <article className="mini-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Metric</p>
              <p className="mt-2 text-sm text-slate-700">{context.metric_name || "Not provided"}</p>
            </article>
            <article className="mini-card md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Expected behavior</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{context.expected_behavior || "Not provided"}</p>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}

