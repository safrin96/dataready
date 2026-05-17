import { useMemo } from "react";

import { useAppSession } from "../../session/AppSessionContext";

export function DictionaryPanel() {
  const { response, setStatusMessage } = useAppSession();
  const dictionary = response?.dictionary;

  const markdown = useMemo(() => {
    if (!dictionary) return "";
    const lines: string[] = [];
    lines.push(`# DataReady Dictionary`);
    lines.push("");
    if (response?.request.dataset_name) {
      lines.push(`Dataset: ${response.request.dataset_name}`);
      lines.push("");
    }
    lines.push(`| Column | Evidence | Type | Suggested description | Allowed values (sample) | Notes |`);
    lines.push(`| --- | --- | --- | --- | --- | --- |`);
    for (const col of dictionary.columns) {
      const allowed = (col.allowed_values || []).slice(0, 6).join(", ");
      lines.push(
        `| ${escapePipe(col.name)} | ${escapePipe(col.evidence_level || "inferred")} | ${escapePipe(col.suggested_type || "")} | ${escapePipe(
          col.suggested_description,
        )} | ${escapePipe(allowed)} | ${escapePipe(col.notes || "")} |`,
      );
    }
    lines.push("");
    return lines.join("\n");
  }, [dictionary, response?.request.dataset_name]);

  function escapePipe(value: string) {
    return String(value || "").replace(/\|/g, "\\|");
  }

  function downloadText(filename: string, contents: string, mime = "text/plain") {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="surface-subpanel">
        <div className="panel-card-head panel-card-head--compact">
          <div className="panel-card-head-main">
            <p className="section-kicker">Dictionary builder</p>
            <h3 className="panel-subtitle mt-2">Make custom schemas usable</h3>
          </div>
          {dictionary ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-muted shrink-0">{dictionary.generator === "llm_refined" ? "Gemini refined" : "Baseline"}</span>
              <span className="chip chip-muted shrink-0">{`Completeness ${(dictionary.completeness_score * 100).toFixed(0)}%`}</span>
              <button
                className="button-secondary"
                onClick={() => {
                  if (!dictionary) return;
                  const base = (response?.request.dataset_name || "dataready-dictionary")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                  downloadText(`${base || "dataready-dictionary"}.json`, JSON.stringify(dictionary, null, 2) + "\n", "application/json");
                  setStatusMessage("Dictionary JSON exported.");
                }}
                type="button"
              >
                Export JSON
              </button>
              <button
                className="button-secondary"
                onClick={() => {
                  if (!markdown) return;
                  const base = (response?.request.dataset_name || "dataready-dictionary")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                  downloadText(`${base || "dataready-dictionary"}.md`, markdown + "\n", "text/markdown");
                  setStatusMessage("Dictionary Markdown exported.");
                }}
                type="button"
              >
                Export Markdown
              </button>
            </div>
          ) : null}
        </div>

        {dictionary ? (
          <div className="dictionary-table-shell mt-4 overflow-auto">
            <table className="dictionary-table min-w-[54rem] w-full text-left text-sm">
              <thead className="dictionary-table-head text-xs font-semibold uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-4 py-3">Column</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Suggested description</th>
                  <th className="px-4 py-3">Allowed values (sample)</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {dictionary.columns.map((col) => (
                  <tr className="dictionary-table-row" key={col.name}>
                    <td className="dictionary-cell dictionary-cell-column px-4 py-3">{col.name}</td>
                    <td className="dictionary-cell px-4 py-3">{col.evidence_level}</td>
                    <td className="dictionary-cell px-4 py-3">{col.suggested_type || "--"}</td>
                    <td className="dictionary-cell dictionary-cell-description px-4 py-3">{col.suggested_description}</td>
                    <td className="dictionary-cell px-4 py-3">{(col.allowed_values || []).slice(0, 6).join(", ") || "--"}</td>
                    <td className="dictionary-cell px-4 py-3">{col.notes || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <article className="empty-card">Run an audit to generate a first-pass data dictionary.</article>
        )}
      </div>
    </div>
  );
}
