import { Link } from "react-router-dom";

import { FileField } from "../components/FileField";
import type { ComplianceModeValue } from "../session/constants";
import { complianceModes, useAppSession } from "../session/AppSessionContext";

export function UploadPage() {
  const {
    complianceMode,
    setComplianceMode,
    reportName,
    setReportName,
    metricName,
    setMetricName,
    expectedBehavior,
    setExpectedBehavior,
    grain,
    setGrain,
    joinKeys,
    setJoinKeys,
    timeColumn,
    setTimeColumn,
    definitionNotes,
    setDefinitionNotes,
    reportedValue,
    setReportedValue,
    expectedMin,
    setExpectedMin,
    expectedMax,
    setExpectedMax,
    targetStack,
    setTargetStack,
    fixDelivery,
    setFixDelivery,
    samplingStrategy,
    setSamplingStrategy,
    sampleRows,
    setSampleRows,
    stratifyColumn,
    setStratifyColumn,
    recentDays,
    setRecentDays,
    dashboardImage,
    setDashboardImage,
    dataDictionary,
    setDataDictionary,
    datasetFile,
    setDatasetFile,
    datasetName,
    setDatasetName,
    handleDemo,
    handleSubmit,
    isSubmitting,
    statusMessage,
  } = useAppSession();
  const selectedCompliance = complianceModes.find((mode) => mode.value === complianceMode);

  return (
    <div className="page-stack">
      <section className="surface-card" aria-label="Wrong report inputs">
          <div className="panel-card-head">
            <div className="panel-card-head-main">
              <p className="section-kicker">Report-first audit</p>
              <h1 className="panel-title mt-2">Diagnose the wrong report</h1>
            </div>
            <div className="panel-card-head-actions">
              <span className="chip chip-muted shrink-0">Gemini-first</span>
            </div>
          </div>

          <p className="panel-card-after text-sm leading-6 text-slate-500">
            Start with the BI asset and metric that are wrong. Then add the CSV, dashboard screenshot, and dictionary only
            as evidence. Limits: CSV 100 MB, dashboard image 20 MB, dictionary PDF 40 MB.
          </p>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="surface-subpanel">
              <div className="panel-card-head panel-card-head--compact">
                <div className="panel-card-head-main">
                  <p className="section-kicker">Input 1</p>
                  <h2 className="panel-subtitle mt-2">What report is wrong?</h2>
                </div>
                <span className="chip chip-muted shrink-0">Optional</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span className="field-label">Report/dashboard name</span>
                  <span className="field-help">Name the BI asset stakeholders do not trust.</span>
                  <input
                    className="field-input"
                    onChange={(event) => setReportName(event.target.value)}
                    placeholder="Weekly revenue dashboard"
                    value={reportName}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Which metric is wrong?</span>
                  <span className="field-help">Example: revenue, active users, conversion, churn.</span>
                  <input
                    className="field-input"
                    onChange={(event) => setMetricName(event.target.value)}
                    placeholder="Net revenue"
                    value={metricName}
                  />
                </label>
              </div>

              <label className="field mt-4">
                <span className="field-label">Expected behavior</span>
                <span className="field-help">What should be true when the report is correct?</span>
                <textarea
                  className="field-input min-h-[6rem] resize-y"
                  onChange={(event) => setExpectedBehavior(event.target.value)}
                  placeholder="Net revenue should exclude refunds, use invoice_date, and match finance within 1%."
                  value={expectedBehavior}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Run name</span>
              <span className="field-help">Used in export filenames and the audit report header.</span>
              <input
                className="field-input"
                onChange={(event) => setDatasetName(event.target.value)}
                placeholder="May revenue report audit"
                value={datasetName}
              />
            </label>

            <FileField
              accept=".csv"
              helper="Required. Source extract for the report or metric."
              label="Source CSV"
              onChange={setDatasetFile}
              selectedFile={datasetFile}
            />
            <FileField
              accept="image/*"
              helper="Optional. Enables visual-semantic checks against report labels and charts."
              label="Dashboard screenshot"
              onChange={setDashboardImage}
              selectedFile={dashboardImage}
            />
            <FileField
              accept=".pdf"
              helper="Optional. Adds metric definitions, grain, joins, and allowed values."
              label="Data dictionary PDF"
              onChange={setDataDictionary}
              selectedFile={dataDictionary}
            />

            <div className="surface-subpanel">
              <div className="panel-card-head panel-card-head--compact">
                <div className="panel-card-head-main">
                  <p className="section-kicker">Semantic context</p>
                  <h2 className="panel-subtitle mt-2">Tell DataReady how the report should work</h2>
                </div>
                <span className="chip chip-muted shrink-0">Optional</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span className="field-label">Grain</span>
                  <span className="field-help">Example: “one row per order”.</span>
                  <input
                    className="field-input"
                    onChange={(event) => setGrain(event.target.value)}
                    placeholder="One row per student enrollment"
                    value={grain}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Join keys</span>
                  <span className="field-help">What identifiers should join across tables?</span>
                  <input
                    className="field-input"
                    onChange={(event) => setJoinKeys(event.target.value)}
                    placeholder="student_id, employer_id"
                    value={joinKeys}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Time field</span>
                  <span className="field-help">Which date defines the metric?</span>
                  <input
                    className="field-input"
                    onChange={(event) => setTimeColumn(event.target.value)}
                    placeholder="enrollment_date"
                    value={timeColumn}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Definition notes</span>
                  <span className="field-help">Filters/units/refunds included?</span>
                  <input
                    className="field-input"
                    onChange={(event) => setDefinitionNotes(event.target.value)}
                    placeholder="Treat TRUE/yes/1 as active; refunds are negative revenue."
                    value={definitionNotes}
                  />
                </label>
              </div>
            </div>

            <div className="surface-subpanel">
              <div className="panel-card-head panel-card-head--compact">
                <div className="panel-card-head-main">
                  <p className="section-kicker">Input 2</p>
                  <h2 className="panel-subtitle mt-2">Reported value and handoff mode</h2>
                </div>
                <span className="chip chip-muted shrink-0">Recommended</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="field">
                  <span className="field-label">Reported value (from the dashboard)</span>
                  <span className="field-help">Optional exact number shown in the visual.</span>
                  <input
                    className="field-input"
                    inputMode="decimal"
                    onChange={(event) => setReportedValue(event.target.value)}
                    placeholder="1234567"
                    value={reportedValue}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Expected min</span>
                  <span className="field-help">Optional range for sanity-checking.</span>
                  <input
                    className="field-input"
                    inputMode="decimal"
                    onChange={(event) => setExpectedMin(event.target.value)}
                    placeholder="1200000"
                    value={expectedMin}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Expected max</span>
                  <span className="field-help">Optional range for sanity-checking.</span>
                  <input
                    className="field-input"
                    inputMode="decimal"
                    onChange={(event) => setExpectedMax(event.target.value)}
                    placeholder="1300000"
                    value={expectedMax}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span className="field-label">Target stack</span>
                  <span className="field-help">Used to tailor SQL and approval notes.</span>
                  <select
                    className="field-input"
                    onChange={(event) => setTargetStack(event.target.value as typeof targetStack)}
                    value={targetStack}
                  >
                    <option value="snowflake">Snowflake</option>
                    <option value="bigquery">BigQuery</option>
                    <option value="databricks">Databricks</option>
                    <option value="powerbi">Power BI</option>
                    <option value="generic_sql">Generic SQL</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Fix pack format</span>
                  <span className="field-help">Choose what the BI owner can approve.</span>
                  <select
                    className="field-input"
                    onChange={(event) => setFixDelivery(event.target.value as typeof fixDelivery)}
                    value={fixDelivery}
                  >
                    <option value="sql_only">SQL only</option>
                    <option value="dbt_model_and_tests">dbt model + tests</option>
                    <option value="power_query">Power Query steps</option>
                    <option value="semantic_layer_notes">Semantic layer notes</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="surface-subpanel">
              <div className="panel-card-head panel-card-head--compact">
                <div className="panel-card-head-main">
                  <p className="section-kicker">Sampling credibility</p>
                  <h2 className="panel-subtitle mt-2">Control what the sample covers</h2>
                </div>
                <span className="chip chip-muted shrink-0">Recommended</span>
              </div>

              <div className="sampling-grid mt-4 grid gap-4 md:grid-cols-3">
                <label className="field md:col-span-1">
                  <span className="field-label">Strategy</span>
                  <span className="field-help sampling-field-help">
                    Random is default. Last N days and stratified help explain coverage.
                  </span>
                  <select
                    className="field-input"
                    onChange={(event) => setSamplingStrategy(event.target.value as typeof samplingStrategy)}
                    value={samplingStrategy}
                  >
                    <option value="random">Random (reservoir)</option>
                    <option value="head">Head (first rows)</option>
                    <option value="stratified">Stratified (best-effort)</option>
                    <option value="last_n_days">Last N days (best-effort)</option>
                  </select>
                </label>

                <label className="field md:col-span-1">
                  <span className="field-label">Rows sampled</span>
                  <span className="field-help sampling-field-help">Higher values take longer.</span>
                  <select
                    className="field-input"
                    onChange={(event) => setSampleRows(Number(event.target.value))}
                    value={sampleRows}
                  >
                    <option value={10000}>10,000</option>
                    <option value={25000}>25,000</option>
                    <option value={50000}>50,000</option>
                    <option value={100000}>100,000</option>
                  </select>
                </label>

                {samplingStrategy === "stratified" ? (
                  <label className="field md:col-span-1">
                    <span className="field-label">Stratify by</span>
                    <span className="field-help">Example: region, status, product.</span>
                    <input
                      className="field-input"
                      onChange={(event) => setStratifyColumn(event.target.value)}
                      placeholder="region"
                      value={stratifyColumn}
                    />
                  </label>
                ) : samplingStrategy === "last_n_days" ? (
                  <label className="field md:col-span-1">
                    <span className="field-label">Recent window (days)</span>
                    <span className="field-help">Uses your time field hint when provided.</span>
                    <input
                      className="field-input"
                      inputMode="numeric"
                      onChange={(event) => setRecentDays(Number(event.target.value))}
                      type="number"
                      value={recentDays}
                    />
                  </label>
                ) : (
                  <div className="field md:col-span-1" aria-hidden="true" />
                )}
              </div>
            </div>

            <label className="field">
              <span className="field-label">Compliance mode</span>
              <span className="field-help">
                Controls what is sent to Gemini. Current selection: {selectedCompliance?.label ?? "Standard audit"}.
              </span>
              <select
                className="field-input"
                onChange={(event) => setComplianceMode(event.target.value as ComplianceModeValue)}
                value={complianceMode}
              >
                {complianceModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              {selectedCompliance ? <span className="field-help">{selectedCompliance.detail}</span> : null}
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Running report audit..." : "Run report audit"}
              </button>
              <button className="button-secondary" disabled={isSubmitting} onClick={handleDemo} type="button">
                Try scripted demo
              </button>
            </div>
          </form>

          <div aria-live="polite" className="status-banner mt-6" role="status">
            <div aria-hidden="true" className="status-banner-dot" />
            <p>{statusMessage}</p>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            After a successful run you will land on{" "}
            <Link className="text-ink underline-offset-2 hover:underline" to="/results/report">
              Results → Report
            </Link>
            .
          </p>
      </section>
    </div>
  );
}
