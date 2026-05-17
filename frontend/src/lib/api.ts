const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, "") : "";

export type AnalyzeMode = "csv" | "schema" | "semantic_audit" | "demo";
export type ComplianceMode = "standard" | "schema_only" | "redacted";
export type AppMetadata = {
  name: string;
  version: string;
  status: "ok";
  mode: "fallback_only" | "gemini_configured" | "benchmark_configured";
};

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      if (payload && typeof payload === "object" && "detail" in payload) {
        const detail = (payload as { detail?: unknown }).detail;
        if (typeof detail === "string" && detail.trim()) {
          return detail;
        }
      }
      return JSON.stringify(payload);
    } catch {
      // fall through to text
    }
  }
  return response.text().catch(() => "");
}

async function requestJson(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutMs = 120_000;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl(path), { ...init, signal: controller.signal });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message || `Request failed with status ${response.status}.`);
    }
    return response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        "This audit took too long to respond. Try again, or lower the sampled rows / upload a smaller CSV for faster profiling.",
      );
    }
    if (isNetworkError(error)) {
      throw new Error(
        "Backend could not be reached. Make sure the FastAPI server is running on port 8000, or set VITE_API_BASE_URL to the deployed API URL.",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchHealthcheck() {
  return requestJson("/api/health") as Promise<AppMetadata>;
}

export async function runDemo() {
  return requestJson("/api/demo", {
    method: "POST",
  });
}

export async function analyzeDataset(formData: FormData) {
  return requestJson("/api/analyze", {
    method: "POST",
    body: formData,
  });
}

export async function exportAuditBundle(payload: unknown) {
  const response = await fetch(apiUrl("/api/export/bundle"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed with status ${response.status}.`);
  }
  return response.blob();
}
