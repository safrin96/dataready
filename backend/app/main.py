from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.analyze import router as analyze_router
from app.models.contracts import AppMetadata


app = FastAPI(
    title="DataReady API",
    version="0.1.0",
    description="Backend API for the DataReady semantic-layer audit system.",
)

raw_origins = os.getenv(
    "DATAREADY_CORS_ALLOW_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
allow_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    # We don't use cookies for auth; credentials should remain off to reduce CSRF surface.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)

@app.middleware("http")
async def add_privacy_headers(request: Request, call_next) -> Response:
    response: Response = await call_next(request)
    # Audit responses can include sensitive derived insights. Prevent caching by browsers/proxies.
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault("Pragma", "no-cache")

    # Baseline security headers for the SPA + API.
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    )
    # CSP is intentionally conservative; adjust when adding external scripts/fonts.
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'",
    )
    return response


@app.get("/api/health", response_model=AppMetadata)
def healthcheck() -> AppMetadata:
    vertex_enabled = bool((os.getenv("DATAREADY_VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip())
    gemini_enabled = bool(os.getenv("GEMINI_API_KEY"))
    benchmark_enabled = bool(os.getenv("ANTHROPIC_API_KEY")) and os.getenv(
        "DATAREADY_ENABLE_ANTHROPIC_BENCHMARK",
        "false",
    ).lower() in {"1", "true", "yes", "on"}

    mode = "fallback_only"
    if vertex_enabled:
        mode = "gemini_configured"
    elif gemini_enabled:
        mode = "gemini_configured"
    elif benchmark_enabled:
        mode = "benchmark_configured"

    return AppMetadata(
        name="DataReady API",
        version="0.1.0",
        status="ok",
        mode=mode,
    )


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    def serve_index() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            return FileResponse(FRONTEND_DIST / "index.html")
        candidate = FRONTEND_DIST / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
