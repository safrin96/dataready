import type { AnalyzeResponse } from "../types/contracts";

export const complianceModes = [
  {
    value: "standard",
    label: "Standard audit",
    detail: "Sends schema, profiler stats, small sample values, and attached screenshot/PDF context to Gemini.",
  },
  {
    value: "schema_only",
    label: "Schema only",
    detail: "Sends schema and profiler statistics only. Row sample values are removed before model calls.",
  },
  {
    value: "redacted",
    label: "Redacted mode",
    detail: "Removes row sample values and disables multimodal screenshot/PDF reasoning for this run.",
  },
] as const;

export const THEME_STORAGE_KEY = "dataready:theme";
export const VAULT_STORAGE_KEY = "dataready:encrypted-workspace";
export const MAX_VAULT_ENTRIES = 12;

export type ComplianceModeValue = (typeof complianceModes)[number]["value"];

export type VaultEntry = {
  id: string;
  title: string;
  createdAt: string;
  response: AnalyzeResponse;
};

export type VaultPayload = {
  version: 1;
  workspaceName: string;
  entries: VaultEntry[];
};
