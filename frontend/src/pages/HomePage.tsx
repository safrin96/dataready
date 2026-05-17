import { Link } from "react-router-dom";

const benefits = [
  {
    title: "Wrong-report diagnosis",
    text: "Start with the dashboard and metric stakeholders do not trust, then rank the likely causes.",
  },
  {
    title: "Evidence coverage",
    text: "Separate CSV-only checks from CSV + dashboard + dictionary evidence so confidence is visible.",
  },
  {
    title: "BI handoff pack",
    text: "SQL, dbt, Power Query, or semantic-layer notes with acceptance checks for approval.",
  },
  {
    title: "Export bundle",
    text: "Download audit JSON, issues CSV, fix pack, and a shareable ZIP bundle for engineering handoff.",
  },
];

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="surface-card">
        <p className="section-kicker">BI truth + AI readiness</p>
        <h1 className="panel-title mt-2">Fix the report nobody trusts</h1>
        <p className="panel-card-after max-w-3xl text-sm leading-7 text-slate-600">
          DataReady starts with the wrong dashboard, the suspect metric, and the evidence behind it. Gemini checks the
          CSV, screenshot, and dictionary for semantic drift, then produces a stakeholder-ready audit memo and fix pack.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {benefits.map((item) => (
            <article className="mini-card h-full" key={item.title}>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="button-primary inline-flex items-center justify-center no-underline" to="/upload">
            Diagnose a report
          </Link>
          <Link className="button-secondary inline-flex items-center justify-center no-underline" to="/results">
            Open audit workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
