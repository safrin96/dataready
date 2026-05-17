from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urlparse

import urllib.request


ROOT = Path(__file__).resolve().parents[2]
DOC_PATH = ROOT / "docs" / "evals-and-datasets.md"
OUT_DIR = ROOT / "datasets" / "external"


@dataclass
class DownloadItem:
    url: str
    filename: str
    kind: str  # csv|zip|pdf|parquet|unknown
    source: str
    max_bytes: int


@dataclass
class DownloadResult:
    url: str
    filename: str
    status: str  # downloaded|skipped|failed
    reason: str = ""
    bytes: int = 0
    sha256_12: str = ""


def _now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _guess_kind(filename: str) -> str:
    lower = filename.lower()
    for ext, kind in [
        (".csv", "csv"),
        (".tsv", "csv"),
        (".zip", "zip"),
        (".pdf", "pdf"),
        (".parquet", "parquet"),
    ]:
        if lower.endswith(ext):
            return kind
    return "unknown"


def _safe_filename(url: str, fallback: str) -> str:
    path = urlparse(url).path
    name = Path(path).name
    if name and "." in name:
        return name
    # Fallback: deterministic hashed name.
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:10]
    return f"{fallback}-{digest}"


def _extract_urls(markdown: str) -> list[str]:
    # Extract Markdown link targets and bare URLs.
    urls = set()
    for match in re.findall(r"\((https?://[^)\s]+)\)", markdown):
        urls.add(match)
    for match in re.findall(r"(https?://[^\s)\]]+)", markdown):
        urls.add(match)
    # Remove common trailing punctuation
    cleaned = []
    for url in sorted(urls):
        candidate = url.rstrip(".,;")
        # Ignore placeholders like https://[demo-domain]/...
        if "[" in candidate or "]" in candidate:
            continue
        cleaned.append(candidate)
    return cleaned


def _is_direct_file(url: str) -> bool:
    # Direct file endpoints we can safely attempt with urllib.
    return bool(re.search(r"\.(csv|tsv|zip|pdf|parquet)(\?|$)", url, re.IGNORECASE))


def _should_skip(url: str) -> Optional[str]:
    try:
        netloc = urlparse(url).netloc.lower()
    except ValueError:
        return "Malformed URL in source doc."
    if "kaggle.com" in netloc:
        return "Requires Kaggle auth/CLI."
    if "openml.org" in netloc:
        return "Not a direct file; use OpenML API client."
    if "fred.stlouisfed.org" in netloc:
        return "Requires API key and API calls; not a single file download."
    # Portals / landing pages (not direct file)
    if not _is_direct_file(url):
        return "Not a direct downloadable file URL."
    return None


def _download_stream(url: str, dest: Path, max_bytes: int) -> DownloadResult:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DataReadyDownloader/1.0",
            "Accept": "*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            total = 0
            hasher = hashlib.sha256()
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("wb") as f:
                while True:
                    chunk = resp.read(1024 * 256)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > max_bytes:
                        try:
                            f.close()
                            dest.unlink(missing_ok=True)
                        except Exception:
                            pass
                        return DownloadResult(
                            url=url,
                            filename=dest.name,
                            status="skipped",
                            reason=f"File exceeds max_bytes cap ({max_bytes}).",
                        )
                    hasher.update(chunk)
                    f.write(chunk)
        return DownloadResult(
            url=url,
            filename=dest.name,
            status="downloaded",
            bytes=total,
            sha256_12=hasher.hexdigest()[:12],
        )
    except Exception as exc:  # noqa: BLE001
        return DownloadResult(url=url, filename=dest.name, status="failed", reason=str(exc))


def build_download_plan(urls: Iterable[str], *, max_bytes: int) -> list[DownloadItem]:
    """
    Build a conservative plan:
    - only direct file URLs
    - cap download size
    - also add a few known direct dataset URLs that are commonly used but may appear as landing pages in docs
    """
    plan: list[DownloadItem] = []

    # 1) From the markdown.
    for url in urls:
        skip_reason = _should_skip(url)
        if skip_reason:
            continue
        filename = _safe_filename(url, "external")
        kind = _guess_kind(filename)
        source = urlparse(url).netloc
        plan.append(DownloadItem(url=url, filename=filename, kind=kind, source=source, max_bytes=max_bytes))

    # 2) Add a couple of canonical direct URLs (useful for testing) even if the doc links a landing page.
    extras = [
        # UCI Adult dataset (zip).
        "https://archive.ics.uci.edu/static/public/2/adult.zip",
        # NYC TLC Yellow Taxi dictionary PDF (direct).
        "https://www.nyc.gov/assets/tlc/downloads/pdf/data_dictionary_trip_records_yellow.pdf",
        # NYC TLC Taxi zone lookup (small CSV; great for joins + naming checks).
        "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv",
        # NYC 311 sample via Socrata (limited rows to keep size predictable).
        "https://data.cityofnewyork.us/resource/erm2-nwe9.csv?$limit=50000",
        # Chicago crimes sample via Socrata (limited rows).
        "https://data.cityofchicago.org/resource/ijzp-q8t2.csv?$limit=50000",
    ]
    for url in extras:
        skip_reason = _should_skip(url)
        if skip_reason:
            continue
        filename = _safe_filename(url, "external")
        kind = _guess_kind(filename)
        source = urlparse(url).netloc
        if any(item.url == url for item in plan):
            continue
        plan.append(DownloadItem(url=url, filename=filename, kind=kind, source=source, max_bytes=max_bytes))

    # De-dup by filename (keep first).
    seen: set[str] = set()
    deduped: list[DownloadItem] = []
    for item in plan:
        if item.filename in seen:
            continue
        seen.add(item.filename)
        deduped.append(item)
    return deduped


def main() -> int:
    if not DOC_PATH.exists():
        print(f"Missing {DOC_PATH}")
        return 2

    max_mb = int(os.getenv("DATAREADY_DATASET_MAX_MB", "200"))
    max_bytes = max(1, max_mb) * 1024 * 1024
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    markdown = DOC_PATH.read_text(encoding="utf-8", errors="replace")
    urls = _extract_urls(markdown)
    plan = build_download_plan(urls, max_bytes=max_bytes)

    results: list[DownloadResult] = []
    skipped: list[DownloadResult] = []

    for item in plan:
        dest = OUT_DIR / item.filename
        if dest.exists() and dest.stat().st_size > 0:
            digest = hashlib.sha256(dest.read_bytes()).hexdigest()[:12]
            results.append(
                DownloadResult(
                    url=item.url,
                    filename=item.filename,
                    status="downloaded",
                    bytes=dest.stat().st_size,
                    sha256_12=digest,
                    reason="already_present",
                )
            )
            continue

        skip_reason = _should_skip(item.url)
        if skip_reason:
            skipped.append(DownloadResult(url=item.url, filename=item.filename, status="skipped", reason=skip_reason))
            continue

        res = _download_stream(item.url, dest, item.max_bytes)
        if res.status == "skipped":
            skipped.append(res)
        else:
            results.append(res)

    manifest = {
        "generated_at": _now_id(),
        "max_mb": max_mb,
        "downloaded": [asdict(r) for r in results],
        "skipped": [asdict(r) for r in skipped],
    }
    manifest_path = OUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    summary = {
        "downloaded": sum(1 for r in results if r.status == "downloaded"),
        "failed": sum(1 for r in results if r.status == "failed"),
        "skipped": len(skipped),
        "manifest": str(manifest_path),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
