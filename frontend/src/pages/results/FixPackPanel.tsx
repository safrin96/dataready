import { useCallback } from "react";

import { useAppSession } from "../../session/AppSessionContext";

function CopyButton({ text, label }: { text: string; label: string }) {
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore (clipboard permissions)
    }
  }, [text]);

  return (
    <button className="button-secondary" onClick={onCopy} type="button">
      Copy {label}
    </button>
  );
}

export function FixPackPanel() {
  const { response } = useAppSession();
  const fixPack = response?.fix_pack;

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Fix pack</p>
            <h3 className="panel-subtitle mt-2">Designed for handoff</h3>
          </div>
          {fixPack ? <span className="chip chip-muted shrink-0">{fixPack.generator === "llm_refined" ? "Gemini refined" : "Baseline"}</span> : null}
        </div>

        {fixPack ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <CopyButton label="cleanup SQL" text={fixPack.cleanup_sql} />
              <CopyButton label="validation SQL" text={fixPack.validation_sql} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="mini-card">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Cleanup SQL</p>
                <pre className="mt-3 max-h-[18rem] overflow-auto rounded-2xl bg-slate-950/95 p-4 text-xs leading-6 text-slate-100">
                  {fixPack.cleanup_sql}
                </pre>
              </article>

              <article className="mini-card">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Validation SQL</p>
                <pre className="mt-3 max-h-[18rem] overflow-auto rounded-2xl bg-slate-950/95 p-4 text-xs leading-6 text-slate-100">
                  {fixPack.validation_sql}
                </pre>
              </article>

              <article className="mini-card md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Acceptance criteria</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {fixPack.acceptance_criteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              {fixPack.definition_notes.length ? (
                <article className="mini-card md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Definition notes</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    {fixPack.definition_notes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          </div>
        ) : (
          <article className="empty-card">Run an audit to generate a fix pack.</article>
        )}
      </div>
    </div>
  );
}

