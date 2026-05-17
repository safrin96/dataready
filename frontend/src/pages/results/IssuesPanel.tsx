import { SeverityBadge } from "../../components/SeverityBadges";
import { useAppSession } from "../../session/AppSessionContext";

export function IssuesPanel() {
  const { response, sortedIssues } = useAppSession();

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="panel-card-head panel-card-head--compact">
        <div className="panel-card-head-main">
          <p className="section-kicker">Issues</p>
          <h3 className="panel-subtitle mt-2">Issues and remediation</h3>
        </div>
        <span className="chip chip-muted shrink-0">
          {sortedIssues.length} issue{sortedIssues.length === 1 ? "" : "s"}
        </span>
      </div>

      {sortedIssues.length > 0 ? (
        <div className="space-y-4">
          {sortedIssues.map((issue) => {
            const fix = response?.remediation.fixes.find((item) => item.issue_id === issue.issue_id);
            return (
              <article className="issue-card" key={issue.issue_id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={issue.severity} />
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{issue.column_name}</p>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-950">{issue.problem_description}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{issue.business_impact}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {issue.category}
                  </span>
                </div>

                {fix ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="remediation-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plain-English fix</p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{fix.plain_english_fix}</p>
                    </div>
                    <div className="remediation-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">SQL snippet</p>
                      <pre className="code-block">{fix.sql_snippet}</pre>
                    </div>
                    <div className="remediation-card lg:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Python snippet</p>
                      <pre className="code-block">{fix.python_snippet}</pre>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <article className="empty-card">Run the demo or submit an audit to populate issues and fixes.</article>
      )}
    </div>
  );
}
