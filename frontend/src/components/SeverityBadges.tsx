import type { Severity } from "../types/contracts";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity-badge severity-${severity}`}>{severity}</span>;
}

export function SeverityPill({ qualityFlag }: { qualityFlag: "clean" | "warning" | "critical" }) {
  const map = {
    clean: "severity-info",
    warning: "severity-medium",
    critical: "severity-critical",
  } as const;
  return <span className={`severity-badge ${map[qualityFlag]}`}>{qualityFlag}</span>;
}
