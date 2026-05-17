import { NavLink, Outlet } from "react-router-dom";

import { useAppSession } from "../../session/AppSessionContext";

const tabs = [
  { to: "report", label: "Report" },
  { to: "reconcile", label: "Reconcile" },
  { to: "trust", label: "Trust" },
  { to: "business", label: "Business" },
  { to: "impact", label: "Impact" },
  { to: "fix-pack", label: "Fix Pack" },
  { to: "dictionary", label: "Dictionary" },
  { to: "profile", label: "Profile" },
  { to: "issues", label: "Issues" },
] as const;

export function ResultsLayout() {
  const {
    handleExportAuditJson,
    handleExportBundleZip,
    handleExportFixesJson,
    handleExportIssuesCsv,
    isExporting,
    response,
  } = useAppSession();

  return (
    <div className="page-stack">
      <section className="surface-card app-panel-full" aria-label="Results">
        <div className="panel-card-head">
          <div className="panel-card-head-main">
            <p className="section-kicker">Results</p>
            <h2 className="panel-title mt-2">Report console</h2>
          </div>
          <div className="panel-card-head-actions">
            <div className="flex flex-wrap items-center gap-2">
              <button className="button-secondary" disabled={!response} onClick={handleExportAuditJson} type="button">
                Export audit JSON
              </button>
              <button className="button-secondary" disabled={!response} onClick={handleExportIssuesCsv} type="button">
                Export issues CSV
              </button>
              <button className="button-secondary" disabled={!response} onClick={handleExportFixesJson} type="button">
                Export fixes JSON
              </button>
              <button
                className="button-secondary"
                disabled={!response || isExporting}
                onClick={handleExportBundleZip}
                type="button"
              >
                {isExporting ? "Preparing share pack..." : "Export share pack ZIP"}
              </button>
            </div>
          </div>
        </div>

        <div className="app-tabs panel-card-after" role="tablist" aria-label="Result panels">
          {tabs.map((tab) => (
            <NavLink
              className={({ isActive }) => `tab-button ${isActive ? "tab-button-active" : ""}`}
              end
              key={tab.to}
              role="tab"
              to={tab.to}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </section>
    </div>
  );
}
