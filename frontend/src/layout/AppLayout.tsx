import { Suspense, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { fetchHealthcheck } from "../lib/api";
import { LazyShaderBackground } from "../components/visuals/LazyVisuals";
import { useAppSession } from "../session/AppSessionContext";

const navLinks = [
  { to: "/", label: "Overview", end: true as const },
  { to: "/upload", label: "Diagnose", end: true as const },
  { to: "/results", label: "Results", end: false as const },
];

const SIDEBAR_HIDDEN_KEY = "dataready:sidebar:hidden";

function pageTitle(pathname: string) {
  if (pathname.startsWith("/results")) return "Results";
  if (pathname.startsWith("/upload")) return "Diagnose";
  return "Overview";
}

export function AppLayout() {
  const { pathname } = useLocation();
  const { themePreference, setThemePreference } = useAppSession();
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [backendMode, setBackendMode] = useState<"unknown" | "fallback_only" | "gemini_configured" | "benchmark_configured">(
    "unknown",
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_HIDDEN_KEY);
    if (stored === null) {
      window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, "1");
      setSidebarHidden(true);
      return;
    }
    setSidebarHidden(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, sidebarHidden ? "1" : "0");
  }, [sidebarHidden]);

  useEffect(() => {
    let alive = true;
    fetchHealthcheck()
      .then((payload) => {
        if (!alive) return;
        if (payload && typeof payload === "object" && "mode" in payload) {
          setBackendMode((payload as { mode?: any }).mode ?? "unknown");
        }
      })
      .catch(() => {
        if (!alive) return;
        setBackendMode("unknown");
      });
    return () => {
      alive = false;
    };
  }, []);

  const title = useMemo(() => pageTitle(pathname), [pathname]);
  const modeChip = useMemo(() => {
    if (backendMode === "gemini_configured") return { label: "Gemini configured", tone: "chip-live" };
    if (backendMode === "benchmark_configured") return { label: "Benchmark ready", tone: "chip-benchmark" };
    if (backendMode === "fallback_only") return { label: "Gemini unavailable", tone: "chip-warn" };
    return { label: "Backend offline", tone: "chip-warn" };
  }, [backendMode]);

  return (
    <div className="app-root min-h-screen bg-canvas text-ink">
      <Suspense fallback={null}>
        <LazyShaderBackground />
      </Suspense>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className={`admin-shell ${sidebarHidden ? "admin-shell-sidebar-hidden" : ""}`}>
        <aside className="admin-sidebar" aria-label="Sidebar">
          <NavLink aria-label="DataReady home" className="admin-brand" to="/">
            <span className="admin-brand-logo">
              <img alt="" className="admin-logo-img" decoding="async" src="/brand/dataready-logo.png" />
            </span>
              <span className="admin-brand-copy">
                <span className="admin-brand-name">DataReady</span>
                <span className="admin-brand-sub">Report correctness audit</span>
              </span>
          </NavLink>

          <nav aria-label="Primary" className="admin-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                aria-label={link.label}
                className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link-active" : ""}`}
                end={link.end}
                to={link.to}
              >
                <span aria-hidden="true" className="admin-nav-icon">
                  {link.label === "Overview" ? (
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : link.label === "Diagnose" ? (
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path
                        d="M7 8l5-5 5 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M6 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M10 19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M14 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M18 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="admin-nav-link-label">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar-foot">
            <p className="admin-privacy">Uploads are processed in-memory and discarded after scoring.</p>
          </div>
        </aside>

        <header className="admin-topbar">
          <button
            aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
            className="admin-sidebar-toggle"
            onClick={() => setSidebarHidden((value) => !value)}
            type="button"
          >
            <span aria-hidden="true" className="admin-sidebar-toggle-icon">
              <svg viewBox="0 0 24 24" fill="none">
                {sidebarHidden ? (
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M15 6 9 12l6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </span>
          </button>

          <NavLink aria-label="DataReady" className="admin-topbar-brand" to="/">
            <span className="admin-topbar-brand-logo">
              <img alt="" className="admin-logo-img" decoding="async" src="/brand/dataready-logo.png" />
            </span>
          </NavLink>

          <div className="admin-topbar-title">
            <p className="admin-topbar-kicker">Workspace</p>
            <h1 className="admin-topbar-heading">{title}</h1>
          </div>

          <div className="admin-topbar-spacer" />

          <div className="admin-topbar-actions">
            <span className={`chip chip-muted ${modeChip.tone}`}>{modeChip.label}</span>
            <div className="theme-toggle" role="group" aria-label="Theme preference">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  aria-pressed={themePreference === mode}
                  className={`mode-button ${themePreference === mode ? "mode-button-active" : ""}`}
                  key={mode}
                  onClick={() => setThemePreference(mode)}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>

            <NavLink className="button-primary admin-cta" to="/upload">
              Diagnose report
            </NavLink>
          </div>
        </header>

        <main className="admin-main" id="main-content">
          <div className="admin-main-inner">
            <Outlet />

            <footer className="admin-footer text-sm text-slate-500">
              <div className="surface-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="font-medium text-slate-700">
                    DataReady processes uploads in-memory and discards them after scoring.
                  </p>
                  <nav aria-label="Footer" className="flex flex-wrap items-center gap-3">
                    <a className="footer-badge" href="https://ai.google.dev/" rel="noreferrer" target="_blank">
                      <span aria-hidden="true" className="footer-badge-icon footer-badge-icon--gemini">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 2l1.6 6.2L20 10l-6.4 1.8L12 18l-1.6-6.2L4 10l6.4-1.8L12 2z"
                            fill="currentColor"
                          />
                          <path
                            d="M19 14l.9 3.5L23 18l-3.1 1-.9 3.5-.9-3.5L15 18l3.1-.5L19 14z"
                            fill="currentColor"
                            opacity="0.75"
                          />
                        </svg>
                      </span>
                      <span>Gemini</span>
                    </a>
                    <a className="footer-badge" href="https://railway.app/" rel="noreferrer" target="_blank">
                      <span aria-hidden="true" className="footer-badge-icon footer-badge-icon--railway">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M.113 10.27A13.026 13.026 0 000 11.48h18.23c-.064-.125-.15-.237-.235-.347-3.117-4.027-4.793-3.677-7.19-3.78-.8-.034-1.34-.048-4.524-.048-1.704 0-3.555.005-5.358.01-.234.63-.459 1.24-.567 1.737h9.342v1.216H.113v.002zm18.26 2.426H.009c.02.326.05.645.094.961h16.955c.754 0 1.179-.429 1.315-.96zm-17.318 4.28s2.81 6.902 10.93 7.024c4.855 0 9.027-2.883 10.92-7.024H1.056zM11.988 0C7.5 0 3.593 2.466 1.531 6.108l4.75-.005v-.002c3.71 0 3.849.016 4.573.047l.448.016c1.563.052 3.485.22 4.996 1.364.82.621 2.007 1.99 2.712 2.965.654.902.842 1.94.396 2.934-.408.914-1.289 1.458-2.353 1.458H.391s.099.42.249.886h22.748A12.026 12.026 0 0024 12.005C24 5.377 18.621 0 11.988 0z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <span>Railway</span>
                    </a>
                    <a className="footer-badge" href="https://github.com/" rel="noreferrer" target="_blank">
                      <span aria-hidden="true" className="footer-badge-icon footer-badge-icon--github">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            fill="currentColor"
                            d="M12 .8C5.6.8.5 6 .5 12.5c0 5.2 3.3 9.6 7.9 11.2.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.8-.6 1.9-1 .2-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.4 1.2 1-.3 2-.4 3-.4s2.1.1 3 .4c2.4-1.5 3.4-1.2 3.4-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 2 1.2 3.3 0 4.6-2.7 5.6-5.3 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.6-1.6 7.9-6 7.9-11.2C23.5 6 18.4.8 12 .8z"
                          />
                        </svg>
                      </span>
                      <span>GitHub</span>
                    </a>
                  </nav>
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Disclaimer: DataReady scores are advisory and may not match your organization’s formal data quality policies.
                </p>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
