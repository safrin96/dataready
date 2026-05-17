import {
  createContext,
  FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { analyzeDataset, exportAuditBundle, fetchHealthcheck, runDemo } from "../lib/api";
import type { AnalyzeResponse, Severity } from "../types/contracts";
import {
  complianceModes,
  MAX_VAULT_ENTRIES,
  THEME_STORAGE_KEY,
  type ComplianceModeValue,
  type VaultEntry,
  type VaultPayload,
  VAULT_STORAGE_KEY,
} from "./constants";
import { decryptVault, encryptVault } from "./vaultCrypto";

type ThemePreference = "light" | "dark";

const severityOrder: Severity[] = ["critical", "high", "medium", "low", "info"];

type AppSessionContextValue = {
  datasetName: string;
  setDatasetName: (value: string) => void;
  reportName: string;
  setReportName: (value: string) => void;
  metricName: string;
  setMetricName: (value: string) => void;
  expectedBehavior: string;
  setExpectedBehavior: (value: string) => void;
  grain: string;
  setGrain: (value: string) => void;
  joinKeys: string;
  setJoinKeys: (value: string) => void;
  timeColumn: string;
  setTimeColumn: (value: string) => void;
  definitionNotes: string;
  setDefinitionNotes: (value: string) => void;
  reportedValue: string;
  setReportedValue: (value: string) => void;
  expectedMin: string;
  setExpectedMin: (value: string) => void;
  expectedMax: string;
  setExpectedMax: (value: string) => void;
  targetStack: "snowflake" | "bigquery" | "databricks" | "powerbi" | "generic_sql";
  setTargetStack: (value: "snowflake" | "bigquery" | "databricks" | "powerbi" | "generic_sql") => void;
  fixDelivery: "sql_only" | "dbt_model_and_tests" | "power_query" | "semantic_layer_notes";
  setFixDelivery: (value: "sql_only" | "dbt_model_and_tests" | "power_query" | "semantic_layer_notes") => void;
  samplingStrategy: "head" | "random" | "stratified" | "last_n_days";
  setSamplingStrategy: (value: "head" | "random" | "stratified" | "last_n_days") => void;
  sampleRows: number;
  setSampleRows: (value: number) => void;
  stratifyColumn: string;
  setStratifyColumn: (value: string) => void;
  recentDays: number;
  setRecentDays: (value: number) => void;
  complianceMode: ComplianceModeValue;
  setComplianceMode: (value: ComplianceModeValue) => void;
  datasetFile: File | null;
  setDatasetFile: (file: File | null) => void;
  dashboardImage: File | null;
  setDashboardImage: (file: File | null) => void;
  dataDictionary: File | null;
  setDataDictionary: (file: File | null) => void;
  response: AnalyzeResponse | null;
  setResponse: (value: AnalyzeResponse | null) => void;
  statusMessage: string;
  setStatusMessage: (value: string) => void;
  isSubmitting: boolean;
  isExporting: boolean;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  workspacePassphrase: string;
  setWorkspacePassphrase: (value: string) => void;
  vaultUnlocked: boolean;
  vaultExists: boolean;
  vaultEntries: VaultEntry[];
  vaultNotice: string;
  setVaultNotice: (value: string) => void;
  sortedIssues: ReturnType<typeof sortIssues>;
  highlightedColumns: ReturnType<typeof pickHighlightedColumns>;
  modelMode: ModelMode | null;
  handleDemo: () => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleExportAuditJson: () => void;
  handleExportIssuesCsv: () => void;
  handleExportFixesJson: () => void;
  handleExportBundleZip: () => Promise<void>;
  handleExportBundleForEntry: (entry: VaultEntry) => Promise<void>;
  handleVaultSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleLockVault: () => void;
  handleRestoreEntry: (entry: VaultEntry) => void;
};

type ModelMode = {
  tone: "model-status-live" | "model-status-fallback";
  title: string;
  detail: string;
};

function sortIssues(response: AnalyzeResponse | null) {
  if (!response) {
    return [];
  }
  return [...response.issues.issues].sort((left, right) => {
    return severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity);
  });
}

function pickHighlightedColumns(response: AnalyzeResponse | null) {
  if (!response) {
    return [];
  }
  return [...response.profiler.columns]
    .sort((left, right) => {
      const rank = { critical: 0, warning: 1, clean: 2 };
      return rank[left.quality_flag] - rank[right.quality_flag];
    })
    .slice(0, 6);
}

