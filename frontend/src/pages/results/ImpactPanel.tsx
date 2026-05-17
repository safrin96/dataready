import { useAppSession } from "../../session/AppSessionContext";

function RootCauseCard({
  cause,
  confidence,
  evidence,
  questions,
  rank,
}: {
  cause: string;
  confidence: number;
  evidence: string;
  questions: string[];
  rank: number;
}) {
  return (
    <article className="blocker-card">
      <span aria-hidden="true" className="blocker-index">
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">Likely cause</p>
          <span className="chip chip-muted shrink-0">{confidence}% confidence</span>
        </div>
        <p className="mt-2 text-sm leading-7 text-slate-700">{cause}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence</p>
        <p className="mt-1 text-sm leading-7 text-slate-600">{evidence}</p>
        {questions.length ? (
          <>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Check next</p>
            <ul className="mt-1 space-y-1 text-sm leading-7 text-slate-600">
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mini-card">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-7 text-slate-600">No signals detected in this sample.</p>
      )}
    </article>
  );
}

export function ImpactPanel() {
  const { response } = useAppSession();
  const impact = response?.impact_map;
  const profiler = response?.profiler;
  const rootCauseRanking = impact?.root_cause_ranking ?? [];

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Evidence-backed root cause ranking</p>
            <h3 className="panel-subtitle mt-2">Top likely causes for the wrong metric</h3>
          </div>
          {profiler?.sampling_detail ? (
            <span className="chip chip-muted shrink-0" title={profiler.sampling_detail}>
              {profiler.sampling_strategy || "sample"}
            </span>
          ) : null}
        </div>

        {profiler?.sampling_detail ? (
          <p className="panel-card-after text-sm leading-6 text-slate-500">{profiler.sampling_detail}</p>
        ) : null}

        {impact ? (
          <div className="mt-4 space-y-4">
            {rootCauseRanking.length ? (
              <div className="space-y-3">
                {rootCauseRanking.map((item, index) => (
                  <RootCauseCard
                    cause={item.cause}
                    confidence={item.confidence}
                    evidence={item.evidence_snippet}
                    key={`${index}-${item.cause}`}
                    questions={item.questions_to_check_next}
                    rank={index + 1}
                  />
                ))}
              </div>
            ) : (
              <article className="empty-card">No root cause ranking available for this run.</article>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ListCard items={impact.risky_measures} title="Measures at risk" />
              <ListCard items={impact.unsafe_dimensions} title="Unsafe filters/dimensions" />
              <ListCard items={impact.risky_joins} title="Risky joins / keys" />
              <ListCard items={impact.likely_root_causes} title="Additional cause signals" />
            </div>
          </div>
        ) : (
          <article className="empty-card">Run an audit to generate an impact map.</article>
        )}
      </div>
    </div>
  );
}