function computeModelMode(response: AnalyzeResponse | null): ModelMode | null {
  if (!response) {
    return null;
  }
  const generators = [response.issues.generator, response.remediation.generator, response.report.generator];
  const allRefined = generators.every((generator) => generator === "llm_refined");

  if (allRefined) {
    return {
      tone: "model-status-live",
      title: "Gemini reasoning active",
      detail: response.reasoning_trace.note ?? "",
    };
  }

  if (response.reasoning_trace.path === "gemini") {
    return {
      tone: "model-status-live",
      title: "Gemini partial reasoning active",
      detail:
        response.reasoning_trace.note ??
        "At least one Gemini agent completed; deterministic checks filled the remaining steps.",
    };
  }

  if (response.reasoning_trace.path === "anthropic_benchmark") {
    return {
      tone: "model-status-fallback",
      title: "Gemini unavailable; alternate model path used",
      detail:
        response.reasoning_trace.note ??
        "Gemini did not complete this run, so DataReady used an alternate model path.",
    };
  }

  return {
    tone: "model-status-fallback",
    title: "Gemini unavailable; deterministic audit shown",
    detail:
      response.reasoning_trace.note ??
      "The report audit still ran, but Gemini refinement was not available for this request.",
  };
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [datasetName, setDatasetName] = useState("");
  const [reportName, setReportName] = useState("");
  const [metricName, setMetricName] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [grain, setGrain] = useState("");
  const [joinKeys, setJoinKeys] = useState("");
  const [timeColumn, setTimeColumn] = useState("");
  const [definitionNotes, setDefinitionNotes] = useState("");
  const [reportedValue, setReportedValue] = useState("");
  const [expectedMin, setExpectedMin] = useState("");
  const [expectedMax, setExpectedMax] = useState("");
  const [targetStack, setTargetStack] = useState<"snowflake" | "bigquery" | "databricks" | "powerbi" | "generic_sql">(
    "snowflake",
  );
  const [fixDelivery, setFixDelivery] = useState<
    "sql_only" | "dbt_model_and_tests" | "power_query" | "semantic_layer_notes"
  >("sql_only");
  const [samplingStrategy, setSamplingStrategy] = useState<"head" | "random" | "stratified" | "last_n_days">("random");
  const [sampleRows, setSampleRows] = useState(10_000);
  const [stratifyColumn, setStratifyColumn] = useState("");
  const [recentDays, setRecentDays] = useState(30);
  const [complianceMode, setComplianceMode] = useState<ComplianceModeValue>("standard");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [dashboardImage, setDashboardImage] = useState<File | null>(null);
  const [dataDictionary, setDataDictionary] = useState<File | null>(null);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState("Describe the wrong report, then add the source CSV.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");

  const [workspaceName, setWorkspaceName] = useState("Private workspace");
  const [workspacePassphrase, setWorkspacePassphrase] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [vaultNotice, setVaultNotice] = useState(
    "Unlock a private workspace to keep an encrypted history of your audits in this browser.",
  );

  const sortedIssues = useMemo(() => sortIssues(response), [response]);
  const highlightedColumns = useMemo(() => pickHighlightedColumns(response), [response]);
  const modelMode = useMemo(() => computeModelMode(response), [response]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemePreference(storedTheme);
    } else {
      const prefersDarkNow =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemePreference(prefersDarkNow ? "dark" : "light");
    }

    setVaultExists(Boolean(window.localStorage.getItem(VAULT_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = themePreference;
    document.documentElement.style.colorScheme = themePreference;
  }, [themePreference]);

  const saveToVault = useCallback(
    async (nextResponse: AnalyzeResponse, title: string) => {
      if (!vaultUnlocked || !workspacePassphrase.trim()) {
        setVaultNotice("Open the private workspace to save an encrypted history.");
        return;
      }

      const nextEntry: VaultEntry = {
        id: crypto.randomUUID(),
        title,
        createdAt: new Date().toISOString(),
        response: nextResponse,
      };
      const nextEntries = [nextEntry, ...vaultEntries].slice(0, MAX_VAULT_ENTRIES);
      const payload: VaultPayload = {
        version: 1,
        workspaceName: workspaceName.trim() || "Private workspace",
        entries: nextEntries,
      };

      const encrypted = await encryptVault(payload, workspacePassphrase);
      window.localStorage.setItem(VAULT_STORAGE_KEY, encrypted);
      setVaultEntries(nextEntries);
      setVaultExists(true);
      setVaultNotice(`Saved "${title}" to your encrypted workspace.`);
    },
    [vaultUnlocked, workspacePassphrase, vaultEntries, workspaceName],
  );

  const unlockVault = useCallback(async (name: string, passphrase: string) => {
    const stored = window.localStorage.getItem(VAULT_STORAGE_KEY);
    if (!stored) {
      const payload: VaultPayload = { version: 1, workspaceName: name, entries: [] };
      const encrypted = await encryptVault(payload, passphrase);
      window.localStorage.setItem(VAULT_STORAGE_KEY, encrypted);
      setVaultEntries([]);
      setVaultUnlocked(true);
      setVaultExists(true);
      setVaultNotice(`Created and unlocked "${name}". Your encrypted history starts here.`);
      return;
    }

    try {
      const decrypted = await decryptVault(stored, passphrase);
      setWorkspaceName(decrypted.workspaceName || name);
      setVaultEntries(decrypted.entries ?? []);
      setVaultUnlocked(true);
      setVaultExists(true);
      setVaultNotice(`Unlocked "${decrypted.workspaceName || name}". Encrypted history loaded.`);
    } catch (error) {
      setVaultNotice(error instanceof Error ? error.message : "Unable to unlock workspace.");
    }
  }, []);

  const handleDemo = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const demo = await runDemo();
      setResponse(demo);
      setStatusMessage(
        `Demo loaded. Score ${demo.report.score}, grade ${demo.report.grade}, ${demo.issues.issues.length} issue${demo.issues.issues.length === 1 ? "" : "s"}.`,
      );
      await saveToVault(demo, "Demo dataset");
      navigate("/results/report");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Demo request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, saveToVault]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!datasetFile) {
        setStatusMessage("Add the source CSV before running the report audit.");
        return;
      }

      try {
        const health = await fetchHealthcheck();
        if (health.mode !== "gemini_configured") {
          setStatusMessage(
            "Gemini unavailable. This flow is Gemini-first and will not run fallback-only audits. Configure Gemini and retry.",
          );
          return;
        }
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to confirm Gemini availability.");
        return;
      }

      const formData = new FormData();
      formData.append("audit_mode", dashboardImage || dataDictionary ? "semantic_audit" : "csv");
      formData.append("dataset_name", datasetName || datasetFile.name);
      formData.append("dataset_format", "csv");
      formData.append("compliance_mode", complianceMode);
      formData.append("require_gemini", "true");
      if (reportName.trim()) formData.append("report_name", reportName.trim());
      if (metricName.trim()) formData.append("metric_name", metricName.trim());
      if (expectedBehavior.trim()) formData.append("expected_behavior", expectedBehavior.trim());
      if (grain.trim()) formData.append("grain", grain.trim());
      if (joinKeys.trim()) formData.append("join_keys", joinKeys.trim());
      if (timeColumn.trim()) formData.append("time_column", timeColumn.trim());
      if (definitionNotes.trim()) formData.append("definition_notes", definitionNotes.trim());
      formData.append("target_stack", targetStack);
      formData.append("fix_delivery", fixDelivery);
      const parsedReported = Number(reportedValue);
      if (reportedValue.trim() && Number.isFinite(parsedReported)) {
        formData.append("reported_value", String(parsedReported));
      }
      const parsedMin = Number(expectedMin);
      if (expectedMin.trim() && Number.isFinite(parsedMin)) {
        formData.append("expected_min", String(parsedMin));
      }
      const parsedMax = Number(expectedMax);
      if (expectedMax.trim() && Number.isFinite(parsedMax)) {
        formData.append("expected_max", String(parsedMax));
      }
      formData.append("sampling_strategy", samplingStrategy);
      formData.append("sample_rows", String(sampleRows));
      if (samplingStrategy === "stratified" && stratifyColumn.trim()) {
        formData.append("stratify_column", stratifyColumn.trim());
      }
      if (samplingStrategy === "last_n_days") {
        formData.append("recent_days", String(recentDays));
      }
      formData.append("dataset_file", datasetFile);

      if (dashboardImage) {
        formData.append("dashboard_image", dashboardImage);
      }

      if (dataDictionary) {
        formData.append("data_dictionary", dataDictionary);
      }

      setIsSubmitting(true);
      try {
        const analyzeResponse = await analyzeDataset(formData);
        setResponse(analyzeResponse);
        setStatusMessage(
          `Score ${analyzeResponse.report.score}, grade ${analyzeResponse.report.grade}, ${analyzeResponse.issues.issues.length} issue${analyzeResponse.issues.issues.length === 1 ? "" : "s"}.`,
        );
        await saveToVault(analyzeResponse, datasetName || datasetFile.name);
        navigate("/results/report");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Analyze request failed.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      complianceMode,
      dashboardImage,
      dataDictionary,
      datasetFile,
      datasetName,
      definitionNotes,
      expectedMax,
      expectedMin,
      expectedBehavior,
      fixDelivery,
      grain,
      joinKeys,
      metricName,
      navigate,
      recentDays,
      reportedValue,
      reportName,
      sampleRows,
      samplingStrategy,
      saveToVault,
      stratifyColumn,
      targetStack,
      timeColumn,
    ],
  );

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

  function exportBaseName(current: AnalyzeResponse) {
    return (current.request.dataset_name || "dataready-audit")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  const handleExportAuditJson = useCallback(() => {
    if (!response) {
      return;
    }
    const payload = JSON.stringify(response, null, 2);
    const base = exportBaseName(response);
    downloadText(`${base || "dataready-audit"}.json`, payload + "\n", "application/json");
    setStatusMessage("Audit JSON exported.");
  }, [response]);

  const handleExportFixesJson = useCallback(() => {
    if (!response) {
      return;
    }
    const payload = JSON.stringify(response.remediation, null, 2);
    const base = exportBaseName(response);
    downloadText(`${base || "dataready-audit"}-fixes.json`, payload + "\n", "application/json");
    setStatusMessage("Fixes exported.");
  }, [response]);

  const handleExportIssuesCsv = useCallback(() => {
    if (!response) {
      return;
    }

    const header = ["issue_id", "severity", "category", "column_name", "problem_description", "business_impact"].join(",");
    const rows = response.issues.issues.map((issue) => {
      const values = [
        issue.issue_id,
        issue.severity,
        issue.category,
        issue.column_name ?? "",
        issue.problem_description,
        issue.business_impact,
      ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`);
      return values.join(",");
    });

    const base = exportBaseName(response);
    downloadText(`${base || "dataready-audit"}-issues.csv`, [header, ...rows].join("\n") + "\n", "text/csv");
    setStatusMessage("Issues CSV exported.");
  }, [response]);

  const handleExportBundleZip = useCallback(async () => {
    if (!response) {
      return;
    }
    setIsExporting(true);
    const base = exportBaseName(response) || "dataready-audit";
    try {
      const blob = await exportAuditBundle(response);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${base}-bundle.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatusMessage("Share pack exported.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }, [response]);

  const handleExportBundleForEntry = useCallback(
    async (entry: VaultEntry) => {
      setIsExporting(true);
      const base = (entry.response.request.dataset_name || entry.title || "dataready-audit")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "dataready-audit";
      try {
        const blob = await exportAuditBundle(entry.response);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${base}-share-pack.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatusMessage("Share pack exported.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Export failed.");
      } finally {
        setIsExporting(false);
      }
    },
    [setStatusMessage],
  );

  const handleVaultSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!workspacePassphrase.trim()) {
        setVaultNotice("Add a passphrase to unlock or create the encrypted workspace.");
        return;
      }

      await unlockVault(workspaceName.trim() || "Private workspace", workspacePassphrase);
    },
    [unlockVault, workspaceName, workspacePassphrase],
  );

  const handleLockVault = useCallback(() => {
    setWorkspacePassphrase("");
    setVaultUnlocked(false);
    setVaultEntries([]);
    setVaultNotice("Workspace locked locally. Your encrypted history stays in this browser.");
  }, []);

  const handleRestoreEntry = useCallback(
    (entry: VaultEntry) => {
      setResponse(entry.response);
      setStatusMessage(`Restored ${entry.title} from your private workspace.`);
      navigate("/results/report");
    },
    [navigate],
  );

  const value = useMemo(
    (): AppSessionContextValue => ({
      datasetName,
      setDatasetName,
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
      complianceMode,
      setComplianceMode,
      datasetFile,
      setDatasetFile,
      dashboardImage,
      setDashboardImage,
      dataDictionary,
      setDataDictionary,
      response,
      setResponse,
      statusMessage,
      setStatusMessage,
      isSubmitting,
      isExporting,
      themePreference,
      setThemePreference,
      workspaceName,
      setWorkspaceName,
      workspacePassphrase,
      setWorkspacePassphrase,
      vaultUnlocked,
      vaultExists,
      vaultEntries,
      vaultNotice,
      setVaultNotice,
      sortedIssues,
      highlightedColumns,
      modelMode,
      handleDemo,
      handleSubmit,
      handleExportAuditJson,
      handleExportIssuesCsv,
      handleExportFixesJson,
      handleExportBundleZip,
      handleExportBundleForEntry,
      handleVaultSubmit,
      handleLockVault,
      handleRestoreEntry,
    }),
    [
      complianceMode,
      dashboardImage,
      dataDictionary,
      datasetFile,
      datasetName,
      definitionNotes,
      expectedMax,
      expectedMin,
      fixDelivery,
      handleDemo,
      handleExportAuditJson,
      handleExportIssuesCsv,
      handleExportFixesJson,
      handleExportBundleZip,
      handleExportBundleForEntry,
      handleLockVault,
      handleRestoreEntry,
      handleSubmit,
      handleVaultSubmit,
      highlightedColumns,
      isSubmitting,
      isExporting,
      expectedBehavior,
      grain,
      joinKeys,
      metricName,
      modelMode,
      recentDays,
      reportedValue,
      reportName,
      response,
      sampleRows,
      samplingStrategy,
      sortedIssues,
      statusMessage,
      stratifyColumn,
      targetStack,
      themePreference,
      timeColumn,
      vaultEntries,
      vaultExists,
      vaultNotice,
      vaultUnlocked,
      workspaceName,
      workspacePassphrase,
    ],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return ctx;
}

export { complianceModes };
